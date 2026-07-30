# Unified Opportunity Surface migration-generation review

## Scope and provenance

- Approved design SHA-256: `04b5db0c12489b1dc6dff832c0c572f6ea3a51ddd755a53242da64de222f0297`
- Repository: `saifulshahrin/terrerhr-app`
- Generation branch: `migration/unified-opportunity-surface-generation-2026-07-clean`
- Schema migration: `supabase/migrations/20260730155156_unified_opportunity_surface_schema.sql`
- Non-executing validation specification: `supabase/validation/20260730155156_unified_opportunity_surface_static_validation.sql`
- No backfill is included in the schema migration.

## Migration-order review

The production migration ledger currently ends at:

`20260723143425_reconcile_candidate_engine_production_authorization`

The staging ledger currently ends at:

`20260723140703_repair_activity_log_active_staff_authorization`

The generated migration timestamp is `20260730155156`, later than both ledgers.
It depends on:

- `public.candidates(candidate_id, email)`;
- `public.profiles(id, role, is_active)`;
- `private.is_current_user_active_staff()`;
- Supabase roles `anon`, `authenticated`, and `service_role`;
- `auth.uid()` and `auth.jwt()`;
- `gen_random_uuid()`;
- PostgreSQL generated stored columns.

Read-only production catalog inspection confirmed those dependencies and
PostgreSQL `17.6`. It also confirmed the `admin`, `recruiter`, and `bd` values
in the existing `profiles_role_check`.

Repository warning: current GitHub `main` ends before the six Candidate Engine
migrations already present in production and before five of them already
present in staging. The generated timestamp is later than every ledger, but its
active-staff-helper dependency is absent from `main`. The repository ledger
must therefore be reconciled before any future local reset or migration
execution. No missing historical migration was recreated in this generation
task.

The initially created branch
`migration/unified-opportunity-surface-generation-2026-07` was rejected as a
commit target because it had diverged from current `main` and carried unrelated
historical work. It was left unchanged. The generated artifacts are committed
only on the clean branch named above.

## Static SQL review

- The source URL normalizer is declared `IMMUTABLE`, `STRICT`, and
  `SECURITY INVOKER`, making it eligible for the stored generated-column
  expression on the repository's PostgreSQL version.
- Normalization is conservative: scheme/authority casing, fragment removal,
  trailing slash removal, known tracking-parameter removal, and deterministic
  remaining-query ordering.
- The opportunity table uses soft suppression/retirement and grants no staff or
  candidate DELETE path.
- The review table enforces one row per
  `(candidate_id, external_opportunity_id)`.
- Candidates have safe-column SELECT only and no INSERT or DELETE path.
- Candidate UPDATE attempts have column privilege only for the staff workflow
  columns, but the admin/recruiter-only RLS policy denies candidate and BD
  mutation.
- `review_notes` and `reviewed_by` are absent from ordinary authenticated
  SELECT grants.
- The trusted creation RPC is executable by `service_role` among API roles.
  PostgreSQL function owners and superusers necessarily retain owner/superuser
  authority.
- The staff internal-note RPC is narrowly guarded by the existing active-staff
  helper plus an explicit admin/recruiter role check.
- No generated trigger or function references `web_job_interest`,
  `applications`, `submissions`, Confirm Interest, or representation objects.
- A pinned third-party static parser accepted the validation SQL. It did not
  understand PostgreSQL's valid `SECURITY INVOKER` function clause in the
  migration, so it could not provide a complete parse result for that file.
  The migration has been reviewed statement-by-statement against PostgreSQL 17
  syntax, but authoritative runtime proof remains deferred to the separately
  approval-gated local and staging phases.

## Trigger and timestamp review

PostgreSQL executes triggers of the same event and timing in alphabetical name
order. For `external_opportunities`, the immutable guard runs before the
updated-at trigger:

1. `external_opportunities_guard_immutable_fields`
2. `external_opportunities_set_updated_at`

The guard does not alter `updated_at`; the second trigger sets it with `now()`,
which is stable for the transaction. Reviews have one update trigger. It owns
both lifecycle audit timestamps and `updated_at`, preventing competing
timestamp writers. A completed review that later closes preserves
`completed_at`, `under_review_at`, `reviewed_at`, and `reviewed_by`.

## Source-reference uniqueness assessment

The approved partial unique key is:

`(source_type, lower(source_name), source_reference_id)`

The four approved pilot records do not collide under this key. However, the key
can create a false cross-company collision when:

- `source_name` identifies a shared ATS rather than an employer tenant; and
- the ATS reference is tenant-scoped rather than globally unique.

This is plausible for sources such as shared ATS platforms. The normalized URL
unique index independently protects exact normalized URLs, but it does not
eliminate the source-reference scoping risk.

No silent change was made. Bounded amendment for Chief Architect consideration:
scope the reference key by an approved stable source-tenant identity. If no
tenant identity is available in Phase 1, adding `lower(company_name)` is the
smallest fallback, with the trade-off that company-name variants can miss real
duplicates. Until amended, ingestion should preflight and fail closed on a
cross-company reference collision.

## Deviations and unresolved risks

1. The approved four-record backfill is intentionally excluded from the schema
   migration and remains separately approval-gated.
2. Repository `main` migration history lags the production and staging ledgers
   by the Candidate Engine migration sequence. This is an execution blocker
   until reconciled, because the generated migration references the active
   staff helper created in that missing sequence.
3. The approved source-reference uniqueness key has the bounded
   cross-company-collision risk described above.
4. “Only service_role may execute” is exact for API roles after ACL revocation;
   the function owner and PostgreSQL superusers cannot be stripped of their
   inherent authority.
5. A third-party parser does not support the PostgreSQL `SECURITY INVOKER`
   clause and therefore could not parse the complete migration. Full
   PostgreSQL parser/runtime proof still requires an explicitly approved local
   and staging application. This generation phase performed static review only.

## Non-execution declaration

No migration, backfill, reset, schema change, RLS change, auth change,
application change, staging change, production change, or PR merge was
performed during generation.
