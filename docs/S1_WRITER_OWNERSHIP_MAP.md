# Phase S1.2 Writer Ownership Map

Date: 7 June 2026  
Mode: documentation only

## Role Interpretation

- Browser writers use the Supabase anon client.
- In demo mode they execute as `anon`.
- In strict mode with a session they execute as `authenticated`.
- Service-role and external writers may bypass RLS.
- “Unknown” is a blocking dependency for production security changes.

## Canonical Writer Matrix

| Object | Application writer | Browser writer | Server/API or DB writer | External/unknown writer | Anon dependency | Auth dependency | RLS sensitivity | Recommended future owner |
|---|---|---|---|---|---|---|---|---|
| `profiles` | No current insert UI | Own/admin update possible | Auth provisioning unknown | Profile bootstrap unknown | No intended | Critical | Critical | Auth provisioning service plus admin role management |
| `companies` | BD Relationships, BD Photo Intake | Insert/update | Service-role BD importer; seed SQL | Company enrichment writer possible | Read in demo | Insert/read | High | Authenticated BD app; importer via service role |
| `bd_contacts` | BD Relationships, Tasks, Photo Intake | Insert/update | Service-role importer; seed SQL | None known | Read/update in demo | Insert/read/update | Critical | Authenticated BD app; controlled importer |
| `bd_notes` | BD Relationships | Insert | None | None | No | Required | High | Authenticated user-owned notes |
| `job_sources` | None | None | Seed SQL | Source-health ingestion unknown | Read | Read | High | Ingestion/service role; app read-only |
| `jobs` | Job Intake, Jobs status editor | Insert/update | AI classifier script; seed SQL | External scraper/ingestion unknown | Insert/read/update | Insert/read/update | Critical | Ingestion service for market jobs; authenticated recruiter transaction for operational jobs |
| `jobs_intake` | Job Intake | Insert | None | None | Insert/read in demo | Insert/read | Critical | Protected transaction/RPC owned by recruiter app |
| `job_requirements` | No current writer | None | Seed SQL | Parser/ingestion writer unknown | Current policies allow writes | None proven | Critical | Protected job-intake/parser transaction |
| `candidates` | Manual intake, Admin Resume Import | Insert/update/delete compensation | Seed SQL | Other candidate channels expected | Depends on RLS-disabled broad grants | Intended authenticated | Critical | Authenticated intake service supporting multiple source channels |
| `source_profiles` | Manual intake | Insert/delete compensation | Seed SQL | Sourcing writer unknown | Depends on broad grants | Intended authenticated | Critical | Candidate ingestion service |
| `skills` | None | None | None | Taxonomy producer unknown | Broad-grant exposure | Unknown | Critical | Controlled taxonomy service/admin |
| `candidate_skills` | Manual intake attempts invalid write | Insert/delete compensation | None | Normalized producer unknown | Insert/update currently allowed | Not proven | Critical | Candidate ingestion/scoring service using normalized IDs |
| `candidate_scores` | Manual intake | Insert/delete compensation | Seed SQL | Scoring writer unknown | Depends on broad grants | Intended authenticated | Critical | Matching/scoring service |
| `candidate_capabilities` | None | None | None | Producer unknown | Broad-grant exposure unknown | Unknown | Critical | Matching enrichment service |
| `evidence_signals` | None | None | None | Producer unknown | Broad-grant exposure unknown | Unknown | High | Candidate evidence/enrichment service |
| `ai_assessments` | Top Matches | Insert/update/upsert | Seed SQL | None known | Current demo write | Future authenticated | Critical | Protected Terrer AI Review service or authenticated app endpoint |
| `submissions` | Candidate, Top Matches, Pipeline, BD actions | Upsert/update/delete | `create_submission_with_activity`; triggers; seed SQL | None known | Current central dependency | Future authenticated | Critical | Protected recruitment execution transaction layer |
| `activity_log` | No direct current page writer | None found | Submission function and triggers | Activity producer unknown | Current anon insert | Not established | Critical | Protected execution/activity service |
| `web_candidate_intakes` | Web intake library | Public insert | None | External web shell likely | Intended narrow insert | Internal read | Critical | Public validated intake API; authenticated recruiter read |
| `web_job_interest` | Interested Candidates updates | Public insert/update today | None | External web creator unknown | Critical current dependency | Internal review expected | Critical | Public interest API plus authenticated recruiter review |
| `autonomous_recruiter_runs` | Read only | None | Seed SQL | Autonomous runner unknown | Demo read only | Insert/read | High | Autonomous recruiter service role |
| `autonomous_recruiter_memory` | Read only | None | None | Autonomous runner unknown | No intended | Insert/read | High | Autonomous recruiter learning service |

## View and Function Ownership

| Object | Writer/effect owner today | Recommended future owner |
|---|---|---|
| `vw_candidate_search` | Upstream candidate/scoring/enrichment writers | Candidate Intelligence read-model owner |
| `vw_candidate_search_clean` | Upstream candidate view | Candidate Intelligence stable API contract |
| Pipeline reporting views | Submission/activity writers | Recruitment Execution reporting owner |
| Jobs/source views | Job ingestion and source-health writers | Demand Intelligence reporting owner |
| `create_submission_with_activity` | Callable by broad roles; no repository caller | Protected Recruitment Execution RPC |
| `is_current_user_admin` | Profiles and auth identity | Platform authorization owner |
| Activity synchronization triggers | Any activity insert | Recruitment Execution domain logic |
| Updated-at triggers | Table mutation | Platform schema support |

## Storage Writer Ownership

| Bucket | Application writer | Browser role today | Unknown/external writer | RLS sensitivity | Recommended future owner |
|---|---|---|---|---|---|
| `candidate-resumes` | Candidates, Admin Resume Import, web candidate intake | Anon/auth upload; authenticated read | External web intake expected | Critical | Public validated upload endpoint plus authenticated candidate operations |
| `bd-photo-intake` | BD Photo Intake | Authenticated | None known | Critical | Authenticated BD processing workflow with owner/path scope |
| `resumes` | None found | Anon insert allowed | Unknown | High | Freeze pending consumer identification |

## Writer Ownership Blockers

Production RLS or constraint changes must wait until owners are identified for:

1. External job ingestion and source-health metrics.
2. Skill taxonomy and normalized candidate-skill generation.
3. Candidate scoring, capabilities, and evidence signals.
4. Web job-interest creation.
5. Autonomous recruiter runs and memory.
6. Any direct activity-log producer.
7. `resumes` bucket.

## Recommended Future Write Architecture

- **Public intake:** narrow server-validated endpoints for candidate intake, job interest, and approved uploads.
- **Internal recruiter actions:** authenticated users through least-privilege tables or protected RPCs.
- **Ingestion/enrichment:** named service-role jobs with versioned payload contracts.
- **Matching/AI:** service-owned writes for scores, capabilities, evidence, and assessments.
- **Recruitment execution:** transaction/RPC boundary for submissions and activities.
- **Taxonomy:** controlled service/admin ownership; no open browser creation.

