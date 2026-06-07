# Phase S2B.5 Reconstruction Readiness Audit

## Purpose

This audit isolates the **16 PARTIAL** and **1 BLOCKED** reconstruction items identified in S2B so Terrer can enter S2C with clear visibility into unresolved dependencies.

This is a documentation-only readiness review. It does not create SQL, migrations, schema changes, RLS changes, auth changes, storage changes, application code changes, or production actions.

## Summary Counts

| Status | Count |
|---|---:|
| `PARTIAL` | 16 |
| `BLOCKED` | 1 |
| Total non-ready items | 17 |

## Executive Risk Summary

Terrer is structurally close to disposable-project validation, but it is not yet operationally rebuild-safe. The unresolved items are concentrated in five areas:

1. **Auth/profile bootstrap** — one blocker prevents full authenticated workflow validation.
2. **Candidate-derived data ownership** — `skills`, `candidate_skills`, `candidate_scores`, `candidate_capabilities`, and `evidence_signals` have unclear producers or lifecycle rules.
3. **Public/intake writers** — `web_candidate_intakes` and `web_job_interest` need external writer and policy validation.
4. **Automation/AI persistence** — autonomous recruiter tables have known structure but incomplete writer ownership.
5. **Platform/security portability** — storage behavior, duplicate company triggers, and conditional automatic RLS enablement need disposable-project proof.

## Recommendation on S2C

**Recommendation: do not begin S2C execution yet.**

Proceed with **S2C preparation** only: define synthetic fixtures, approve the profile-bootstrap method, select the disposable Supabase platform/version, document exact handling for duplicate triggers and conditional RLS automation, and obtain explicit authority before executing anything in a disposable project.

Once those entry gates are approved, S2C can proceed with these PARTIAL objects included as validation targets rather than treated as fully approved baseline design.

## Non-Ready Object Audit

### 1. `profiles`

| Field | Finding |
|---|---|
| Object type | table |
| Current status | `PARTIAL` |
| Why it is not READY | The physical table evidence exists, but the auth lifecycle and profile row creation path are unresolved. |
| Missing evidence | How profile rows are created for new users; expected behavior for missing, inactive, or non-admin profiles. |
| Missing dependency | Approved synthetic auth-user and profile-bootstrap procedure. |
| Reconstruction risk | High: authenticated policies and admin checks may fail even if the table rebuilds correctly. |
| What would make it READY | Document and approve a non-production bootstrap method, then validate auth/profile/RLS behavior in a disposable project. |
| Estimated effort | medium |
| Recommendation | gather evidence first |

### 2. `skills`

| Field | Finding |
|---|---|
| Object type | table |
| Current status | `PARTIAL` |
| Why it is not READY | The physical shape is known, but taxonomy ownership, ID generation, uniqueness, and lifecycle rules are unclear. |
| Missing evidence | The source that creates skills and whether skill names are governed, deduplicated, or seeded. |
| Missing dependency | Approved taxonomy writer or seed process. |
| Reconstruction risk | Medium: matching and candidate-skill joins may work structurally but produce inconsistent vocabulary. |
| What would make it READY | Identify the writer/seed owner and define synthetic skill fixtures for validation. |
| Estimated effort | medium |
| Recommendation | gather evidence first |

### 3. `autonomous_recruiter_runs`

| Field | Finding |
|---|---|
| Object type | table |
| Current status | `PARTIAL` |
| Why it is not READY | Schema, indexes, and policies are captured, but the production writer and run lifecycle are not proven. |
| Missing evidence | Which service, script, or Edge Function inserts and updates run rows. |
| Missing dependency | Writer contract and lifecycle states. |
| Reconstruction risk | Medium: physical rebuild is likely, but AI operating workflows may not be reproducible. |
| What would make it READY | Trace the writer and define synthetic run creation/update validation. |
| Estimated effort | medium |
| Recommendation | proceed anyway |

### 4. `web_candidate_intakes`

| Field | Finding |
|---|---|
| Object type | table |
| Current status | `PARTIAL` |
| Why it is not READY | Table and policies are captured, but the external caller and promotion path into canonical candidates are unverified. |
| Missing evidence | Public form/API writer, auth mode, and conversion process from intake to candidate. |
| Missing dependency | Synthetic public intake fixture and expected promotion behavior. |
| Reconstruction risk | Medium: exact-live rebuild can include the object, but marketplace intake behavior may fail. |
| What would make it READY | Validate anon/auth insert behavior and document the downstream review or promotion owner. |
| Estimated effort | medium |
| Recommendation | gather evidence first |

### 5. `web_job_interest`

| Field | Finding |
|---|---|
| Object type | table |
| Current status | `PARTIAL` |
| Why it is not READY | Physical schema and policies are known, but public creation and internal review ownership are unresolved. |
| Missing evidence | External/browser writer, auth posture, expected lifecycle states, and review workflow. |
| Missing dependency | Synthetic anon/public write tests and reviewer workflow fixture. |
| Reconstruction risk | Medium-high: unsafe or mismatched public write behavior could affect marketplace intake. |
| What would make it READY | Confirm write path, policy behavior, and exact review-state expectations in disposable validation. |
| Estimated effort | medium |
| Recommendation | gather evidence first |

