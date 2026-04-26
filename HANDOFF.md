# Terrer Handoff Notes

## Completed
- finished the approved live-candidate first pass in the intended scope:
  - `src/lib/candidates.ts`
  - `src/pages/TopMatches.tsx`
  - `src/lib/dashboardData.ts`
  - `src/pages/Pipeline.tsx`
- `src/lib/candidates.ts` now provides the live candidate helper layer for:
  - full candidate fetch for UI
  - fetch by candidate ids
  - candidate map creation
  - unresolved-candidate fallback objects
- `TopMatches` now uses live candidate helper data instead of mock store candidates while preserving:
  - selected-job handoff
  - shortlist
  - send to BD
  - Terrer AI review
  - admin bulk reset/delete
- `dashboardData` now hydrates submission-backed dashboard items from live candidate lookups and falls back safely when a candidate row is missing from `vw_candidate_search_clean`
- `Pipeline` now hydrates submission cards from live candidate lookups keyed by `submission.candidate_id` and preserves:
  - shortlisted to BD
  - post-submission stage movement
  - admin reset/delete

## Remaining
- environment validation is still pending in this worktree because `node_modules` is missing
- no out-of-scope fixes were applied to `Dashboard.tsx`
- no migration or schema files were changed as part of this iteration

## Owner Testing Notes
- Top Matches
  - from Jobs, open Top Matches for a valid job
  - confirm the selected job header appears correctly
  - confirm candidates load and rank without relying on mock candidate data
  - confirm shortlist, send to BD, AI review, and admin bulk reset/delete still behave as before
- Dashboard-backed workflow
  - confirm action queue, opportunity cards, and BD queue still render
  - confirm items with missing candidate rows still appear with safe fallback labels like `Unknown Candidate`
- Pipeline
  - confirm submission cards render across stages using live candidate data
  - confirm unresolved candidates still show the submission card instead of disappearing
  - confirm shortlisted note + Send to BD still works
  - confirm Interview / Offer / Hired / Rejected transitions still work
  - confirm admin reset/delete still behaves the same
- Validation note
  - this worktree could not run `npm run typecheck` because local toolchain binaries are unavailable here

## Latest Job Intake Save Fix
- traced the current save path and confirmed there was no fake/local job persistence in source
- pre-fix path already targeted Supabase:
  - `JobIntake.handleConfirmSave(...)`
  - `createJob(...)`
  - `supabase.from('jobs').insert(...)`
- real blocker was a live schema mismatch:
  - `createJob()` selected `jobs.created_at`
  - the live `jobs` table does not have `created_at`
  - this caused the save call to fail
- fix applied:
  - `src/lib/jobs.ts`
    - now inserts the canonical operational row into `public.jobs`
    - uses returned `jobs.id` as the canonical downstream job id
    - now also inserts the raw intake row into `public.jobs_intake` with `job_id = jobs.id`
    - includes temporary console logging for request, success, and returned ids
  - `src/pages/JobIntake.tsx`
    - now passes raw input + parsed fields + current role into `createJob(...)`
    - logs the returned canonical ids on success
- live verification succeeded:
  - `jobs.id = d5135ce1-9bf1-405d-80a0-0825925fe756`
  - `jobs_intake.job_id = d5135ce1-9bf1-405d-80a0-0825925fe756`
  - both rows were readable back from Supabase immediately after insert

## Owner Testing For This Fix
- in Job Intake:
  - paste a job description
  - click `Extract Details`
  - optionally use `Edit Details`
  - click `Confirm & Save`
- expected result:
  - no save error
  - browser console shows:
    - `[jobs.createJob] start`
    - `[jobs.createJob] jobs insert succeeded`
    - `[jobs.createJob] jobs_intake insert succeeded`
    - `[JobIntake] save success`
  - app navigates back to Jobs
  - the new job appears in `public.jobs`
  - a matching raw intake row appears in `public.jobs_intake`
  - both use the same canonical job id (`jobs.id === jobs_intake.job_id`)
- downstream compatibility to spot-check:
  - the newly created job opens from Jobs into Top Matches
  - recruiter shortlist / submit flow still uses that same job id normally

## Canonical Jobs Follow-up Result
- follow-up investigation confirmed the canonical operational target is `public.jobs`
- the current save flow writes:
  1. canonical row into `public.jobs`
  2. raw intake row into `public.jobs_intake`
- direct live backend checks confirmed canonical manual-intake rows are present in `public.jobs`, including:
  - `d5135ce1-9bf1-405d-80a0-0825925fe756` → `Codex Verification Job 2026-04-20T16:34:22.745Z`
  - `4e6b5bbc-1cfa-4e13-a65e-b5d76f672068` → `Medical Officer`
- conclusion:
  - the canonical write is not missing
  - it is not going to a different schema/project/table
  - the likely confusion is that `public.jobs` contains both scraped hiring-intelligence rows and manual-intake operational rows, with manual-intake rows distinguished by `source = 'manual_intake'`
- minimal code change for traceability:
  - `src/lib/jobs.ts` logs now explicitly name:
    - `public.jobs`
    - `public.jobs_intake`

