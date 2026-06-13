# Candidate Web Conversion Baseline

## Verdict

**Candidate Web Conversion baseline: GO for limited V1 pilot hardening**

This is **not** a full public launch signal and **not** a permanent publication architecture decision. The baseline is good enough to keep hardening the current pilot path while we finish the remaining cleanup and durability work.

## What Now Works

- Publication Batch V1 is visible in the candidate workspace.
- 10 opportunities are visible.
- 3 featured opportunities are visible.
- Save Opportunity works.
- My Activity resolves and displays saved activity.
- Refresh preserves My Activity state.
- Check My Fit still routes with the public `pub-batch-v1-*` job ID.
- No internal UUID leakage was observed in the verified candidate flow.

## Fixed Blockers

- Public ID vs UUID persistence mismatch for saved opportunities.
- `/my-activity` infinite loading and missing bounded states.
- `Map is not a constructor` runtime error caused by a `lucide-react` `Map` import collision.

## Candidate Intent Model

The current V1 candidate actions are intentionally distinct:

- **Save Opportunity** = bookmark / remember this role
- **Check My Fit** = candidate asks Terrer to assess suitability
- **Confirm Interest** = candidate confirms stronger intent to progress toward Terrer review

This distinction should remain visible in product behavior and copy. Save, fit, and confirm-interest are related, but they are not the same action.

## Remaining Caveats

- The hardcoded `canonicalJobId` bridge is temporary and environment-specific.
- The final architecture should use a real candidate publication table such as `candidate_web_jobs` or an equivalent canonical publication source.
- Confirm Interest semantics may need cleaner tracking later.
- This is limited pilot hardening, not full launch readiness.
- Mobile should still get one more practical pass before wider exposure.

## Recommended Next Phase

Publication Batch V1 hardening should focus on:

- tightening success, empty, and error states
- improving candidate-facing copy for Save, Fit, and Confirm Interest
- verifying the mobile detail experience
- ensuring activity cards clearly distinguish saved vs fit-checked vs confirmed-interest states
- preparing the eventual migration away from the hardcoded UUID fallback bridge

## Files Changed In This Conversion Fix Sequence

- `src/lib/candidateJobActions.ts`
- `src/lib/publicJobs.ts`
- `src/data/publicationBatchV1.ts`
- `src/pages/MyActivity.tsx`

## Validation Summary

- `npm run build` passed after fixes.
- Supabase backend persistence readback passed.
- Manual browser verification passed for Save, My Activity, refresh, and Check My Fit public ID routing.

