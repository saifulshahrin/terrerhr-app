# Terrer — Current Execution Board

## Current Objective
Move Terrer toward a hands-off, agent-driven build workflow while continuing product refinement on the live app.

The immediate goal is NOT “finish everything.”
The immediate goal is to create a reliable execution loop where AI agents can:
- understand the product direction
- identify the next highest-value work
- propose a safe implementation plan
- implement in controlled iterations
- reduce manual involvement from the project owner

---

## Current Product State
Terrer app is already live in working form and already pulls data from Supabase.

Known working foundation includes, to varying degrees:
- app shell
- Supabase-backed screens
- Jobs page
- Candidates page
- Pipeline concepts
- Top Matches concepts
- Job Intake concepts
- Terrer AI Review concepts / flow
- live data integration in at least part of the UI

The product is now in:
- testing
- logic review
- UI review
- workflow refinement
- realignment toward actual recruiter usage

---

## North Star for Version 1
When Version 1 is considered ready for owner review, it should allow a realistic recruiter operating flow:

1. A recruiter can work from a dashboard/action-oriented app.
2. Recruiter can view operational jobs that Terrer is actively working on.
3. Recruiter can access candidate records from multiple candidate sources.
4. Recruiter can view Top Matches for a selected job.
5. Recruiter can shortlist / review / progress candidates through workflow.
6. Terrer AI Review is visible where appropriate.
7. Data shown is grounded in Supabase, not static mock assumptions.
8. UI supports decision-making, not just display.
9. Core flows work without obvious breakage or confusion.
10. Product feels like an early recruiter operating system, not a generic admin dashboard.

---

## Critical Product Realities
Terrer must support candidate inflow from multiple channels, including:
- manual candidate entry
- GitHub sourcing
- LinkedIn sourcing
- inbound job applications
- recruiter-uploaded candidates
- referrals
- future job-board applicants

Do not shape the product as if all candidates come from the same pipeline.

Terrer must also distinguish:
- raw market jobs / hiring intelligence jobs
vs
- operational jobs actively being worked by recruiters

Do not collapse those two concepts carelessly.

---

## Execution Rules
For every cycle, agents should:

1. Inspect current code and current behavior first.
2. Identify the most important next bottleneck.
3. Prefer workflow-critical fixes over cosmetic polish.
4. Propose a narrow implementation scope.
5. Explain impact across UI, data, and logic.
6. Avoid broad rewrites unless absolutely necessary.
7. Preserve working flows whenever possible.
8. Flag schema changes clearly.
9. Include rollback notes for risky work.
10. Keep changes aligned with Terrer strategy.

---

## Priority Order for Work Selection
When choosing what to work on next, prefer this order:

1. Broken or confusing recruiter workflow
2. Data / logic mismatch with Supabase reality
3. Missing end-to-end operating flow
4. Candidate-source architecture gaps
5. Jobs-to-TopMatches / recruiter action handoff issues
6. Submission / pipeline progression issues
7. UI clarity improvements on high-value pages
8. Secondary polish

---

## Current Likely Focus Areas
These are likely near-term work areas, depending on code inspection:

- clarify purpose and behavior of Candidates page
- distinguish candidate database vs active recruiter workflow
- tighten Jobs → Top Matches handoff
- validate recruiter action flow end to end
- review whether current app is showing mock records vs real Supabase records
- reduce confusion in dashboard / jobs / candidates page roles
- support more realistic candidate-ingestion thinking
- align UI with recruiter operating system logic

---

## Required Format for Any Proposed Change
Any implementation proposal should include:

### Summary
What is the issue and why it matters.

### Recommended Change
What should be changed.

### Files Likely Affected
List likely files or folders.

### Data / Schema Impact
State whether Supabase schema, views, RPCs, or queries are affected.

### Risks
What could break.

### Rollback
How to safely revert.

### Implementation Steps
Concrete ordered steps.

---

## Definition of a Good Iteration
A good iteration is one where:
- the scope is tight
- the logic is clearer than before
- the product becomes more operational
- the recruiter workflow improves
- the owner has fewer manual tasks afterward

---

## Current Standing Instruction
Behave like a strong product-minded technical lead for Terrer.

Do not behave like a generic coder optimizing isolated screens.

Always optimize for:
- recruiter effectiveness
- placement readiness
- data integrity
- automation readiness
- low owner effort