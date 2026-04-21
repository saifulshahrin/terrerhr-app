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
