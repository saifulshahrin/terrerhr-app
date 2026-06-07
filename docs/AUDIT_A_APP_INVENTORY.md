# Audit A: Terrer App Inventory

Audit date: 6 June 2026

## Scope and Routing Model

Terrer is a Vite/React single-page application. It does not use React Router. `src/App.tsx` maps stable browser paths to an internal `Page` state and synchronizes `jobId` and `candidateId` through query parameters.

The application has:

- 17 stable route paths representing 18 role/context page experiences.
- One strict-auth login/access gate that can replace any route.
- Role-specific navigation for recruiter, BD, and admin users.
- Context-only pages that are reachable through in-app actions but not always shown in the sidebar.
- Supabase as the primary persisted data source, with several rule-based, local-state, or presentation-only features still mixed in.

## Maturity Scale

| Level | Meaning |
|---|---|
| Production-oriented | Core workflow is persisted, role-aware, and operationally useful. Remaining gaps are mainly hardening, UX, or scale. |
| Functional MVP | Main workflow works against real data, but has notable workflow, validation, automation, or completeness gaps. |
| Hybrid / Beta | Real data and useful actions exist, but important parts remain mocked, local-only, read-only, or disconnected. |
| Prototype | Primarily static or illustrative UI; buttons and metrics do not reliably execute persisted workflows. |

## Page Inventory

### 1. Recruiter / Admin Dashboard

| Field | Inventory |
|---|---|
| Route | `/` for recruiter and admin roles |
| Purpose | Daily recruiter command center for active workload, pipeline health, urgent jobs, candidate opportunities, scheduled actions, and BD-review handoffs. |
| Main components | `Dashboard`, `PageHeader`, KPI cards, hiring funnel, pipeline overview, activity overview, immediate opportunities, jobs needing attention, action queue, BD queue preview. |
| Key actions | Search across operational data; open Job Intake; filter action and attention queues; approve, reject, or hold BD-review submissions; navigate to operational workflows. |
| Data sources | `fetchDashboardData`; shared submission store; role context; derived urgency, coverage, funnel, and opportunity rules. |
| Tables used | `jobs_intake`, `jobs`, `submissions`, `ai_assessments`; candidate data through `vw_candidate_search_clean`. |
| Current maturity | **Production-oriented MVP.** Strong live operational aggregation and persisted submission decisions. Some KPI definitions are inferred from available fields, including the temporary BD-handoff calculation. |

### 2. BD Dashboard

| Field | Inventory |
|---|---|
| Route | `/` for BD role |
| Purpose | Morning BD command center for target accounts, active opportunities, at-risk deals, and candidate-backed outreach. |
| Main components | `BDDashboard`, KPI cards, target-company table, deals-at-risk panel, active opportunities, candidate-ready signals, quick insights, quick actions. |
| Key actions | Navigate to Job Intake, BD Queue, Jobs, and Pipeline. Visible actions such as Add New Lead, Log Conversation, Start Outreach, Rescue Deal, and Log Update are not persisted. |
| Data sources | Static arrays declared in `BDDashboard.tsx`. |
| Tables used | None. |
| Current maturity | **Prototype.** Useful product-direction mock, but core metrics and account actions are illustrative rather than data-driven. |

### 3. Jobs

| Field | Inventory |
|---|---|
| Route | `/jobs` |
| Purpose | Recruiter work queue for all canonical jobs, prioritized for execution rather than simple listing. |
| Main components | `Jobs`, `JobWorkQueue`, metrics tiles, search/filter controls, operational-status controls. |
| Key actions | Search jobs; open Top Matches; start new Job Intake; change job operational status among not started, active, paused, and closed. |
| Data sources | `fetchAllJobs`; submission metrics; `jobQueue` urgency and recommended-next-step rules. |
| Tables used | `jobs`, `submissions`. |
| Current maturity | **Production-oriented MVP.** Canonical data and status changes are persisted. Queue prioritization is rule-based and depends on submission next-action hygiene. |

### 4. Active Jobs

