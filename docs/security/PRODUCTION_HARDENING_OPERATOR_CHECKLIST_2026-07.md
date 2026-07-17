# Production Hardening Operator Checklist

Use this checklist only after the review package is approved.

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
