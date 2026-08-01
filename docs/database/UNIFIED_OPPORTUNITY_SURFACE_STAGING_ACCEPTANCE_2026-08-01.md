# Unified Opportunity Surface staging acceptance

Date: 2026-08-01

Repository: `saifulshahrin/terrerhr-app`

Validated main commit: `674af3a3c949145bf65300f67ec99f50f87a995e`

Staging project: `terrer-security-staging-2026-07`

Staging project reference: `nulpvbirlhauukccunqg`

Database: PostgreSQL `17.6.1.141`

Supabase CLI: `2.110.0`

## Result

**STAGING ACCEPTANCE PASSED**

The approved Unified Opportunity Surface migration was applied to staging only.
No seed, fixture, pilot, role, backfill, frontend, application, staging-data, or
production operation was included.

## Project identity controls

The authenticated Supabase project inventory identified:

- staging: `nulpvbirlhauukccunqg`, named `terrer-security-staging-2026-07`,
  active and healthy in `ap-south-1`;
- production: a separate project reference, which was not linked, queried,
  migrated, or modified during acceptance.

The CLI was explicitly linked to the staging reference before ledger inspection.
All remote SQL validation used the explicit staging project ID.

## Migration ledger

Initial staging ledger:

- migration count: `56`;
- latest migration: `20260723140703_repair_activity_log_active_staff_authorization`;
- all 22 restored shared-migration normalized SQL hashes matched the canonical
  repository evidence manifest;
- the two historical filename aliases were already correctly recorded as
  `20260507000000` and `20260509000000`.

Pending migration inspection found exactly one migration through the approved
target:

- `20260731035000_unified_opportunity_surface_schema.sql`

A CLI dry run reported that migration only, with no seeds or roles. The
migration then applied successfully using the standard Supabase migration push.

Final staging ledger:

- migration count: `57`;
- latest migration: `20260731035000_unified_opportunity_surface_schema`;
- target ledger row present: yes.

## Read-only acceptance

Executed unchanged:

`supabase/validation/20260731035000_unified_opportunity_surface_read_only_acceptance.sql`

Execution completed successfully. Follow-up consolidated catalog assertions
were all `true` and verified:

- `public.external_opportunities` exists;
- `public.external_opportunity_reviews` exists;
- RLS is enabled on both tables;
- the exact seven approved RLS policies exist;
- candidate review reads use verified-email ownership isolation;
- the normalized source URL generated column and normalizer contract exist;
- representative URL normalization cases pass;
- `external_opportunities_normalized_source_url_uq` is unique;
- `external_opportunities_source_reference_reconciliation_idx` exists and is
  non-unique;
- no source-reference uniqueness index exists;
- the exact three approved triggers exist;
- all nine approved review constraints exist;
- candidate-visible review grants exclude `review_notes` and `reviewed_by`;
- authenticated direct update is limited to `review_status`;
- trusted review creation is executable by `service_role` only and remains
  security-invoker;
- guarded review-note update is executable by `authenticated` only, uses a fixed
  `pg_catalog, pg_temp` search path, requires active staff, restricts roles to
  admin or recruiter, and raises SQLSTATE `42501` for unauthorized paths;
- both new tables contained zero rows after migration.

## Canonical recruitment isolation

Remote catalog and function-definition checks confirmed:

- no foreign keys connect the new surface to `applications`, `submissions`, or
  `web_job_interest`;
- no triggers were added to those canonical workflow tables;
- no Unified Opportunity function contains executable references to
  applications, submissions, web job interest, representation records, or
  Confirm Interest;
- no fixture, pilot, or backfill rows were inserted.

The only migration-ledger text containing the terms application, submission,
Confirm Interest, or representation is a `COMMENT ON
public.external_opportunity_reviews` statement that explicitly documents that a
review row is none of those canonical workflow records. It has no workflow side
effect.

## Scope boundary

Acceptance stopped before production deployment, pilot insertion, frontend or
app integration, and bulk backfill. Production was untouched.