| Field | Inventory |
|---|---|
| Route | `/active-jobs` |
| Purpose | Focused execution queue containing only jobs marked active for Terrer delivery. |
| Main components | `ActiveJobs`, `JobWorkQueue`, active-job metrics, search, urgency indicators. |
| Key actions | Search and prioritize active jobs; open Top Matches for a job. |
| Data sources | `fetchAllJobs`; submission metrics; `jobQueue` derived metrics and sorting. |
| Tables used | `jobs`, `submissions`. |
| Current maturity | **Functional MVP.** Live and decision-useful, but mostly a filtered Jobs view without deeper ownership, SLA, or assignment controls. |

### 5. Hiring Intelligence

| Field | Inventory |
|---|---|
| Route | `/hiring-intelligence` |
| Purpose | Market-demand analysis that deliberately separates scraped intelligence jobs from manually created operational jobs. |
| Main components | `HiringIntelligence`, priority targets, top hiring companies, roles in demand, role families, scraped-jobs drilldown. |
| Key actions | Search; filter by company, normalized role, or role family; clear filters; open Top Matches for a market job. |
| Data sources | `fetchAllJobs`; local role normalization and supply-fit priority rules. |
| Tables used | `jobs`. |
| Current maturity | **Functional MVP.** Strong distinction between intelligence and operations. Read-only prioritization remains rule-based and is not yet tied to persisted BD decisions or ownership. |

### 6. Candidates

| Field | Inventory |
|---|---|
| Route | `/candidates`; may receive in-memory sourcing context from Top Matches |
| Purpose | Search, review, source, create, and shortlist candidates from multiple channels. |
| Main components | `Candidates`, candidate cards/list, role and job filters, suggested candidates, Add Candidate modal, resume/source parsing controls, structured-profile indicators. |
| Key actions | Search/filter candidates; select a job context; view external LinkedIn/GitHub profile; create a candidate from URL, pasted resume, or file; upload resume; shortlist into a real job flow when sourcing context exists. |
| Data sources | `fetchCandidatesForUI`; candidate intake parser; optional AI refinement through the job-intake parser function; shared submission store; local mock job requirements and local `pipelineEntries`. |
| Tables used | `vw_candidate_search_clean`, `candidates`, `candidate_scores`, `source_profiles`, `candidate_skills`, `submissions`; Storage bucket `candidate-resumes`. |
| Current maturity | **Hybrid / Beta.** Candidate creation and contextual shortlisting are persisted. The general “Add to Job” experience uses mock job options and local-only pipeline entries, so it can appear operational without writing a real submission. |

### 7. Admin Resume Import

| Field | Inventory |
|---|---|
| Route | `/admin-resume-import`; rendered only for admin role |
| Purpose | Bulk resume upload, extraction, review, normalization, and canonical candidate creation. |
| Main components | `AdminResumeImport`, file queue, upload status, parser diagnostics, editable candidate preview, raw-versus-merged debug view. |
| Key actions | Select multiple PDF/DOC/DOCX files; upload; parse resume; review/edit structured fields; save canonical candidate; retry or cancel failed items. |
| Data sources | Supabase Storage; local resume parsing and role normalization; optional AI parsing support; authenticated user context. |
| Tables used | `candidates`; Storage bucket `candidate-resumes`. |
| Current maturity | **Functional MVP.** Substantial admin workflow with validation and diagnostics. It is operationally heavy, has manual review requirements, and candidate enrichment is concentrated into the `candidates` row rather than all related canonical tables. |

### 8. Pipeline

| Field | Inventory |
|---|---|
| Route | `/pipeline` |
| Purpose | Recruiter execution console across the full candidate-submission lifecycle. |
| Main components | `Pipeline`, metric tiles, stage queue/table, urgency filters, selected-submission detail panel, notes and stage controls. |
| Key actions | Search; jump to stages; select a submission; move stages; send to BD Review with notes; progress submitted candidates to interview/offer/hired or reject; admin reset and delete test records. |
| Data sources | Shared submission store; `fetchAllJobsBasic`; candidate lookup; urgency and recommended-action rules. |
| Tables used | `submissions`, `jobs`; candidate data through `vw_candidate_search_clean`. |
| Current maturity | **Production-oriented MVP.** Core stages and updates are persisted and role-aware. Missing drag-and-drop is not a blocker; stronger next-action editing, ownership, audit history, and placement economics are the larger gaps. |