## Active Jobs vs Hiring Intelligence Separation
- implemented as a minimal toggle inside `Jobs`, not a new route
- default view:
  - `Active Jobs`
  - filter: `source === 'manual_intake'`
- secondary view:
  - `Hiring Intelligence`
  - filter: `source !== 'manual_intake'`
- both views keep the existing card UI and `View Top Matches` behavior
- dashboard job summaries now use only manual-intake jobs for recruiter-facing active job counts and attention jobs
- no schema changes, no table split, and no changes to Top Matches / submissions / Pipeline
- live backend count check:
  - manual-intake active jobs: 7
  - scraped hiring-intelligence jobs: 1808

## Owner Testing For Job Separation
- open Jobs:
  - confirm `Active Jobs` is selected by default
  - confirm only manual-intake recruiter jobs appear there
  - confirm new Job Intake jobs appear in this default view
- click `Hiring Intelligence`:
  - confirm scraped / Workday-style jobs appear separately
  - confirm manual-intake jobs are not mixed into that view
- from either view:
  - click `View Top Matches`
  - confirm the selected job still opens normally by `jobs.id`
- open Dashboard:
  - confirm Active Jobs / Jobs Needing Attention are now recruiter-job focused

## Recruiter Loop Validation After Job Separation
- the `source` split is preserved as transitional UI-only logic
- no deeper job-model changes were made
- no changes were made to submission ids, job ids, or pipeline stage semantics
- one small Top Matches cleanup was applied:
  - hide the status pill when the live `jobs` row has no `status` value
  - this prevents an empty pill on selected-job headers without changing actions
- live validation succeeded through the critical write path:
  - active job:
    - `4e6b5bbc-1cfa-4e13-a65e-b5d76f672068`
    - `Medical Officer`
  - candidate:
    - `005f0ec2-31d3-436c-8307-a57a2e5c955f`
  - submission:
    - `e88b872c-c472-4f8b-b97e-a708de90aacc`
    - moved from `shortlisted` to `submitted_to_client`
    - read back successfully from Supabase
- owner should spot-check:
  - open Jobs and confirm `Medical Officer` appears under Active Jobs
  - open Top Matches for that job
  - confirm the selected-job header displays cleanly
  - confirm the submitted candidate appears in Pipeline under Submitted

## Active Jobs Recommended Next Step
- Active Jobs cards now show `Recommended` instead of generic `Next Action`
- recommendation is derived from existing card data only:
  - `Follow up overdue`
  - `Follow up today`
  - `Review matches`
  - `Shortlist candidates`
  - `Progress pipeline`
- urgency pill remains visible
- if a next-action date exists, it remains visible as secondary text
- Hiring Intelligence cards are unchanged and still use `Next Action`
- no workflow write logic was changed

## Owner Testing For Recommended Next Step
- open Jobs
- stay on `Active Jobs`
- confirm cards show `Recommended: ...`
- confirm overdue / due-today cards prioritize follow-up recommendations
- confirm jobs with no candidates say `Review matches`
- confirm jobs with candidates but no shortlisted candidates say `Shortlist candidates`
- confirm jobs with both candidates and shortlisted candidates say `Progress pipeline`
- switch to `Hiring Intelligence`
- confirm that view still uses the previous `Next Action` wording

## Pipeline Recommended Action
- Pipeline cards now show a `Recommended` line per submission
- recommendations are derived from current stage and next-action urgency only
- existing dates, stages, card content, buttons, and admin controls remain unchanged
- no persistence or workflow write logic was changed

## Owner Testing For Pipeline Recommendations
- open Pipeline
- confirm every visible card shows `Recommended: ...`
- confirm overdue / due-today cards prioritize follow-up language
- confirm shortlisted cards show `Submit to client`
- confirm submitted cards show `Chase client feedback`
- confirm interview cards show `Prepare candidate / confirm schedule`
- confirm offer cards show `Close offer`
- confirm existing stage-move buttons still work as before

## Pipeline Recommendation Language Review
- reviewed recommendation wording against current role boundaries
- no wording correction was needed
- current validated behavior:
  - shortlisted cards in Pipeline submit directly through `submitToClientWithOutput(...)`
  - the store writes `submitted_to_client`
  - therefore `shortlisted -> Submit to client` matches the current app behavior
- `ready_for_bd_review -> BD review` remains acceptable for existing BD Review records
- do not relabel shortlisted cards to `Send to BD review` unless the product flow changes back to a BD-review gate

## Terrer AI Review Decision Layer
- Terrer AI Review now includes a top-level `Decision`
- possible decisions:
  - `Proceed`
  - `Review`
  - `Reject`
- decision is based on current available signals:
  - role alignment
  - skills relevance
  - experience/profile match from the existing candidate score signal
- recommendation labels now align to decision:
  - `Proceed` -> `Strong Fit`
  - `Review` -> `Potential Fit`
  - `Reject` -> `Low Fit`
- summary tone is now more decisive and action-oriented
- existing saved rows remain compatible:
  - historical `Weak Fit` recommendations are treated as reject/low-fit when loaded
  - dashboard and BD queue badges support both `Low Fit` and old `Weak Fit`
