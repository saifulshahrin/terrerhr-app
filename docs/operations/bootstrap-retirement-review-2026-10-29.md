# Bootstrap project review — 29 October 2026

Project: terrer-schema-s2c-bootstrap (epigstfenpqbslgeyrtn). This is an isolated historical setup environment, not the production target tlufttnmwtjbuhjcrqmp.

## Inspection

Restored and inspected before recommending retirement. GitHub code search found no references to the bootstrap project ID. Public schema has 17 tables: all empty except profiles (2 records) and job_sources (1 record). Auth has 2 accounts; storage has 0 objects. No jobs, candidates, applications, submissions or activity data. These counts are exact, not planner estimates. Deployment environment URLs are stored as sensitive variables and could not be independently decrypted; do not claim a complete external integration inventory.

## Security remediation (bootstrap only)

Applied remote migration secure_unused_bootstrap_tables. Enabled RLS and revoked anon/authenticated privileges for profiles, skills, candidates, source_profiles, candidate_scores and candidate_capabilities. No policies existed on these six tables. Set search_path=pg_catalog,public,pg_temp on the four timestamp/activity trigger functions identified by advisors. Subsequent audit found zero public tables without RLS; missing-RLS and mutable-search-path findings cleared. No production ACLs were changed. Remaining password-protection warning needs separate product/plan consideration; no paid upgrade authorized.

## Decision and next step

Recommend retirement after exporting the schema and preserving the three setup records and any account ownership details that are still needed. No deletion performed. Do not automate perpetual synthetic activity for an unused project. Keep production health monitoring in place. The bootstrap project may safely remain isolated pending explicit retirement approval and backup verification.

## Rollback and risk

These six tables are now inaccessible directly to anon/authenticated; administrative/service access remains available. If this environment is reused, add narrowly scoped grants and RLS policies as a reviewed migration. Do not disable RLS to clear an access error. No personal row data or secrets are stored in this report.
