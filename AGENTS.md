# Terrer — Agent Operating Instructions

## Mission
Build Terrer into a best-in-class, Malaysia-first, data-driven recruitment engine with a marketplace front.

Terrer is NOT just a job board.
Terrer is:
- a hiring intelligence engine
- a recruiter operating system
- a candidate sourcing and matching engine
- a placement business platform

## Strategic Priorities
1. Prioritize workflow over polish.
2. Prioritize revenue-enabling recruiter execution over generic marketplace features.
3. Keep WordPress as frontend shell, not source of truth.
4. Keep Supabase as canonical backend/data layer.
5. Build for automation-first and low manual effort.
6. Avoid overengineering.
7. Prefer real working flows over impressive mock features.
8. Malaysia-first assumptions unless explicitly stated otherwise.

## Current Product Direction
Terrer should support:
- messy job intake
- structured jobs
- structured candidates
- candidate sourcing from multiple channels
- job-to-candidate matching
- recruiter review
- candidate submission workflow
- pipeline tracking
- BD / recruiter operating workflow

## Current Architecture Principles
- WordPress = presentation / workflow shell
- Supabase = canonical data + auth + app backend
- GitHub = version control and durable project memory
- App layer = internal recruiter / BD operating system
- Web layer = marketplace / employer-facing shell

## Candidate Sources
Terrer must be designed to support candidates from:
- manual entry
- GitHub sourcing
- LinkedIn sourcing
- inbound job applications
- recruiter-uploaded candidates
- referrals
- future job board applicants

Do not design candidate flow as if candidates only come from one source.

## Key Product Principles
- Distinguish operational jobs from raw market-intelligence jobs.
- Distinguish pipeline metrics from match potential.
- UI must help decisions, not just display data.
- Code defensively for nulls, dates, stale records, and missing relationships.
- Small changes must avoid breaking working flows.
- Prefer targeted edits over broad rewrites.

## Current Known Direction for App Layer
Priority screens:
- Dashboard
- Jobs
- Candidates
- Pipeline
- Top Matches
- Job Intake

App should behave like a recruiter operating system, not a static admin panel.

## Matching Philosophy
Terrer should evolve into:
- Layer 1 = rules / scoring / filtering
- Layer 2 = AI reasoning / ranking
- Voice layer = recruiter-style submission output

Use the label:
- "Terrer AI Review"

Do not use:
- "Layer 2 AI Review"

## Workflow Philosophy
When improving the product:
1. Understand the current working behavior first.
2. Do not casually replace large working blocks.
3. Prefer minimal-risk edits.
4. Preserve existing working flows unless explicitly upgrading them.
5. When changing schema or queries, trace impact across UI and backend.

## Delivery Standard
Every implementation proposal should include:
- what is changing
- why it is changing
- files affected
- schema impact
- risks
- rollback approach
- exact implementation steps

## What to Optimize For
Optimize for:
- recruiter speed
- placement readiness
- operational clarity
- future automation
- low manual involvement from project owner

## What to Avoid
Avoid:
- premature scaling architecture
- cosmetic redesigns before workflow clarity
- generic CRM behavior that weakens Terrer’s edge
- treating WordPress tables as canonical business data
- assuming scraped jobs and active recruiter jobs are the same thing

## Default Agent Mode
When uncertain, choose the path that:
- improves recruiter execution
- keeps architecture clean
- reduces manual work
- preserves future automation potential
- aligns with Terrer as a data-driven recruitment engine with a marketplace front