- no schema changes were made

## Owner Testing For Terrer AI Review
- open Top Matches for an active job
- run or re-run Terrer AI Review for a candidate
- confirm the collapsed review shows:
  - `Decision: Proceed`, `Decision: Review`, or `Decision: Reject`
  - aligned recommendation badge
- expand the review
- confirm the summary gives a decisive next-step assessment rather than vague language
- confirm older saved reviews still render without crashing

## Terrer AI Review Calibration
- calibrated the decision boundary after QA
- only threshold changed:
  - `experienceMatch` now uses `score >= 70`
  - previous value was `score >= 80`
- 3-case QA result after calibration:
  - poor fit stayed `Reject` / `Low Fit`
  - borderline fit moved to `Review` / `Potential Fit`
  - strong fit stayed `Proceed` / `Strong Fit`
- no schema or UI changes were made for this calibration

## Terrer AI Review Workflow Validation
- validated actual workflow usage with one active job and multiple live candidates
- active job:
  - `Senior Backend Engineer`
  - `420abd7b-653e-46d1-bdc9-3cf8a5394655`
- results:
  - several Software / Data Engineer candidates returned `Review` / `Potential Fit`
  - weaker Web Developer fit returned `Reject` / `Low Fit`
- operational read:
  - the decision layer is useful in Top Matches because it appears before Shortlist / Submit actions
  - `Review` feels like a good recruiter prompt for partial matches
  - `Reject` is clear enough to discourage low-fit submissions without hiding actions
- recommendation:
  - keep decisions advisory only for now
  - do not disable Shortlist or Submit based on decision yet
- reason:
  - live candidate scores appear to be on a mixed/low scale
  - some job location text is still messy from intake parsing
  - hard-gating actions would risk blocking valid recruiter judgment
- no code changes were made for this validation pass

## Terrer AI Review Medical Officer Gate
- added a pre-reasoning constraint gate in `src/lib/terrerAI.ts`
- first regulated-role case:
  - Medical Officer (Malaysia)
- required evidence before normal review reasoning can run:
  - medical or clinical background
  - housemanship or house officer experience
  - MMC registration or equivalent signal
  - APC or active licensing indicator
- failed gate behavior:
  - `Decision: Reject`
  - `Recommendation: Low Fit`
  - summary clearly lists missing regulatory requirements
  - strengths are empty, so irrelevant signals such as programming skills are not presented as positives
- passing gate behavior:
  - existing Terrer AI Review logic continues normally
  - medical-role fallback skill reasoning uses medical-relevant skills only
- no UI or schema changes were made

## Owner Testing For Medical Officer Gate
- open Top Matches for a Medical Officer job
- run Terrer AI Review on a clearly non-medical candidate
- expected:
  - `Decision: Reject`
  - `Recommendation: Low Fit`
  - summary mentions missing medical/regulatory requirements such as MMC/APC
  - no unrelated software/programming strengths appear
- run Terrer AI Review on a candidate whose profile includes MBBS, housemanship, MMC, and APC signals
- expected:
  - normal Terrer AI Review reasoning runs instead of the hard rejection
- spot-check a non-medical role such as Senior Backend Engineer
- expected:
  - existing decision behavior remains unchanged

## Top Matches Job-Level Supply Assessment
- Top Matches now shows a compact `Supply Assessment` panel above the candidate list
- the panel aggregates Terrer AI Review decisions for the selected job:
  - Proceed count
  - Review count
  - Reject count
- status rules:
  - no Proceed or Review candidates -> `No viable candidates`
  - at least one Proceed candidate -> `Strong supply`
  - only Review candidates and no Proceed candidates -> `Limited supply`
- this is advisory only:
  - no schema changes
  - no candidate-level review changes
  - no action buttons were disabled or changed

## Owner Testing For Supply Assessment
- open Top Matches for a selected job
- run Terrer AI Review on several candidates
- expected:
  - panel counts update as reviews are generated
  - `No viable candidates` appears when all reviewed candidates are Reject or no reviews exist yet
  - `Limited supply` appears when there are Review candidates but no Proceed candidates
  - `Strong supply` appears when at least one candidate has Decision `Proceed`
- confirm shortlist and submit buttons still behave exactly as before

## Terrer AI Review Weak-Alignment Credibility Fix
- weak role alignment now suppresses all strengths in candidate-level Terrer AI Review
- fallback skill relevance now requires role alignment, so unrelated candidates with many skills are not treated as viable just because they have a broad profile
- examples verified:
  - Legal Counsel vs Senior Backend Engineer -> `Reject` / `Low Fit`, no strengths
  - Medical Officer vs Senior Backend Engineer -> `Reject` / `Low Fit`, no strengths
  - Senior Backend Engineer vs Senior Backend Engineer -> `Proceed` / `Strong Fit`, strengths still appear
- no UI, schema, or persistence changes were made

## Owner Testing For Weak-Alignment Reviews
- open Top Matches for a role that is clearly unrelated to a candidate profile
- run Terrer AI Review
- expected:
  - `Decision: Reject`
  - `Recommendation: Low Fit`
  - strengths section has no unrelated positives
  - concerns explain the role mismatch
