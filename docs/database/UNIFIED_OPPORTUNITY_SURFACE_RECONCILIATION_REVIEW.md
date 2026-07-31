# Unified Opportunity Surface migration-reconciliation review

## Scope and provenance

- Approved design SHA-256: `04b5db0c12489b1dc6dff832c0c572f6ea3a51ddd755a53242da64de222f0297`
- Repository: `saifulshahrin/terrerhr-app`
- Canonical base: `main` at `ea632559b726e91a435088b04d56843515b1a558`
- Reference branch: `migration/unified-opportunity-surface-generation-2026-07-clean`
- Reference commit: `dedc7fdd21ca6e33f4b1ef2e74feb82d9f4df78d`
- Reconciliation branch: `migration/unified-opportunity-surface-reconciled-2026-07`
- Schema migration: `supabase/migrations/20260731035000_unified_opportunity_surface_schema.sql`
- Non-executing read-only acceptance specification: `supabase/validation/20260731035000_unified_opportunity_surface_read_only_acceptance.sql`
- No backfill is included in the schema migration.

## Migration-order review

Canonical repository `main` contains 56 migration files and includes the
restored 22-file repository-ledger package. Its latest canonical migration is:

`20260723140703_repair_activity_log_active_staff_authorization`

The reconciled migration timestamp is `20260731035000`, later than every
canonical migration currently under `supabase/migrations`.
It depends on:

- `public.candidates(candidate_id, email)`;
- `public.profiles(id, role, is_active)`;
- `private.is_current_user_active_staff()`;
- Supabase roles `anon`, `authenticated`, and `service_role`;
- `auth.uid()` and `auth.jwt()`;
- `gen_random_uuid()`;
- PostgreSQL generated stored columns.

The restored canonical ledger now provides the active-staff helper before this
migration. The earlier repository-ledger blocker is therefore resolved.

## Static SQL review

- The source URL normalizer is declared `IMMUTABLE`, `STRICT`, and
  `SECURITY INVOKER`, making it eligible for the stored generated-column
  expression on the repository's PostgreSQL version.
- Normalization is conservative: scheme/authority casing, fragment removal,
  trailing slash removal, known tracking-parameter removal, and deterministic
  remaining-query ordering.
- `normalized_source_url` is the enforced external-opportunity source identity.
  Its unique index fails closed on a normalized URL collision.
- `source_reference_id` remains immutable internal source metadata. Its
  source-reference index is intentionally non-unique and exists only for
  reconciliation lookup and diagnostics.
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
- The reference generation used a pinned third-party static parser for its
  validation SQL. That parser did not understand PostgreSQL's valid
  `SECURITY INVOKER` function clause in the migration. This reconciliation did
  not run a SQL parser or database engine; the reconciled migration and
  acceptance SQL were reviewed statically against the approved architecture.

## Reconciliation static validation

- The repository-ledger static validator passed all 22 restored migration
  hashes, version ordering, dependency ordering, production-only-event
  exclusion, and restoration-chain object exclusions.
- The reconciled migration is the only newly added file under
  `supabase/migrations`.
- `20260731035000` is later than every canonical migration timestamp.
- The staged package is limited to the schema migration, read-only acceptance
  SQL, and this review report.
- Diff review against reference commit `dedc7fdd21...` confirmed the schema is
  unchanged except for the approved source-reference amendment and its
  explanatory column comment.
- Static source checks confirmed URL uniqueness remains enforced,
  source-reference identity is non-unique, no pilot fixture/backfill is
  present, and no canonical recruitment-table write is introduced.

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

## Approved source-identity amendment

The previously generated migration enforced a partial unique key on:

`(source_type, lower(source_name), source_reference_id)`

That rule has been removed. Shared ATS platforms can issue tenant-scoped
reference identifiers, so source-reference metadata cannot safely serve as
cross-company identity.

The reconciled architecture is:

- enforced source identity: unique `normalized_source_url`;
- reconciliation metadata: non-unique
  `(source_type, lower(source_name), source_reference_id)` index;
- diagnostic index coverage: `company_name` and `id`;
- collision behavior: normalized URL collisions fail closed;
- metadata behavior: source-reference collisions remain inspectable and do not
  merge or reject distinct companies by themselves.

## Deviations and unresolved risks

1. The approved four-record backfill is intentionally excluded from the schema
   migration and remains separately approval-gated.
2. “Only service_role may execute” is exact for API roles after ACL revocation;
   the function owner and PostgreSQL superusers cannot be stripped of their
   inherent authority.
3. A third-party parser does not support the PostgreSQL `SECURITY INVOKER`
   clause and therefore could not parse the complete migration. Full
   PostgreSQL parser/runtime proof still requires an explicitly approved local
   and staging application. This reconciliation phase performed static review
   only.

## Non-execution declaration

No migration, validation SQL, backfill, reset, schema change, RLS change, auth
change, application change, staging change, production change, or PR merge was
performed during reconciliation.
