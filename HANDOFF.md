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