- run Terrer AI Review for a clearly relevant candidate
- expected:
  - normal strengths still appear

## Top Matches No-Viable Supply State
- Top Matches now hides candidate cards/actions when the selected job has a completed no-viable supply assessment
- hidden state applies when:
  - supply status is `No viable candidates`
  - at least one Terrer AI Review exists for the selected job
- selected job context remains visible
- the supply assessment block remains prominent and includes:
  - `Try sourcing new candidates or refine job requirements`
- fresh jobs with zero reviews still show cards so a recruiter can run Terrer AI Review
- card-level cosmetic strengths were also tightened:
  - location / score / skill positives only show when the candidate role matches the job role
  - weak-alignment cards show no specific strengths if they remain visible

## Owner Testing For No-Viable Supply State
- open Top Matches for a Medical Officer job with only software candidates reviewed
- expected:
  - `Supply Assessment: No viable candidates`
  - no candidate names, cards, shortlist buttons, or submit buttons below the supply block
- open Top Matches for a legal role with only software candidates reviewed
- expected:
  - same no-viable state and no candidate cards/actions
- open Top Matches for a relevant tech role with Proceed or Review candidates
- expected:
  - candidate list/cards/actions appear normally

## Strict No-Viable Rendering Fix
- Top Matches now uses a strict rendering guard:
  - if supply status is `No viable candidates`, no candidate list is rendered at all
- this applies even when there are zero completed reviews
- only the selected job header, supply assessment block, and CTA remain visible
- owner verification:
  - Medical Officer no-viable case should show no candidate names/cards/actions
  - Legal no-viable case should show no candidate names/cards/actions
  - tech roles with `Strong supply` or `Limited supply` should still show candidates normally

## Top Matches No-Viable CTA
- the `No viable candidates` supply state now includes one primary button:
  - `Source Candidates`
- current behavior:
  - navigates to the Candidates page using existing app navigation
  - passes selected job title and available key skills as sourcing context
  - does not add backend sourcing logic yet
- owner verification:
  - open a no-viable Top Matches state
  - confirm candidate cards remain hidden
  - confirm there is no duplicate `Find Candidates` action
  - click `Source Candidates`
  - confirm the app navigates to Candidates with the sourcing banner

## Top Matches Candidate Sourcing Handoff
- the no-viable CTA is now `Source Candidates`
- clicking it passes lightweight selected-job context through existing app navigation
- Candidates page now shows:
  - `Sourcing candidates for: [Job Title]`
  - key skills when structured requirements are available
- no scraping, backend automation, schema changes, or route changes were added
- owner verification:
  - open a no-viable Top Matches state
  - click `Source Candidates`
  - confirm Candidates page opens
  - confirm the sourcing banner shows the selected job title
  - if the job has loaded requirements, confirm key skills are listed

## Skill Match 400 Error Fix
- console 400s after `Source Candidates` were traced to stale skill-match Supabase selects
- Candidates page was not the source of the errors
- failing old queries:
  - `job_requirements.select('job_id, requirement, required')`
  - `candidate_skills.select('candidate_id, skill, proficiency')`
- live schema uses:
  - `job_requirements.skill_name`
  - `job_requirements.requirement_type`
  - `candidate_skills.proficiency_score`
  - joined `skills.skill_name`
- `src/lib/skillMatch.ts` now maps the live schema into the existing app shapes used by Top Matches
- no schema/backend/flow changes were made
- owner verification:
  - open Top Matches for a job
  - navigate through `Source Candidates`
  - confirm console no longer shows `[skillMatch] fetchJobRequirements error`
  - confirm console no longer shows `[skillMatch] fetchCandidateSkills error`
  - confirm Candidates sourcing banner still appears

## Role Title Normalization Layer
- added `src/lib/roleNormalization.ts`
- purpose:
  - clean noisy scraped job titles before the Hiring Intelligence dashboard aggregates demand
- no schema, backend, AI, chart, or page changes were made
- normalized output fields:
  - `raw_job_title`
  - `normalized_job_title`
  - `role_family`
  - `seniority`
- main helper for the next Hiring Intelligence pass:
  - `normalizeJobTitles(scrapedJobs)`
- initial role mapping includes:
  - Software Engineer
  - Frontend Engineer
  - Data Analyst
  - Data Scientist
  - Product Manager
  - Technical Program Manager
  - Project Engineer
  - Technical Support Analyst
  - Enterprise Architect
  - Legal Associate / Junior Lawyer
  - Relationship Manager
  - Personal Banker
  - Customer Service / Operations Executive
  - Business Banking Executive
  - Branch Manager
  - Compliance / Risk Analyst
  - Finance / Accounting Analyst
  - Supply Chain / Logistics Analyst
  - Sales / Commercial Manager
- recommended Hiring Intelligence consumption:
  - query non-manual jobs
  - normalize with `normalizeJobTitles(...)`
  - aggregate by `normalized_job_title`
  - use `role_family` for broader category summaries
  - use `seniority` for drill-down and seniority mix
  - keep `raw_job_title` visible in examples so the owner can audit mapping quality

