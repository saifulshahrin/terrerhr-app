# Publication Batch V1 Hardening Plan

## Scope

This plan covers the current candidate-facing Publication Batch V1 experience only. It assumes the Candidate Web Conversion Baseline is already committed and that the current pilot is functioning well enough for limited hardening.

## What We Are Hardening

The candidate flow currently supports:

- browsing Publication Batch V1 opportunities
- saving opportunities
- checking fit
- confirming interest in a stronger downstream sense
- viewing saved activity in My Activity

The next step is to make those actions feel unambiguous, durable, and safe on mobile without changing the broader architecture.

## Current UX Risks

| Priority | Risk | Why it matters | Likely files |
| --- | --- | --- | --- |
| P0 | Internal UUIDs can leak through saved-activity links | Candidate-visible URLs should not expose implementation identifiers, even if the main browse and fit flows already use public IDs | `src/pages/MyActivity.tsx`, `src/lib/publicJobs.ts`, `src/data/publicationBatchV1.ts` |
| P1 | Save Opportunity feedback is not consistently explicit across all states | Candidates need to know when something is already saved, when a profile prompt is pending, and when the action has completed | `src/lib/candidateJobActions.ts`, `src/components/OpportunityWorkspace.tsx`, `src/components/JobCard.tsx`, `src/components/RoleDetailsModal.tsx`, `src/pages/FindJobs.tsx` |
| P1 | Check My Fit is still easy to interpret as a save or application action | The action means evaluation, not submission; the copy should keep that distinction sharp | `src/components/OpportunityWorkspace.tsx`, `src/components/JobCard.tsx`, `src/pages/FindJobs.tsx`, `src/pages/MyMatches.tsx`, `src/pages/MyActivity.tsx` |
| P1 | Confirm Interest overlaps visually and semantically with Save / Check My Fit | It is a stronger intent signal and should not feel like a duplicate button | `src/pages/MyMatches.tsx`, `src/pages/MyActivity.tsx`, `src/lib/candidateJobActions.ts` |
| P1 | My Activity mixes saved, fit-checked, and confirmed-interest states without enough visual separation | Candidates need a quick scan of what they have saved, what they reviewed, and what they escalated | `src/pages/MyActivity.tsx` |
| P2 | Mobile detail and action flows still need one more practical pass | The layout works, but the candidate experience should be checked on a real handset-sized viewport before wider exposure | `src/pages/FindJobs.tsx`, `src/components/OpportunityWorkspace.tsx`, `src/pages/MyActivity.tsx`, `src/pages/MyMatches.tsx` |
| P2 | Status and helper copy can still be tightened | This is clarity work, not product logic work | `src/pages/MyActivity.tsx`, `src/components/OpportunityWorkspace.tsx`, `src/pages/FindJobs.tsx`, `src/pages/MyMatches.tsx` |

## Action Clarity Audit

### 1. Save Opportunity

Current state:

- Works in the verified flow.
- Persists the opportunity.
- Can resume after profile creation.
- Shows an error state when the save path fails.

Hardening target:

- Keep the action as a bookmark/remember signal.
- Show a clear already-saved state after success.
- Make the post-profile continuation message unmistakable.
- Keep the error state candidate-safe and non-technical.

Recommended minimal changes:

- Standardize success copy across card, drawer, and detail views.
- Add or reuse an explicit already-saved label where relevant.
- Keep the save action visually distinct from fit and confirm-interest actions.

### 2. Check My Fit

Current state:

- Routes with the public `pub-batch-v1-*` job ID.
- Does not need to expose internal UUIDs.
- Is distinct from saving, but the copy can still be read as a job application by candidates.

Hardening target:

- Keep `Check My Fit` as the candidate asks Terrer to assess suitability.
- Keep URL routing public and stable.
- Be explicit that it may create or update activity state, but it is not an employer application.
- Show a fit-result or next-step message after the action completes.

Recommended minimal changes:

