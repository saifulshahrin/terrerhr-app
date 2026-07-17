# Production Hardening Operator Checklist

Use this checklist only after the review package is approved.

## Completed Execution Status

- Production project ref was confirmed as `tlufttnmwtjbuhjcrqmp`.
- A fresh production backup was completed before execution.
- The work ran in the approved production SQL Editor flow, not through `supabase db push`.
- `candidate_web_jobs` was confirmed missing before execution.
- `vw_candidate_search_clean` was included in the approved wrapper and review package.
- The forward candidate completed successfully.
- Validation was rerun after the ambiguity bug was patched.
- Supabase Advisor was rerun after validation.
- Web smoke tests passed.
- Rollback was not used.
- Direct `supabase db push` was not used.
- Production now requires post-execution password rotation because the DB password appeared in a screenshot during backup.

- Confirm production project ref is `tlufttnmwtjbuhjcrqmp`.
- Confirm a fresh production backup exists.
- Confirm the work is happening in a low-traffic window.
- Confirm `candidate_web_jobs` was missing before execution.
- Confirm `vw_candidate_search_clean` dependency is included.
- Run the forward candidate only after explicit approval.
- Run validation after the forward candidate.
- Rerun Supabase Advisor after validation.
- Smoke test web candidate access after Advisor rerun.
- Keep the rollback candidate file ready.
- Do not run `supabase db push`.