## Hiring Intelligence Summary Layer
- Hiring Intelligence now acts as a BD-facing market-intel summary instead of leading with a long raw scraped-jobs list
- implementation is UI-layer only in `src/pages/Jobs.tsx`
- no schema, backend, AI, route, Top Matches, submissions, or Pipeline changes were made
- non-manual jobs are normalized with `normalizeJobTitles(...)` before aggregation
- summary sections added:
  - `Top Hiring Companies`
  - `Top Roles in Demand`
  - `Role Families`
- clicking a summary item filters the raw scraped jobs drill-down below it
- raw scraped jobs remain available for audit/drill-down and now show normalized role, role family, and seniority badges
- Active Jobs remains the recruiter execution view and is unchanged in this pass

## Owner Testing For Hiring Intelligence
- open Jobs
- switch to `Hiring Intelligence`
- confirm the top of the tab shows the three summary sections before the raw job list
- click a company in `Top Hiring Companies`
- confirm the raw scraped jobs drill-down filters to that company and `Clear filter` resets it
- click a normalized role in `Top Roles in Demand`
- confirm the drill-down filters by normalized role
- click a family in `Role Families`
- confirm the drill-down filters by role family
- confirm raw job cards still show `View Top Matches`
- switch back to `Active Jobs`
- confirm Active Jobs still shows recruiter-operational jobs and the existing `Recommended` next-step language

## Hiring Intelligence Priority Targets
- added a lightweight `Priority Targets` section near the top of Hiring Intelligence
- purpose:
  - help BD quickly identify hiring companies with demand that overlaps Terrer's current tech/digital-heavy candidate supply
- implementation is UI-layer only in `src/pages/Jobs.tsx`
- no schema, backend, AI, route, Top Matches, submissions, or Pipeline changes were made
- priority is derived from:
  - active scraped job count per company
  - normalized role / role-family fit against Terrer's current strongest supply categories
- high-fit categories include:
  - Software Engineering / Backend
  - Frontend
  - Data
  - Product
  - Technical Program / Technology
- lower-fit categories such as Legal, Medical, Banking branch, and Operations-heavy roles receive less priority lift for this phase
- each target shows:
  - company name
  - active scraped job count
  - dominant normalized roles
  - dominant role families
  - `High`, `Medium`, or `Low` priority label
- clicking a priority target filters the raw scraped jobs drill-down by that company

## Owner Testing For Priority Targets
- open Jobs
- switch to `Hiring Intelligence`
- confirm `Priority Targets` appears above the existing summary cards
- confirm each target has a company, job count, dominant roles/families, and priority label
- click a priority target
- confirm the raw scraped jobs drill-down filters to that company
- click the same target again or `Clear filter`
- confirm the full drill-down list returns
- confirm `Top Hiring Companies`, `Top Roles in Demand`, `Role Families`, and raw job cards still work as before

## Candidates Sourcing Workspace
- Candidates now works better as a simple sourcing workspace
- implementation is local to `src/pages/Candidates.tsx`
- no schema, backend, route, shared store, Top Matches, or Pipeline changes were made
- Candidates still loads from the existing live candidate helper
- added role filter buttons:
  - `All`
  - `Software Engineer`
  - `Frontend`
  - `Data`
  - `Product`
- candidates sort by score descending by default
- if opened from Top Matches `Source Candidates`, the selected job title preselects the closest role filter when possible
- the sourcing banner remains visible with job title and key skills

## Owner Testing For Candidates Sourcing
- open Candidates directly
- confirm `All` is selected and candidates are sorted by score descending
- click each role filter and confirm the list narrows without page reload
- confirm the count reads as filtered candidates out of total loaded candidates
- open a no-viable Top Matches state and click `Source Candidates`
- confirm Candidates opens with the sourcing banner
- confirm the role filter preselects a matching bucket for software, frontend, data, or product-style jobs
- confirm if no matching role bucket exists, Candidates safely remains on `All`

## BD Dashboard
- added a separate BD-focused dashboard component:
  - `src/pages/BDDashboard.tsx`
- BD users now see this dashboard through the existing `Dashboard` navigation slot
- recruiter/admin dashboard behavior was not rewritten
- no schema, backend, Supabase query, Top Matches, Pipeline, or submission write logic changed
- current data is realistic placeholder/mock operating data, intentionally structured for later Supabase wiring
- dashboard sections:
  - Header with `Add New Lead`, `Log Conversation`, and `Create Job Intake`
  - KPI strip
  - Companies to Target Today
  - Active Opportunities
  - Deals at Risk
  - Candidates Ready to Send
  - Quick Hiring Insights
  - Quick Actions
- working navigation actions:
  - `Create Job Intake` opens Job Intake
  - `Open BD Queue` opens BD Queue
  - `Review Hiring Intelligence` opens Jobs
  - `Check Pipeline` opens Pipeline
- `Add New Lead` and `Log Conversation` are present as UI-only actions for this first pass