### 9. Top Matches / Terrer AI Review

| Field | Inventory |
|---|---|
| Route | `/top-matches?jobId={jobId}`; also accessible without a job selection |
| Purpose | Rank candidates for a job, explain fit, manage sourcing channels, and prepare recruiter-to-BD or client submission output. |
| Main components | `TopMatches`, ranking table/cards, `TerrerAIReviewPanel`, sourcing strategy panel, channel tracker, `SubmissionModal`, admin bulk controls. |
| Key actions | Select job; search candidates; generate/review Terrer AI Review; persist assessment; shortlist; send to BD Review with generated output and recruiter notes; submit to client; open candidate profile; source more candidates; bulk reset/delete submissions for a job. |
| Data sources | Canonical job and candidate queries; deterministic Terrer review generator; persisted AI assessments; skill-overlap rules; role trust policy; candidate intent tracking; shared submission store. |
| Tables used | `jobs`, `vw_candidate_search_clean`, `submissions`, `ai_assessments`, `job_requirements`, `candidate_skills`, `skills` through relationship select, `candidate_intent_events`, `job_sources`. |
| Current maturity | **Hybrid / Beta.** End-to-end review and submission workflow is real, but the current “AI” review is a local deterministic generator recorded as `mock_terrer_ai_review`; parts of channel tracking are UI state rather than durable sourcing operations. |

### 10. Candidate Profile

| Field | Inventory |
|---|---|
| Route | `/candidate-profile?candidateId={candidateId}&jobId={jobId}` |
| Purpose | Contextual candidate detail view combining identity, structured profile, sources, resume, and job-specific submission stage. |
| Main components | `CandidateProfile`, identity header, contact details, role/location/skills, structured profile data, source links, resume link, job context and stage summary. |
| Key actions | Return to Top Matches; open source or resume links. |
| Data sources | Candidate lookup; direct structured candidate query; source-profile query; submission query; job lookup; resume Storage resolution. |
| Tables used | `candidates`, `submissions`, `source_profiles`, `jobs`, `vw_candidate_search_clean`; Storage bucket `candidate-resumes`. |
| Current maturity | **Functional MVP.** Useful consolidated read view. Editing, timeline/activity, consent controls, and direct pipeline actions are not yet part of the page. |

### 11. Job Intake

| Field | Inventory |
|---|---|
| Route | `/job-intake` |
| Purpose | Convert messy job text into a structured operational job and intake record. |
| Main components | `JobIntake`, raw-input panel, structured-output panel, parser confidence/fallback notice, editable extracted fields. |
| Key actions | Load example; paste job description; extract details; edit parsed fields; confirm and save job. |
| Data sources | `parseJobIntakeInput` through the `job-intake-parser` Edge Function with basic fallback; local role/work-mode normalization; authenticated role. |
| Tables used | `jobs`, `jobs_intake`, `job_sources`; Edge Function `job-intake-parser`. |
| Current maturity | **Production-oriented MVP.** The core messy-intake-to-canonical-job flow is persisted and defensive. It still lacks richer duplicate detection, employer/account linkage, assignment, and post-save workflow guidance. |

### 12. BD Review Queue

| Field | Inventory |
|---|---|
| Route | `/bd-queue` |
| Purpose | BD decision queue for recruiter-prepared submissions awaiting approval. |
| Main components | `BDQueue`, submission cards/detail, candidate/job context, AI summary, strengths/concerns, recruiter notes, copy control. |
| Key actions | Review submission package; copy output; approve to submitted-to-client; reject; place on hold. |
| Data sources | Ready-for-BD-review submissions; job and candidate lookups; AI-assessment summaries; shared submission store. |
| Tables used | `submissions`, `jobs`, `ai_assessments`; candidate data through `vw_candidate_search_clean`. |
| Current maturity | **Production-oriented MVP.** Core handoff and decision workflow is persisted. It needs client/contact targeting, communication logging, decision reasons, and stronger auditability. |

### 13. BD Relationships

