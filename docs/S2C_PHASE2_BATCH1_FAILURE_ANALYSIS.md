# S2C Phase 2 Batch 1 Failure Analysis

## 1. Exact Failure Summary

Batch 1 was approved for structural reconstruction of:

- `public.companies_id_seq`
- `public.companies`
- `public.job_sources`

The reviewed transaction was submitted to the approved disposable project, but immediate validation showed that `public.companies` was still missing. The first validation query then failed with:

```text
ERROR: 42P01: relation "public.companies" does not exist
```

Execution stopped immediately after that failure. No fix, retry, or alternate execution method was attempted.

## 2. Execution Method Used

The method used was:

1. Link the Supabase CLI to the disposable project ref `epigstfenpqbslgeyrtn`.
2. Verify the linked project in `supabase projects list`.
3. Run a pre-state check with `supabase db query --linked`.
4. Submit the reviewed Batch 1 SQL as one explicit `BEGIN` / `COMMIT` transaction through `supabase db query --linked`.
5. Run read-only validation queries through `supabase db query --linked`.

The transaction SQL was passed inline through the shell as a multi-statement string, not through a migration file and not through a local SQL file.

## 3. Whether SQL Was Actually Run Against the Intended Project

The evidence indicates the intended project was selected in the CLI:

- `supabase projects list` marked `epigstfenpqbslgeyrtn` as linked.
- The local `supabase/.temp/project-ref` value matched `epigstfenpqbslgeyrtn` during the execution window.
- The pre-state query against the linked project returned the expected Phase 1 profile state and showed the Batch 1 objects absent.

So the target selection was correct.

However, the post-execution structural state does not support a normal successful persistence result for Batch 1. The most accurate conclusion is:

- the intended project was selected correctly, but
- the submitted SQL did not leave the expected Batch 1 objects in the disposable database.

## 4. Whether the SQL Editor / Execution Method May Have Only Run Part of the Script

Yes, that is a plausible explanation.

The CLI output for the transaction submission returned exit code `0` with an empty row set, which is consistent with a command that was accepted at the tool layer but not clearly proven to have persisted all DDL statements in the database.

Possible partial-execution patterns include:

- the management API path accepted the request but did not persist the multi-statement DDL as expected;
- the SQL was parsed or transmitted differently than intended by the linked-query path;
- only part of the script was applied before an unreported boundary or session issue; or
- the command path executed in a way that did not provide reliable DDL persistence evidence.

Because the first validation query already found `public.companies` missing, the script was not validated as a whole.

## 5. Whether Transaction Rollback Occurred

No explicit rollback error was observed, but rollback is a possible explanation.

The reviewed SQL used an explicit `BEGIN` / `COMMIT` block. If any statement failed internally before commit, PostgreSQL would normally abort the transaction and prevent persistence. In that case, the final database state would match what was observed: no Batch 1 objects present.

Because the command did not surface an error at submission time, there are two broad possibilities:

- the transaction was never successfully committed, or
- the execution channel did not provide trustworthy feedback about the transaction’s true outcome.

The observed database state is compatible with rollback or non-persistence.

## 6. Whether `BEGIN/COMMIT` Behavior May Have Affected Execution

Yes.

The reviewed Batch 1 SQL was wrapped in a single transaction. That creates two important effects:

1. If any DDL statement fails, the whole transaction can be lost.
2. If the execution channel does not surface the real failure cleanly, the caller may see a superficially successful command even though nothing persisted.

This is especially relevant here because the post-execution validation showed the target tables were still absent.

## 7. Whether Permissions, Selected Database, Selected Schema, or Target Context Could Explain It

Yes, each is a possible contributor.

### Permissions

Permissions are less likely to be the root cause because the pre-state query against the linked disposable project succeeded, and the CLI was able to read the expected Phase 1 profile state.

### Selected Database

The linked project was correct, but the execution method could still have used a different internal session or execution path than expected. That remains plausible.

### Selected Schema

The SQL explicitly targeted `public`. A schema-selection problem is therefore less likely than a target/session/execution-path problem.

### Target Context

Target context looks correct at the CLI level, but the outcome suggests the execution path may not have persisted DDL into the intended disposable database the way a direct interactive SQL session would.

## 8. Whether the Disposable Project Currently Contains

Based on the validation evidence collected after the failed Batch 1 attempt:

| Object | Current state |
|---|---|
| `public.profiles` | Present |
| `public.companies` | Missing |
| `public.job_sources` | Missing |

The pre-state check also showed `public.profiles` count `2`.

## 9. Most Likely Root Causes Ranked

1. **CLI linked-query execution path did not persist the multi-statement DDL transaction as expected.**
   - Strongest fit for the observed mismatch between command-level success and missing objects.

2. **The transaction was effectively rolled back or never committed, despite the command returning success.**
   - Also fits the final state and the absence of Batch 1 objects.

3. **The batch SQL was valid structurally, but the execution channel only partially processed or transmitted it.**
   - Plausible because the DDL was submitted inline as a long multi-statement string.

4. **A target-context mismatch occurred inside the execution path despite correct external project selection.**
   - Less likely, because the project list and local ref matched the approved disposable target.

5. **Permissions or schema selection blocked persistence without surfacing a clear error.**
   - Possible, but less likely than the execution-path or rollback explanations.

## 10. Safest Next Execution Method Recommendation

The safest next method is a no-execution review step first, not another database run.

If execution is later re-approved, the next safest method should be one that provides stronger, direct confirmation of DDL persistence than the linked-query path used here. The approval package should require:

- an explicitly named disposable target;
- a single approved execution channel;
- one short structural batch;
- immediate post-execution validation in the same approved context;
- and explicit stop-on-first-error behavior.

No retry method is authorized by this analysis.

## 11. Whether Batch 1 SQL Itself Still Appears Valid

Yes, the Batch 1 SQL still appears structurally valid from the evidence we reviewed.

Why it still looks valid:

- the object definitions match the authoritative live schema capture;
- `companies` has the correct identity-backed `id` column, primary key, and `source_status` check;
- `job_sources` has the correct column set, primary key, checks, and approved indexes;
- the sequence metadata and ownership evidence align with the `companies` identity sequence approach.

What remains unresolved is not the SQL shape itself, but the execution path’s ability to persist it reliably in the disposable project.

## 12. Required Approval Before Retry

Before any retry, the following approval is required:

1. Explicit approval to investigate the execution-channel mismatch.
2. Explicit approval for a revised Batch 1 execution method.
3. Explicit approval of the exact SQL payload, if any change is proposed.
4. Explicit approval for a single retry only after the execution method is clarified.
5. Explicit confirmation that no production target may be used under any circumstance.

Without that approval, no retry is authorized.

## NO-EXECUTION Recovery Plan

This is the recovery plan with no database execution:

1. Freeze Batch 1 retries.
2. Preserve the failure report and the exact SQL review artifact.
3. Record that the target selection was correct but the persistence outcome was not.
4. Treat the execution channel, not the SQL shape, as the immediate investigation focus.
5. Reconfirm the authoritative schema evidence for `companies`, `companies_id_seq`, and `job_sources`.
6. Prepare a revised approval package that names the exact execution method and stop conditions.
7. Require a fresh human decision before any future retry.

## Documentation Boundary

- No SQL was executed for this analysis.
- No disposable-project object was modified.
- No fix was attempted.
- No production resource was touched.