## Owner Testing For BD Dashboard
- switch role to `BD`
- click `Dashboard`
- confirm the page title is `BD Dashboard`
- confirm the page is BD/revenue focused rather than recruiter focused
- confirm the KPI strip and all requested sections are visible
- click `Create Job Intake` and confirm it navigates to Job Intake
- click `Open BD Queue` from Quick Actions and confirm it navigates to BD Queue
- click `Review Hiring Intelligence` and confirm it navigates to Jobs
- click `Check Pipeline` and confirm it navigates to Pipeline
- switch role to `Recruiter`
- confirm recruiter still sees the existing recruiter dashboard flow

## BD Relationships UI
- added a new BD relationship memory screen:
  - `src/pages/BDRelationships.tsx`
- wired through:
  - `src/App.tsx`
  - `src/components/Sidebar.tsx`
- sidebar visibility:
  - visible for BD
  - visible for Admin
  - hidden for Recruiter
- current data is realistic mock relationship/contact data only
- no Supabase schema, backend, modal system, recruiter workflow, Top Matches, Pipeline, or submission write logic changed
- page includes:
  - header actions: `Add New Contact`, `Log Interaction`, `Link Contact to Opportunity`
  - KPI strip
  - contacts / relationship list
  - selected-contact detail panel
  - owner field on selected contact
  - contact tags and notes
  - lightweight linked opportunities
  - interaction timeline
  - quick relationship actions
- intentional v1 constraints:
  - warmth is only `Hot`, `Warm`, or `Cold`
  - linked opportunities show only role, company, and stage
  - no scores, complex filters, charts, candidate widgets, CRM edit forms, or BD Playbook content

## Owner Testing For BD Relationships
- switch role to `BD`
- confirm `BD Relationships` appears in the sidebar
- open `BD Relationships`
- confirm the page title and relationship-memory subtitle appear
- confirm KPI strip shows Companies, Contacts, Active Relationships, and Follow-ups Due
- click different contacts in the list
- confirm the right-side detail panel updates
- confirm warmth labels are only `Hot`, `Warm`, or `Cold`
- confirm `Next Step` and `Follow-up Due` are easier to scan than `Last Interaction`
- confirm selected contact shows `Owner`
- confirm linked opportunities show only role, company, and stage
- switch role to `Recruiter`
- confirm `BD Relationships` is not visible in the sidebar

## Candidates Job-Aware Sourcing Action
- Candidates sourcing context now includes:
  - `jobId`
  - `role`
  - `skills`
- `TopMatches` passes the selected job id when opening Candidates from `Source Candidates`
- Candidates still preserves existing sourcing behavior:
  - role/skills banner
  - role prefiltering
  - score sorting
  - role filters
  - filtered count
- when Candidates has `sourcingContext.jobId`, candidate cards show:
  - `Shortlist for this Job`
- button behavior:
  - calls existing `StoreContext.shortlist(candidateId, jobId)`
  - shows `Adding...` while saving
  - after successful shortlist, the card becomes disabled with `Already Shortlisted`
  - if the candidate is already further along for that job, it shows `Already [Stage]`
- when Candidates is opened directly or without job context:
  - no job-aware button is shown
  - Candidates remains a passive sourcing/browsing workspace
- no backend, schema, new API, search, skill filter, or generic job picker was added

## Owner Testing For Candidates Job-Aware Sourcing
- open a no-viable Top Matches state
- click `Source Candidates`
- confirm Candidates opens with the sourcing banner
- confirm candidate cards show `Shortlist for this Job`
- click `Shortlist for this Job` on one candidate
- confirm the button briefly shows `Adding...`
- confirm the same card then shows `Already Shortlisted`
- return to Top Matches or Pipeline and confirm the candidate is now in the selected job flow
- open Candidates directly from the sidebar
- confirm candidate cards do not show the job-aware shortlist button

## Job Detail Sourcing Plan V1
- Sourcing Plan lives inside the existing job-scoped Top Matches page
- there is no separate Job Detail route in the current app architecture
- after opening a job from Jobs into Top Matches, the selected-job view now has two tabs:
  - `Top Matches`
  - `Sourcing Plan`
- Sourcing Plan V1 is mock/UI-only:
  - no schema changes
  - no backend changes
  - no persistence
  - no automation
  - no outreach generation
- blocks included:
  - Job Context Strip
  - Recommended Channels
  - Channel Tracker
  - Action Bar
- Channel Tracker rows:
  - Internal Database
  - LinkedIn Outreach
  - JobStreet
  - Hiredly
  - Referrals
- Channel Tracker status changes are local React state only and reset when the page reloads
- `Search Internal Candidates` opens Candidates using the existing sourcing context:
  - selected `jobId`
  - selected job title as role context
  - loaded required skills where available
- `View Top Matches` switches back to the Top Matches tab for the same selected job
- existing Top Matches candidate ranking, Terrer AI Review, shortlist, submit, and admin cleanup flows remain unchanged

## Owner Testing For Sourcing Plan
- open Jobs
- choose an active job and click `View Top Matches`
- confirm the selected job header still appears
- click the `Sourcing Plan` tab
- confirm the Job Context Strip shows job title, company, priority, and `Database First`
- confirm all five recommended channels appear with priority badges and one-line reasons
- change a Channel Tracker status and confirm the UI updates locally
- click `Search Internal Candidates`
- confirm Candidates opens with the sourcing banner and job-aware shortlist buttons
- return to the same job in Top Matches and click `Sourcing Plan`
- click `View Top Matches`
- confirm it switches back to the existing Top Matches candidate ranking view