| Field | Inventory |
|---|---|
| Route | `/bd-relationships` |
| Purpose | Opportunity-first account and stakeholder operating view, combining hiring demand, relationship coverage, source readiness, notes, and follow-up discipline. |
| Main components | `BDRelationships`, account ranking, companies-to-contact, action queue, account list, expanded account intelligence, contact editor, notes, duplicate detection, company source-intelligence editor. |
| Key actions | Search/select accounts; create company/contact; detect and resolve duplicate contacts; edit relationship state and contact details; set next action/date; log notes; update company hiring-source intelligence; navigate to tasks or job creation. |
| Data sources | Direct Supabase account/contact/note queries; `fetchAllJobs`; company-intelligence helpers; role normalization; authenticated user context; browser local storage for selected company. |
| Tables used | `companies`, `bd_contacts`, `bd_notes`, `jobs`. |
| Current maturity | **Production-oriented MVP.** Broad real CRUD and decision support. Main risks are the very large monolithic page, loosely controlled status strings, uneven source data, and lack of a dedicated opportunity/deal entity. |

### 14. Opportunities

| Field | Inventory |
|---|---|
| Route | `/opportunities` |
| Purpose | Rank companies for BD attention using visible hiring demand, stakeholder coverage, source readiness, relationship strength, and follow-up signals. |
| Main components | `Opportunities`, metrics, top companies Terrer can win, priority account queue, follow-up indicators, companies-to-contact table, hiring-signal rankings. |
| Key actions | Review ranked accounts; open the selected account in BD Relationships. |
| Data sources | Companies and contacts; all canonical jobs; company source-intelligence helpers; role normalization; local ranking formulas. |
| Tables used | `companies`, `bd_contacts`, `jobs`. |
| Current maturity | **Functional MVP.** Data-driven and useful for prioritization, but primarily read-only. Rankings are heuristic and there is no persisted opportunity, owner, value, stage, or conversion history. |

### 15. Tasks & Follow-ups

| Field | Inventory |
|---|---|
| Route | `/bd-tasks` |
| Purpose | Action console for overdue and upcoming BD contact tasks plus active submission/deal follow-ups. |
| Main components | `BDTasksFollowUps`, metrics, search, today actions, grouped follow-up queue, deals/submissions needing attention, accounts without next action. |
| Key actions | Mark contact contacted/responded; set next action and date; log notes on contacts or submissions; open BD Relationships; open eligible items in BD Queue. |
| Data sources | Direct contact, company, and submission queries; job lookup; candidate lookup; derived urgency and task rules. |
| Tables used | `bd_contacts`, `companies`, `submissions`, `jobs`; candidate data through `vw_candidate_search_clean`. |
| Current maturity | **Production-oriented MVP.** Real updates make this operationally useful. It still derives tasks from overloaded contact/submission fields rather than a canonical task/activity model. |

### 16. BD Photo Intake

| Field | Inventory |
|---|---|
| Route | `/bd-photo-intake`; stable route exists but it is not present in the current sidebar |
| Purpose | Convert screenshots, business cards, and legacy CRM photos into structured company and contact records. |
| Main components | `BDPhotoIntake`, upload queue, image preview, extraction status, duplicate warnings, editable extracted fields, save-mode controls. |
| Key actions | Upload image; run extraction; review/edit fields; check duplicates; merge empty fields or explicitly overwrite; save company/contact records. |
| Data sources | Supabase Storage; `bd-photo-vision-extract` Edge Function; direct company/contact queries; authenticated user context. |
| Tables used | `companies`, `bd_contacts`; Storage bucket `bd-photo-intake`; Edge Function `bd-photo-vision-extract`. |
| Current maturity | **Hybrid / Beta.** The storage, extraction, duplicate checking, and save path are wired. The page still contains Phase 1/mock messaging, extraction quality depends on external Vision configuration, and navigation discoverability is incomplete. |

### 17. Interested Candidates

