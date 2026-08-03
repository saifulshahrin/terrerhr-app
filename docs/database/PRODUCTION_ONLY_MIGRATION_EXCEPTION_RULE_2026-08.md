# Production-only migration exception rule — August 2026

## Decision

The repository recognizes exactly one audited migration-ledger event that is present only in production and must not be replayed:

`20260723143425_reconcile_candidate_engine_production_authorization`

This is a narrow evidence-backed exception, not a generic ignore mechanism. Every normal migration remains subject to exact repository name, ordering, and normalized-SQL comparison. Any other unexpected or missing ledger entry is a hard NO-GO.

## Exact approved evidence

| Field | Required value |
|---|---|
| Version | `20260723143425` |
| Name | `reconcile_candidate_engine_production_authorization` |
| Production statement count | `37` |
| Production normalized SQL MD5 | `f07c7ee2e1eaf811f0337b108bdc6e12` |
| Corrected historical SQL SHA-256 | `9d7d4331c58a482c6f25e2369d0a289f611139b0125b23c29b90577ed0b4ee77` |
| Source branch | `repair/candidate-engine-production-ledger-plan-2026-07` |
| Original commit | `680b351766a7bf8a809ec968a09af4fbc874b48a` |
| Corrected authoritative commit | `ae27965cd7a4c07bbee5c713040b61eff470200a` |
| Historical path | `supabase/migrations/20260723143425_reconcile_candidate_engine_production_authorization.sql` |
| Replayable | `false` |
| Production only | `true` |
| Semantic equivalence required | `true` |

The production statement array matches the corrected historical SQL. The event reconciled legacy production authorization in one wrapper. Staging does not carry this ledger row.

## Why the historical SQL stays outside migrations

The shared repository sequence `20260723110554` through `20260723140703` already creates the active-staff helper and final policies. The historical wrapper then expects zero application policies and named legacy submissions/activity policies before creating the same final policy names. Replaying it in timestamp order would fail those preconditions or collide with existing objects and would break a fresh local reset.

The production ledger must not be edited or repaired away: it is accurate historical evidence. Repository representation consists of the explicit non-replayable manifest record, this documentation, the production-only audit, and fail-closed validators—not a no-op migration.

## Fail-closed validation

`scripts/validate-production-ledger-exception.mjs` and `scripts/lib/production-ledger-exception.mjs` enforce:

- the allowlist contains only the exact event above;
- every evidence field and provenance value matches an immutable expected record;
- production contains exactly one matching event;
- staging contains no such event;
- normal applied migrations form an exact ordered repository prefix;
- normal name/hash mismatches, missing migrations before the endpoint, and other unexpected events fail;
- the historical file is absent from `supabase/migrations`;
- current authorization remains semantically equivalent.

Semantic equivalence requires the private active-staff helper, authenticated-only execution, exactly the SELECT/INSERT/UPDATE staff policies on `applications`, `submissions`, and `activity_log`, no legacy anonymous or broad authenticated policies, no DELETE/ALL policies, no anonymous/PUBLIC table privileges, and no weaker policy or grant.

`supabase/validation/repository_ledger_restoration_read_only.sql` supplies the corresponding environment-side ledger and catalog checks. A mismatch is evidence of drift and remains a NO-GO.

## Unified Opportunity activation resume point

After this validator is merged, resume only at **Gate 1 — pre-mutation baseline and ledger validation**. Run the exact production evidence and semantic checks, confirm the exception-aware pending sequence, and stop on any mismatch. This change does not authorize Gates 2–9, migrations, deployment, inventory, Auth, CORS, secret, production, or staging changes.

## Future exceptions

Any future production-only event requires separate explicit approval, complete provenance, exact statement/hash evidence, proof that replay is unsafe, semantic-equivalence checks, focused negative tests, and its own reviewed manifest change. There is no wildcard, configuration flag, or pattern-based bypass.