## Sourcing Plan V1 Light Wiring
- Sourcing Plan remains frontend-only:
  - no schema changes
  - no backend changes
  - no persistence
  - no new APIs
- action wiring:
  - `Search Internal Candidates` opens Candidates with selected `jobId`, job title, and required skills
  - Candidates then shows the existing sourcing banner and job-aware `Shortlist for this Job` buttons
  - `View Top Matches` switches back to the same job's Top Matches tab
- Channel Tracker state currently lives in local React state inside `src/pages/TopMatches.tsx`
- tracker state is scoped by job id:
  - changing a channel status for one selected job does not affect another selected job in the same app session
  - values reset on page reload because there is no persistence yet
- `Added to Job` behavior:
  - Internal Database is derived from current submissions for the selected job
  - this means candidates shortlisted/submitted into the job update the Internal Database added count
  - other channels remain mock/manual values because the app does not yet store source channel per submission
- still mock/manual for later wiring:
  - leads
  - next action
  - non-internal added-to-job counts
  - persisted channel status
- later backend wiring should add a real job-scoped sourcing tracker table or equivalent once the product model is ready

## Top Matches 3-Tier Trust Logic
- added frontend-only helper:
  - `src/lib/roleTrustPolicy.ts`
- helper exports:
  - `RoleTrustPolicy`
  - `classifyRoleTrustPolicy(jobTitle)`
- policies:
  - `STRICT`
  - `SEMI_STRICT`
  - `FLEX`
- STRICT keyword coverage includes clear regulated / licensed signals across:
  - medical / healthcare / lab
  - legal
  - regulated finance / accounting / audit / tax / compliance
  - aviation
  - licensed engineering
  - safety / HSE / DOSH / OSHA
  - public enforcement
- SEMI_STRICT keyword coverage includes important-but-not-absolute roles such as:
  - compliance manager
  - risk
  - internal audit
  - QA / QC / quality assurance
  - regulatory affairs
  - finance manager
  - tax manager
  - safety manager
  - regulated-sector operations manager
  - clinical sales / medical device / pharma sales
- default is `FLEX` when no clear regulated or semi-strict signal is found
- per-tier behavior:
  - `STRICT` = no compromise
  - `SEMI_STRICT` = controlled near matches
  - `FLEX` = exploratory allowed
- no-viable behavior:
  - STRICT shows `No viable candidates found`, hides all candidate lists, and blocks exploratory suggestions
  - SEMI_STRICT shows `No strong matches found. Showing limited near matches for review.` and renders a clearly separated `Near matches for review` section
  - FLEX shows `No strong matches found. Showing exploratory profiles for sourcing.` and renders a clearly separated `Exploratory profiles for manual sourcing` section
- near/exploratory sections:
  - reuse existing ranked candidates
  - do not mix into the main candidate list
  - do not use the phrase `Top Matches`
  - are labeled `Not recommended`
  - are read-only and do not include shortlist or submit buttons
- existing viable candidate display, shortlist, submit, Terrer AI Review, and Sourcing Plan behavior remains unchanged

## Owner Testing For 3-Tier Trust Logic
- open Top Matches for a strict role such as Medical Officer, lawyer, accountant, pharmacist, pilot, safety officer, or structural engineer
- if there are no viable candidates, confirm candidate lists are hidden and no exploratory section appears
- open Top Matches for a semi-strict role such as Risk Manager, Internal Audit, QA, Regulatory Affairs, Finance Manager, or pharma sales
- if there are no viable candidates, confirm `Near matches for review` appears as a separate read-only section
- open Top Matches for a flexible role such as Software Engineer, Product Manager, Designer, or Marketing role
- if there are no viable candidates, confirm `Exploratory profiles for manual sourcing` appears as a separate read-only section
- confirm viable jobs with Proceed / Review candidates still show the normal candidate cards and actions

## Near / Exploratory Candidate Reasoning
- near/exploratory candidate explanations are implemented locally in `src/pages/TopMatches.tsx`
- helper behavior:
  - compares the selected job title with candidate role / skill signals using coarse rule-based categories
  - uses existing ranked-candidate fields such as `roleMatch`, `matchedSkills`, `missingSkills`, and `locationMatch`
  - returns up to three short `Why shown` lines per near/exploratory card
- shown only in:
  - SEMI_STRICT `Near matches for review`
  - FLEX `Exploratory profiles for manual sourcing`
- STRICT behavior is unchanged:
  - STRICT roles still do not show exploratory candidates when no viable candidates exist
- this is not a new scoring engine:
  - it does not change Terrer AI Review decisions
  - it does not change supply assessment
  - it does not change candidate ranking thresholds
  - it does not introduce Gemini or another AI provider
- current limitations:
  - reasoning quality depends on available candidate role, skills, structured skills, job title, and job requirements
  - explanations are intentionally conservative and should not be treated as definitive evidence