| Field | Inventory |
|---|---|
| Route | `/interested-candidates`; stable route exists but it is not present in the current sidebar |
| Purpose | Triage candidate interest or representation requests originating from the web marketplace. |
| Main components | `InterestedCandidates`, summary counts, status filters, interest table/cards, joined candidate and job context. |
| Key actions | Filter and review inbound interest; change interest status. |
| Data sources | Direct web-interest query with follow-up candidate and job lookups. |
| Tables used | `web_job_interest`, `candidates`, `jobs`. |
| Current maturity | **Functional MVP.** The triage loop is persisted, but it is disconnected from the main recruiter navigation and does not automatically create or link a submission/pipeline workflow. |

### 18. Autonomous Recruiter

| Field | Inventory |
|---|---|
| Route | `/autonomous-recruiter` |
| Purpose | Read recruiter-friendly mission telemetry, sourcing strategy outcomes, memory signals, risks, and recommended candidates from autonomous sourcing runs. |
| Main components | `AutonomousRecruiterRuns`, mission hero, sourcing progress, activity feed, run history, recruiter memory, recommended candidates, intelligence insights. |
| Key actions | Select historical runs and inspect outputs. Run triggering and candidate actions are explicitly disabled/not wired. |
| Data sources | Direct read queries against autonomous recruiter run and memory records; structured JSON fields within run output. |
| Tables used | `autonomous_recruiter_runs`, `autonomous_recruiter_memory`. |
| Current maturity | **Hybrid / Beta.** Rich read-only operational telemetry exists, but the app cannot start a run or convert recommended candidates into canonical sourcing/pipeline actions. |

### 19. Login and Access Gate

| Field | Inventory |
|---|---|
| Route | Replaces any requested route when `VITE_AUTH_MODE=strict` and no valid session exists; not a dedicated path in `PAGE_TO_PATH`. |
| Purpose | Authenticate internal users and enforce active profile/role access. |
| Main components | `LoginScreen`, `AuthProvider`, loading state, blocked-account state. |
| Key actions | Sign in with email/password; sign out; display missing, inactive, or invalid-role profile errors; allow admin “view as” role switching after authentication. |
| Data sources | Supabase Auth session and password authentication; canonical application profile lookup. |
| Tables used | `profiles`; Supabase Auth. |
| Current maturity | **Production-oriented MVP.** Strict mode has clear access states and role enforcement. Demo mode remains enabled by default unless the environment explicitly sets strict mode. |

## Navigation and Coverage Findings

| Finding | Impact |
|---|---|
| `/bd-photo-intake` and `/interested-candidates` have stable routes but no current sidebar entry. | Working workflows are difficult to discover and may be omitted from routine operations. |
| `/candidate-profile` is contextual only and requires query parameters for a meaningful view. | Appropriate for drilldown, but direct navigation needs defensive empty-state handling. |
| Recruiter navigation displays Admin Resume Import, while `App.tsx` restricts its content to admin. | Recruiters can navigate to a dead-end restricted page. |
| BD Dashboard uses static data while BD Relationships, Opportunities, and Tasks use live data. | The first BD landing experience can contradict the actual account and follow-up state. |
| Candidate “Add to Job” can use local mock jobs and local-only pipeline entries. | Users may believe a candidate was added to a real job when no canonical submission was created. |
| Top Matches persists assessments but labels the current generator as `mock_terrer_ai_review`. | The workflow is usable, but AI maturity should not be overstated. |
| Autonomous Recruiter is read-only inside the app. | Sourcing telemetry cannot yet be converted into recruiter execution without an external process. |

## Overall App Maturity

Terrer is beyond a static prototype. Its strongest live operating flows are:

1. Job intake and canonical job management.
2. Job prioritization and active-job execution.
3. Candidate/submission pipeline management.
4. Top Matches to BD Review to client-stage progression.
5. BD relationship management and follow-up execution.

The largest maturity gaps are:

1. Replace the static BD Dashboard with live account, opportunity, and follow-up data.
2. Remove local/mock “Add to Job” behavior and always create canonical submissions.
3. Introduce a persisted opportunity/deal model instead of deriving opportunities only from companies, contacts, and jobs.
4. Connect autonomous recruiter outputs to candidate sourcing and pipeline actions.
5. Make hidden operational routes discoverable and correct role-navigation mismatches.