### 6. `candidate_scores`

| Field | Finding |
|---|---|
| Object type | table |
| Current status | `PARTIAL` |
| Why it is not READY | Physical fields and FK evidence exist, but cardinality, producer, and refresh lifecycle are unknown. |
| Missing evidence | Whether scores are current-only, historical, manual, model-generated, or periodically refreshed. |
| Missing dependency | Scoring writer contract and expected uniqueness/cardinality. |
| Reconstruction risk | High: matching intelligence can rebuild structurally but may not reproduce meaningful scores. |
| What would make it READY | Identify scoring producer and define expected insert/update behavior with synthetic candidates. |
| Estimated effort | medium |
| Recommendation | gather evidence first |

### 7. `candidate_capabilities`

| Field | Finding |
|---|---|
| Object type | table |
| Current status | `PARTIAL` |
| Why it is not READY | The table exists physically, but producer, uniqueness, and regeneration behavior are not known. |
| Missing evidence | Which process derives capabilities and how duplicate or stale capabilities are handled. |
| Missing dependency | Capability derivation owner and synthetic capability fixture. |
| Reconstruction risk | Medium: candidate intelligence may lose derived context after rebuild. |
| What would make it READY | Trace or define producer behavior and validate expected rows from synthetic candidate data. |
| Estimated effort | medium |
| Recommendation | gather evidence first |

### 8. `autonomous_recruiter_memory`

| Field | Finding |
|---|---|
| Object type | table |
| Current status | `PARTIAL` |
| Why it is not READY | Schema and indexes are captured, but source-run relationship, retention, and service-role writer are unverified. |
| Missing evidence | Memory creation/update source, retention expectations, and relation to autonomous runs. |
| Missing dependency | AI operating writer contract. |
| Reconstruction risk | Medium: AI memory may rebuild physically but not preserve intended behavior. |
| What would make it READY | Identify writer/lifecycle and validate synthetic run-memory linkage. |
| Estimated effort | medium |
| Recommendation | proceed anyway |

### 9. `candidate_skills`

| Field | Finding |
|---|---|
| Object type | table |
| Current status | `PARTIAL` |
| Why it is not READY | Exact live shape and FKs are captured, but the table has no key, nullable relationship fields, and an incompatible or unknown writer path. |
| Missing evidence | Normalized row producer, duplicate handling, required fields, and whether app writes match live structure. |
| Missing dependency | Canonical skill assignment writer and uniqueness contract. |
| Reconstruction risk | Critical: candidate matching/search can silently degrade if normalized skills are missing or duplicated. |
| What would make it READY | Identify the producer, define required row shape, and validate candidate-to-skill joins against synthetic fixtures. |
| Estimated effort | high |
| Recommendation | gather evidence first |

### 10. `evidence_signals`

| Field | Finding |
|---|---|
| Object type | table |
| Current status | `PARTIAL` |
| Why it is not READY | The physical table is captured, but active purpose, producer, and baseline inclusion are not fully proven. |
| Missing evidence | Whether it is canonical evidence storage, preserve-only data, or an abandoned prototype. |
| Missing dependency | Producer/consumer confirmation. |
| Reconstruction risk | Low-medium: including it may add noise; excluding it may lose candidate evidence context if still active. |
| What would make it READY | Confirm active consumers/writers or classify it as preserve-only/deferred. |
| Estimated effort | low |
| Recommendation | defer |

### 11. `rls_auto_enable()`

| Field | Finding |
|---|---|
| Object type | function |
| Current status | `PARTIAL` |
| Why it is not READY | Exact definition is known, but baseline inclusion as an automatic security invariant is not approved. |
| Missing evidence | Portability and intended governance behavior in a disposable Supabase environment. |
| Missing dependency | Decision on whether automatic RLS enablement belongs in the rebuild baseline. |
| Reconstruction risk | Medium-high: automatic security mutation can surprise future migration behavior. |
| What would make it READY | Validate platform behavior and approve whether it is exact-live evidence only or target baseline behavior. |
| Estimated effort | medium |
| Recommendation | gather evidence first |

### 12. `set_updated_at` on `companies`

| Field | Finding |
|---|---|
| Object type | trigger |
| Current status | `PARTIAL` |
| Why it is not READY | It overlaps with another company update trigger. Exact-live reproduction is possible, but target-state selection is unresolved. |
| Missing evidence | Whether both triggers fire harmlessly or create redundant/conflicting updates. |
| Missing dependency | Decision on preserving both for exact-live validation versus selecting one for stabilized baseline. |
| Reconstruction risk | Low for exact-live; medium for future baseline cleanliness. |
| What would make it READY | Validate trigger behavior and document target selection after S2C. |
| Estimated effort | low |
| Recommendation | proceed anyway |

