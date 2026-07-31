# Production-only migration ledger event 20260723143425

## Classification

`20260723143425_reconcile_candidate_engine_production_authorization` is an audited production-only migration-ledger event. It exists in the production environment and is absent from the staging environment.

It is not represented by a replay migration file in this repository-ledger restoration package.

## Authoritative ledger evidence

- Version: `20260723143425`
- Name: `reconcile_candidate_engine_production_authorization`
- Production statement count: `37`
- Production normalized SQL MD5: `f07c7ee2e1eaf811f0337b108bdc6e12`
- Staging row: absent

The hash normalization joins ledger statement-array elements with semicolons, appends the final semicolon, removes SQL whitespace and calculates MD5.

## Purpose

The event reconciled production from its then-current legacy authorization state to the intended Candidate Engine authorization state in one production-specific wrapper. It:

- verified required Candidate Engine tables and the preserved four-policy `profiles` contract;
- required `applications` to have zero policies before the wrapper;
- required named legacy `submissions` and `activity_log` policies;
- created or replaced `private.is_current_user_active_staff()`;
- granted the helper only to `authenticated` among the API roles;
- installed active-staff SELECT, INSERT and UPDATE policies on `applications`, `submissions` and `activity_log`;
- removed legacy, anonymous and DELETE policies from the affected Candidate Engine tables.

## Why it must not be replayed

The event has production-state preconditions that are false after the six shared Candidate Engine migrations:

- it expects `applications` to have zero policies;
- it expects legacy `submissions` and `activity_log` policies to exist;
- it creates `applications` policies without first dropping the shared-chain versions.

Replaying it after `20260723140703` would therefore fail its assertions or collide with existing policies. Placing it before the shared migrations would also create an invalid shared history because staging never recorded this version and the shared migrations already encode the canonical sequence.

## Final effects

The event produced authorization effects equivalent to the six shared Candidate Engine chain for:

- active-staff helper availability;
- authenticated helper execution boundary;
- three active-staff policies on each of `applications`, `submissions` and `activity_log`;
- absence of DELETE or ALL policies on those three tables.

It did not make staging and production globally schema-identical. Pre-existing structural and grant drift remains outside this restoration package.

## Future canonical reconciliation

Do not reuse version `20260723143425` with rewritten SQL. If a future canonical repository migration must reconcile or assert these effects, it must:

1. use a new timestamp;
2. be independently reviewed as forward-only SQL;
3. be state-independent or explicitly idempotent across the supported environments;
4. avoid assuming the production-only wrapper's legacy preconditions.

This note is non-executing audit documentation.
