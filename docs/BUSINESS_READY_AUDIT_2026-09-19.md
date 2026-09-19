# Terrer business-ready audit — 19 September 2026

## Executive decision

Terrer can accept a genuine client job description and run the first half of the recruitment workflow, but it is not yet a complete placement-to-cash operating system.

The immediate launch path is **controlled pilot**, not unrestricted production operation. One trained Admin/BD user should supervise every client submission until the remaining close, billing and guarantee controls exist.

## Verified current state

| Capability | State | Evidence / consequence |
|---|---|---|
| Production authentication | Ready | Production bundle uses strict Supabase authentication; role preview is not active. |
| Client/JD intake | Ready for pilot | Jobs support structured intake and PDF, DOCX or TXT job-description files. |
| Placement authority and terms | Ready for pilot | `placement_job_orders` records authority, fee, payment terms and guarantee; Admin approval is required. |
| Candidate records | Ready for pilot | Live candidate reads and resume import exist. No candidate rows currently exist in production. |
| Recruiter shortlist and brief | Ready for pilot | Recruiter output moves to `ready_for_bd_review`. |
| Candidate consent | Ready for pilot | Exact candidate/job/client consent evidence is recorded before submission. |
| Client submission | Guarded | Database blocks submission without both approved order and matching consent. |
| Interview operations | Partial | Pipeline stage exists, but structured scheduling, participants and feedback are absent. |
| Offer and acceptance | Partial | Pipeline stage exists, but structured offer terms, acceptance and evidence are absent. |
| Placement closure | Missing | No canonical placement/start record or fee crystallisation event. |
| Invoice and collection | Missing | No invoice, payment, overdue or credit-note ledger. |
| Guarantee/replacement | Missing | Guarantee days are captured in the order, but no live guarantee case workflow exists. |
| Management reporting | Partial | Operational dashboard exists; placement revenue, aged receivables and realised margin do not. |

## Canonical first-client workflow

1. Admin/BD creates the company/contact and job from the hiring manager's email and attached JD.
2. Admin records a Placement Order with the authority evidence, agreed fee, payment terms and guarantee.
3. Founder/Admin approves the order. Terms become immutable; corrections require a replacement order.
4. Recruiter sources/imports real candidates, reviews matches and shortlists.
5. Recruiter creates the candidate brief and sends it to BD Review, not directly to the client.
6. BD records the candidate's explicit consent for that exact client and role.
7. BD submits only when both the approved Placement Order and consent are present. The database issues an immutable submission reference and protection dates.
8. BD/Recruiment records client feedback and advances interview, offer, hired or rejection stages.
9. Until the remaining finance module is built, placement, invoice, payment and guarantee events must be controlled outside Terrer and reconciled manually.

## Defect corrected in this branch

The dashboard previously exposed a direct “Approve & Submit to Client” action that did not collect consent or show the Placement Order prerequisite. The database correctly rejected unsafe attempts, but the app presented a broken path.

This branch routes dashboard approvals to the full BD Review screen, shows Placement Order readiness there, disables final submission until both prerequisites are present, and removes unused client-submission methods that could bypass the intended app flow.

## Production observations

- The production database currently has one job and one intake record, but no candidates, submissions, placement orders or consent records.
- Row-level security is enabled on the inspected application tables.
- Security advisors still report legacy RLS tables with no policies, mutable `search_path` warnings on older functions, and disabled leaked-password protection.
- The anonymous public-opportunity RPC is intentionally narrow and exposes a fixed safe catalogue; its security-definer advisory is therefore an accepted, documented boundary rather than an automatic defect.
- No production schema, data, authentication setting or deployment was changed during this audit.

## Prioritised remaining work

### P0 — controlled pilot acceptance

- Run one synthetic end-to-end rehearsal: intake → approved order → candidate → shortlist → BD review → consent → client submission.
- Add clear surfaced error feedback for failed stage changes; several store actions currently return `null` after logging.
- Remove remaining temporary console diagnostics from recruiter actions after the rehearsal.
- Enable leaked-password protection through the Supabase Auth control plane.
- Remediate or explicitly retire the legacy no-policy tables and pin safe search paths on legacy functions through a reviewed migration.

### P1 — placement-to-cash

- Add structured interviews and feedback.
- Add structured offers and acceptance evidence.
- Add a canonical placement record with start date, salary/fee basis and calculated fee.
- Add invoice, receipt, overdue, credit-note and write-off records.
- Add guarantee monitoring, replacement/refund outcomes and alerts.

### P2 — scale and automation

- Inbound email ingestion instead of manual upload/reference entry.
- Automated client/candidate communications with approval and audit history.
- Revenue, receivables, conversion and guarantee dashboards.
- Formal backup/restore rehearsal, incident runbook and data-retention controls.

## Release gates

The branch is eligible for preview only when typecheck, production build and the full repository test set pass. Production remains a separate owner-approved decision after a synthetic rehearsal. Rollback is a normal Vercel deployment rollback for app changes; this branch contains no production database mutation.