## Owner Testing For Near / Exploratory Reasoning
- open a SEMI_STRICT job with no viable candidates and confirm each near-match card has a `Why shown` block
- open a FLEX job with no viable candidates and confirm each exploratory card has a `Why shown` block
- confirm strict jobs such as Medical Officer or legal roles still hide candidate cards entirely when no viable candidates exist
- confirm the normal Top Matches list for viable roles remains unchanged and still shows actions

## Universal Candidate Intake V1
- `Candidates` now has a lightweight `+ Add Candidate` modal rather than a new page
- modal fields:
  - required: `Name`, `Role / Title`, `Source`, `Source URL`
  - optional: `Skills`, `Location`, `Notes`
- source detection rules:
  - URL containing `linkedin.com` -> `LinkedIn`
  - URL containing `github.com` -> `GitHub`
  - URL containing `jobstreet` -> `JobStreet`
  - URL containing `hiredly` -> `Hiredly`
  - URL containing `maukerja` or `ricebowl` -> `Maukerja / Ricebowl`
  - otherwise -> `Other`
- autofill limitations:
  - GitHub URL: uses the last path segment as a fallback Name only when the Name field is still empty
  - LinkedIn URL: uses the last slug segment with hyphens converted to spaces as a fallback Name only when the Name field is still empty
  - no external fetches, scraping, or provider/API calls are used
  - recruiters can still manually edit every field after detection/autofill
- real save path:
  - canonical candidate row is inserted into `candidates`
  - search-layer row is inserted into `candidate_scores`
  - source context is inserted into `source_profiles`
  - optional parsed skills are inserted into `candidate_skills`
- current job-aware behavior:
  - if `Candidates` is opened with `sourcingContext.jobId`, the modal shows an `Add and shortlist this candidate to the current sourcing job` checkbox
  - when checked, successful save is followed by the existing `shortlist(candidateId, jobId)` flow
  - if `Candidates` is opened without job context, this checkbox is hidden and the candidate is only added to the system
- sourcing context remains lightweight:
  - current banner/context still uses the existing `jobId`, role, and skills handoff
  - this task did not add scraping automation or a multi-job picker
- known limitations:
  - score is seeded as `0` for manual intake candidates
  - free-text skills are parsed by simple splitting only
  - matching quality for manual candidates depends on the provided role/skills text rather than external enrichment

## Candidate Intake V2
- the `Add Candidate` modal now has two clear entry modes at the top:
  - `Paste LinkedIn URL`
  - `Paste Resume Text`
- LinkedIn mode keeps the existing URL-assisted detection behavior
- Resume Text mode adds a large `Paste resume or profile text` textarea
- parser implementation:
  - located in `src/lib/candidateIntakeParser.ts`
  - fully rule-based and frontend-only
  - does not call external APIs or scrape any sites
- parser suggestions:
  - `Name`: first name-like capitalized line
  - `Role / Title`: first match from a lightweight keyword list such as Engineer, Associate, Manager, Analyst, etc.
  - `Skills`: fixed keyword detection for common tech and general professional terms
  - `Location`: fixed detection for common Malaysia locations such as Kuala Lumpur, Selangor, Johor Bahru, Penang, Cyberjaya, etc.
  - `Notes`: compact summary from the first few useful lines
- suggestion UX:
  - parsed fields are marked `Suggested (please confirm)`
  - suggestions do not overwrite manually edited fields
  - recruiters can always edit every field before saving
- current limitations:
  - parser is intentionally lightweight and may miss names or titles in messy text
  - no PDF/document parsing yet
  - no OCR
  - no deep skills normalization
  - no confidence scoring
- save path remains unchanged from V1:
  - canonical candidate row in `candidates`
  - search-layer row in `candidate_scores`
  - source context in `source_profiles`
  - optional `candidate_skills`

## Hybrid Candidate Intake Parser
- hybrid parsing now layers AI refinement on top of the existing rule-based candidate parser
- trigger conditions for AI refinement:
  - parsed name is empty
  - parsed role is weak/generic such as `Associate`, `Manager`, `Executive`, `Officer`, `Coordinator`, or `Specialist`
  - pasted resume/profile text is longer than 200 characters
- merge behavior:
  - rule parser always runs first
  - AI can upgrade weak or missing fields
  - rule output stays in place when AI returns empty values
  - user-edited form fields are never overwritten
- current AI request shape:
  - uses the existing `job-intake-parser` edge function with `mode: 'candidate'`
  - requests strict JSON:
    - `full_name`
    - `current_role`
    - `key_skills`
    - `location`
    - `summary`
  - prompt explicitly forbids hallucination and guessing
- rate-limit handling:
  - AI refinement only runs on resume textarea paste events
  - debounce is 650ms
  - ordinary typing does not trigger AI calls repeatedly
- UI labels:
  - rule-only suggestions show `Suggested (please confirm)`
  - AI-assisted suggestions show `Suggested (AI-assisted, please confirm)`
- important deployment note:
  - local source for `supabase/functions/job-intake-parser/index.ts` has been updated to support candidate refinement
  - `npm run typecheck` passes locally
  - function deploy attempts timed out in this environment, so live AI refinement may still require a successful redeploy before it is active against the hosted function