- Tighten helper text in the fit path.
- Keep the public job ID bridge unchanged for V1.
- Reuse existing candidate-fit concepts instead of inventing new logic.

### 3. Confirm Interest

Current state:

- Appears in My Matches and My Activity.
- Writes or updates a stronger intent state.
- Is separate from saving and from fit checking.

Hardening target:

- Treat it as stronger intent, not as a duplicate of Save or Check My Fit.
- Keep it downstream of fit where possible.
- Avoid making it feel like a third browse action if the candidate has not yet checked fit.

Recommended minimal changes:

- Preserve the persisted state for V1.
- Standardize the copy so it reads as "stronger intent" rather than generic interest.
- Avoid moving it into the primary browse card actions.

## My Activity Audit

Current state:

- Saved opportunities display.
- Refresh persistence works.
- Loading and error states are bounded.
- Confirm Interest is tracked in the activity view.
- The page includes candidate-safe fallback copy.

Hardening target:

- Make the three intent levels easy to scan:
  - saved
  - fit-checked
  - confirmed interest
- Keep the empty state simple and reassuring.
- Keep the error state candidate-safe and recoverable.
- Avoid showing internal implementation identifiers in activity-facing links or labels.

Recommended minimal changes:

- Improve visual separation between activity states.
- Keep "Confirm Interest" messaging consistent with the rest of the candidate flow.
- Remove any candidate-visible internal UUID exposure from activity links if present.

## Mobile Audit

Current state:

- The list experience is usable.
- The detail experience exists and is reachable.
- Save Opportunity and Check My Fit are accessible on the workspace.

Hardening target:

- Make sure the detail open flow is comfortable on a phone-sized viewport.
- Keep primary actions reachable without accidental mis-taps.
- Ensure My Activity remains usable on mobile, including confirm-interest actions if present.

Recommended minimal changes:

- Verify one real mobile pass on the detail panel or drawer.
- Check that the action buttons remain visible and distinct at narrow widths.
- Keep filters and the opportunity list easy to recover from.

## Privacy / Leakage Check

Candidate-facing UI should continue to hide:

- Workday
- ATS names
- source tiers
- confidence scores
- canonical records
- verification states
- internal publication mechanics
- internal UUIDs

Current audit verdict:

- The main verified browse and fit flow looks clean.
- The saved-activity code path should still be checked for link-level UUID leakage before wider exposure.

## What Should Not Change

- Database schema
- RLS
- Supabase tables and auth flow
- Employer pages and employer intake
- Publication Batch V1 size or composition
- Matching logic
- Public browse ID routing
- Candidate-safe privacy rules

## Likely Files Involved

- `src/lib/candidateJobActions.ts`
- `src/lib/publicJobs.ts`
- `src/data/publicationBatchV1.ts`
- `src/components/JobCard.tsx`
- `src/components/OpportunityWorkspace.tsx`
- `src/components/RoleDetailsModal.tsx`
- `src/pages/FindJobs.tsx`
- `src/pages/MyMatches.tsx`
- `src/pages/MyActivity.tsx`

## Validation Checklist After Implementation

- Save Opportunity shows a clear success state.
- Save Opportunity shows a clear already-saved state on repeat interaction.
- Save after quick profile creation resumes cleanly.
- Check My Fit keeps the public `pub-batch-v1-*` job ID in the URL.
- Check My Fit still works after Save fixes.
- Confirm Interest remains clearly distinct from Save and Check My Fit.
- My Activity resolves without hanging.
- My Activity clearly separates saved, fit-checked, and confirmed-interest states.
- No candidate-facing internal UUIDs appear in URLs or labels.
- Mobile detail flow is practical on a phone-sized viewport.
- `npm run build` passes after changes.

## Recommended Next Step

Keep Publication Batch V1 hardening narrowly focused on clarity, state separation, and mobile usability. Do not widen the batch, redesign the workspace, or move into employer flow work yet.

