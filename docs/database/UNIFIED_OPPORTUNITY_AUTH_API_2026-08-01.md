# Unified Opportunity authenticated API boundary

Date: 2026-08-01

Branch: `feature/unified-opportunity-auth-api-2026-08`

## Decision

Use one Supabase Edge Function named `unified-opportunities`. This follows the
repository's established serverless platform and avoids adding another backend
framework. The function is deployed with platform JWT verification enabled and
also verifies the access token with Supabase Auth inside the handler.

The service-role key remains in the Edge Function environment. It is never
returned, logged or sent to the browser.

## Authentication and candidate identity

1. The browser sends its Supabase user access token as `Authorization: Bearer`.
2. Supabase platform `verify_jwt` rejects missing or invalid tokens before the
   function runs.
3. The handler calls `auth.getUser(accessToken)` and requires a confirmed email.
4. A second Supabase client carries that exact user token when selecting
   `candidates`. Existing verified-email RLS limits results to owned rows.
5. Zero rows returns `403 candidate_onboarding_required`; multiple rows return
   `409` and fail closed.
6. Candidate IDs supplied by a browser are rejected. The resolved database ID
   is the only candidate identity used by catalogue and review queries.

## CORS

`TERRER_WEB_ALLOWED_ORIGINS` is a comma-separated Edge Function secret containing
exact origins. Missing configuration fails function startup. Disallowed or
missing origins receive `403` without an allow-origin header. Wildcard CORS is
not used. `OPTIONS` returns `204` only for a configured origin.

Do not add `https://terrerhr.com` until production use is explicitly approved.
Set the exact Vercel staging/preview origin before staging validation.

## Contract

### GET `/functions/v1/unified-opportunities`

Requires `Authorization`, `apikey` and an approved `Origin`.

Success:

```json
{
  "opportunities": [
    {
      "id": "external:pilot:software:dassault-systemes:548642",
      "sourceId": "pilot:software:dassault-systemes:548642",
      "origin": "external",
      "title": "Software Engineer (Platform Development)",
      "company": "Dassault Systèmes",
      "location": "Petaling Jaya, Selangor",
      "summary": null,
      "sourceUrl": "https://www.3ds.com/careers/jobs/software-engineer-platform-development-548642",
      "publishedAt": "2026-06-15T00:00:00Z",
      "discoveredAt": "2026-08-01T00:00:00Z",
      "lastVerifiedAt": "2026-08-01T00:00:00Z",
      "roleCluster": "software",
      "matchScore": null,
      "matchReasons": [],
      "actions": {
        "interest": { "kind": "unavailable", "available": false, "reason": "External opportunities cannot create canonical interest" },
        "source": { "kind": "external_source", "available": true, "url": "https://www.3ds.com/careers/jobs/software-engineer-platform-development-548642" },
        "review": { "kind": "external_review", "available": true }
      }
    }
  ]
}
```

The response excludes reviewer identity, internal notes, private source metadata
and candidate data. Canonical and external rows retain separate IDs and action
capabilities. Exact normalized source-URL duplicates keep the canonical row;
uncertain title/company/location similarities keep both. Ranking uses trusted
match score, freshness and common-field completeness, never origin.

### POST `/functions/v1/unified-opportunities`

Body:

```json
{ "externalOpportunityId": "pilot:software:dassault-systemes:548642" }
```

No other request fields are accepted. The function loads the eligible external
record, creates deterministic evidence from server-read candidate and opportunity
fields, then invokes `create_external_opportunity_review_trusted` with the
service role. The database unique constraint and RPC conflict handling make
retries idempotent.

Success:

```json
{
  "review": {
    "id": "review-uuid",
    "externalOpportunityId": "pilot:software:dassault-systemes:548642",
    "status": "requested",
    "matchScore": 70,
    "matchReasons": ["Target or current role aligns with the opportunity title."],
    "requestedAt": "2026-08-01T00:00:00Z",
    "updatedAt": "2026-08-01T00:00:00Z"
  },
  "message": "Terrer has recorded your request for review.",
  "applicationStatus": "not_an_application",
  "employerSubmissionStatus": "not_submitted"
}
```

The function contains no write path for `web_job_interest`, applications,
submissions, Confirm Interest or representation records.

## Deployment and rollback

Staging deployment only:

1. Configure `TERRER_WEB_ALLOWED_ORIGINS` with the exact preview origin.
2. Deploy `unified-opportunities` to project `nulpvbirlhauukccunqg` with JWT
   verification enabled.
3. Test with a staging Supabase Auth user whose confirmed email maps to exactly
   one staging candidate.
4. Confirm repeated POSTs return the same review ID and canonical workflow table
   counts remain unchanged.

Rollback deletes only the Edge Function deployment. This change has no migration
or production deployment.

## Final staging integration validation

Validated on 2026-08-01 against the approved staging Supabase project only:

- Supabase project: `nulpvbirlhauukccunqg` (`terrer-security-staging-2026-07`)
- Edge Function: `unified-opportunities`, active version 1, JWT verification enabled
- Vercel preview origin:
  `https://terrer-9vbizi5bp-saifulshahrin-8466s-projects.vercel.app`
- `TERRER_WEB_ALLOWED_ORIGINS` contains that exact preview origin only; no
  production origin was added.

An isolated confirmed staging Auth user was mapped by verified email to one
staging candidate. The endpoint received no candidate ID from the test client.
A clearly labeled staging-only canonical job publication was added because the
staging project previously contained zero published canonical web jobs. This
allowed the live catalogue to prove both lifecycle types alongside the four
approved pilot opportunities.

Live browser-style validation results:

| Check | Result |
| --- | --- |
| `OPTIONS` from exact Vercel origin | `204`; exact `Access-Control-Allow-Origin` |
| Authenticated `GET` | `200`; JWT and confirmed candidate mapping accepted |
| Unified catalogue | 5 rows: 1 canonical + 4 external pilots |
| Sensitive response scan | no candidate ID, internal review notes, reviewer identity, source reference ID, password or auth metadata |
| First review `POST` | review returned with `requested` status |
| Second identical `POST` | same review ID returned |
| Database review cardinality | exactly 1 row and 1 distinct review ID for candidate/opportunity |
| Review ownership | candidate ID and external opportunity ID matched the server-resolved fixture |
| Canonical interest / Confirm Interest | 0 rows |
| Applications | 0 rows |
| Submissions | 0 rows |
| Representation requests | 0 rows |
| Candidate-facing confirmation | `not_an_application`, `not_submitted` |

The external review created by this validation targets
`pilot:software:dassault-systemes:548642`. Staging fixture IDs are deliberately
stable for audit and optional cleanup:

- Auth user: `10000000-0000-4000-8000-000000000001`
- Candidate: `20000000-0000-4000-8000-000000000001`
- Canonical job: `30000000-0000-4000-8000-000000000001`
- Canonical publication: `40000000-0000-4000-8000-000000000001`

No production project, production origin, production deployment or production
record was read or changed during this validation.