### 13. `set_updated_at_companies`

| Field | Finding |
|---|---|
| Object type | trigger |
| Current status | `PARTIAL` |
| Why it is not READY | It is the second overlapping company update trigger, creating duplicate target-design ambiguity. |
| Missing evidence | Which trigger is authoritative, if either, and whether both exist intentionally. |
| Missing dependency | Same target trigger decision as `set_updated_at` on `companies`. |
| Reconstruction risk | Low for exact-live; medium for baseline simplification. |
| What would make it READY | Validate exact-live duplicate behavior and choose one canonical trigger later. |
| Estimated effort | low |
| Recommendation | proceed anyway |

### 14. `ensure_rls`

| Field | Finding |
|---|---|
| Object type | trigger |
| Current status | `PARTIAL` |
| Why it is not READY | The event trigger depends on `rls_auto_enable()` and may be environment-specific. |
| Missing evidence | Disposable-project support for event triggers and expected effects during object creation. |
| Missing dependency | Approved handling of automatic RLS enforcement. |
| Reconstruction risk | High: event triggers can alter behavior during rebuild and complicate deterministic validation. |
| What would make it READY | Test in disposable project and decide exact-live-only versus stabilized-baseline inclusion. |
| Estimated effort | medium |
| Recommendation | gather evidence first |

### 15. `candidate-resumes`

| Field | Finding |
|---|---|
| Object type | storage dependency |
| Current status | `PARTIAL` |
| Why it is not READY | Bucket configuration and policies are captured, but path conventions, signed access, object ownership, and duplicate read policy behavior are untested. |
| Missing evidence | Synthetic upload/read/update/delete behavior and expected app path rules. |
| Missing dependency | Disposable storage fixture and policy test matrix. |
| Reconstruction risk | High: resume upload/download can fail even if the bucket exists. |
| What would make it READY | Validate bucket creation, policy behavior, file paths, and signed access with non-PII synthetic files. |
| Estimated effort | medium |
| Recommendation | gather evidence first |

### 16. `bd-photo-intake`

| Field | Finding |
|---|---|
| Object type | storage dependency |
| Current status | `PARTIAL` |
| Why it is not READY | Bucket configuration is captured, but ownership semantics, broad CRUD behavior, MIME/size limits, and retention expectations are untested. |
| Missing evidence | Synthetic photo upload/read/delete behavior and exact owner/path conventions. |
| Missing dependency | Disposable storage fixture and BD photo policy test matrix. |
| Reconstruction risk | Medium-high: BD photo intake may work structurally but expose overly broad access or retention ambiguity. |
| What would make it READY | Validate storage behavior with synthetic files and document desired target access model. |
| Estimated effort | medium |
| Recommendation | gather evidence first |

### 17. Synthetic profile bootstrap

| Field | Finding |
|---|---|
| Object type | auth dependency |
| Current status | `BLOCKED` |
| Why it is not READY | No approved mechanism exists to create valid disposable `auth.users` and corresponding `profiles` rows for policy and workflow testing. |
| Missing evidence | Exact non-production bootstrap path, expected roles, admin/non-admin fixtures, and teardown process. |
| Missing dependency | Explicit approval to define and later execute a disposable auth/profile setup. |
| Reconstruction risk | Critical: complete authenticated workflow validation cannot proceed without this dependency. |
| What would make it READY | Approve a synthetic, non-production auth/profile bootstrap plan and fixture set before S2C execution. |
| Estimated effort | medium |
| Recommendation | gather evidence first |

## Priority Closure Order

1. Approve synthetic profile bootstrap and auth fixture design.
2. Define S2C disposable platform/version and isolation controls.
3. Establish synthetic storage fixtures and path/access assertions.
4. Trace candidate-derived writers for `skills`, `candidate_skills`, `candidate_scores`, and `candidate_capabilities`.
5. Decide exact-live handling for `rls_auto_enable()` and `ensure_rls`.
6. Validate duplicate company trigger behavior.
7. Confirm public intake writers for `web_candidate_intakes` and `web_job_interest`.
8. Confirm autonomous recruiter writer/lifecycle ownership.
9. Classify `evidence_signals` as canonical, preserve-only, or deferred.

## S2C Entry Criteria

S2C should start only when:

- Synthetic auth/profile bootstrap is approved.
- Disposable project isolation and teardown requirements are approved.
- Synthetic non-PII fixtures are defined.
- Expected view, trigger, function, storage, and RLS assertions are documented.
- Explicit authority is granted for disposable-project creation/configuration and SQL execution against that disposable project only.

## Final Recommendation

Terrer should proceed to **S2C preparation**, not S2C execution. The schema evidence is strong enough to design the disposable-project validation package, but the BLOCKED auth dependency and PARTIAL operational dependencies should be closed or explicitly accepted before any execution begins.
