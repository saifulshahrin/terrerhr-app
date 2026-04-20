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
