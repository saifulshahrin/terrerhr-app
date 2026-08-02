# Canonical Launch Opportunity Publication Readiness — August 2026

## Decision

**BLOCKED — NOT PUBLICATION-READY.** Platform technical readiness for truthful canonical salary display is **COMPLETE**. The role, public employer identity and operating terms are approved for planning, but publication of this specific vacancy remains blocked because mandatory employer, legal and payroll gates are unresolved:

1. incorporation and employer/payroll readiness are unverified;
2. the actual contract-of-service terms, payroll treatment and statutory obligations require qualified Malaysian professional confirmation;
3. written employment terms are not yet ready.

The salary-truthfulness defect is closed. The merged backend contract exposes authoritative `CandidateOpportunity.salaryText: string | null`, and the merged web consumes it without estimation. Unified Opportunity production backend activation remains a separate operational gate and is not authorized by this document.

The former strict employer-confidentiality requirement is withdrawn for this Terrer-owned vacancy and is no longer a launch blocker. Future confidential-client opportunities remain a separate architecture feature.

This is a preparation and static-validation artifact, not legal advice or publication authorization. No production or staging data, schema, Auth, functions, secrets, CORS, Vercel configuration, or inventory was changed.

## Approved business facts

| Item | Decision |
|---|---|
| Internal employer | Agensi Pekerjaan TerrerHR Sdn Bhd, subject to incorporation/readiness proof |
| Public employer | TerrerHR |
| Public company description | Malaysia-first recruitment and hiring technology company |
| Title | Part-Time Marketing & Growth Coordinator |
| Location | Remote within Malaysia |
| Expected commitment | Target approximately 10 hours/week; planned ceiling 12 hours/week unless compensation and terms are reviewed again |
| Pattern | Flexible schedule around agreed responsibilities, deliverables and approval points |
| Proposed pay | RM1,000/month, subject to classification and compliance validation |
| Initial duration | Three months |
| Seniority | Coordinator-level, part-time; not CMO, Head of Marketing, Marketing Manager, or executive leadership |
| Start | Mutually agreed only after employer, contract and payroll readiness |
| Publication period | 30 days initially, with review before renewal |
| Reporting owner | Founder / S Shahrin |
| Language | Working proficiency in English and Bahasa Melayu required |
| Equipment | Candidate supplies a suitable laptop, internet connection and ordinary work tools |
| Expenses | Pre-approved business expenses reimbursed by TerrerHR against receipts |
| Other work/clients | Permitted if there is no conflict of interest, confidentiality breach or failure to meet agreed commitments |

## 1. Employer and legal-readiness gate

### Source basis and limits

This review uses current primary Malaysian sources available on 2026-08-02:

- [Minimum Wages Order 2024, P.U. (A) 376/2024](https://lom.agc.gov.my/ilims/upload/portal/akta/outputp/2541500/PUA%20376.pdf), Attorney General's Chambers Laws of Malaysia portal.
- [Employment Act 1955, Act 265, official consolidated text](https://lom.agc.gov.my/ilims/upload/portal/akta/outputaktap/1741197_BI/Act%20265_FINAL_as%20at%201%20Jan%202023%20(30.3.23).pdf), Attorney General's Chambers Laws of Malaysia portal.
- [Companies Commission of Malaysia](https://www.ssm.com.my/) for incorporation/company status.
- [Employees Provident Fund employer portal](https://www.kwsp.gov.my/en/employer/online-platform/i-akaun-employer) and [KWSP](https://www.kwsp.gov.my/) for employer/employee registration and contributions.
- [PERKESO employer/employee contributions](https://www.perkeso.gov.my/en/our-services/employer-employee/contributions.html), [PERKESO contribution rates](https://perkeso.gov.my/en/rate-of-contribution.html), and [ASSIST employer portal](https://assist.perkeso.gov.my/employer/login) for SOCSO/EIS administration.
- [Jabatan Tenaga Kerja Semenanjung Malaysia](https://jtksm.mohr.gov.my/en/home) for labour administration and current operational guidance.

The source review does not verify the specific company, payroll account, insurance registration, or proposed contract. Those require company documents and qualified professional review.

### Readiness matrix

| Gate | Status | Evidence and required closure |
|---|---|---|
| Legal incorporation | **USER CONFIRMATION REQUIRED** | No company number, SSM profile, certificate or incorporation date was supplied. Obtain and verify the SSM certificate/profile and legal name before creating the internal employer record. |
| Capacity to employ/sign | **USER CONFIRMATION REQUIRED** | Confirm directors/authorized signatory, registered employer details, bank/payroll ability, address and written-offer authority. |
| First-worker registrations | **USER CONFIRMATION REQUIRED** | Confirm required KWSP/EPF and PERKESO registrations, employee enrolment, payroll cycle, tax/PCB handling where applicable, and any sector/recruitment-licence implications before start. |
| Intended relationship | **READY FOR PLANNING; PROFESSIONAL CONFIRMATION REQUIRED** | Plan as employee-like / contract of service. The final agreement and working reality require qualified Malaysian payroll/employment review. Do not relabel as contractor to avoid obligations. |
| Minimum wage — hourly screen | **READY WITH CONDITION** | At 12 hours/week, average monthly hours are `12 × 52 ÷ 12 = 52`; RM1,000/52 ≈ **RM19.23/hour**. At 10 hours/week it is ≈ **RM23.08/hour**. Both exceed the Order's RM8.72 hourly schedule, provided all working time stays within the documented ceiling and no unpaid time is required. |
| Minimum wage — monthly/application basis | **USER CONFIRMATION REQUIRED** | RM1,000 is below the RM1,700 full monthly minimum. Whether and how the hourly/daily schedule or lawful part-time calculation applies depends on classification, normal hours and written terms. Obtain payroll/legal confirmation; do not rely only on the arithmetic above. |
| EPF/KWSP | **USER CONFIRMATION REQUIRED** | If a contract of service/employee relationship applies and the worker is within coverage, registration and contributions may be mandatory. Confirm worker category and current rates with KWSP/payroll adviser. |
| SOCSO and EIS | **USER CONFIRMATION REQUIRED** | Confirm coverage, registration and contribution treatment with PERKESO for the selected worker and arrangement. Do not infer exemption from part-time hours. |
| Payroll/payslip/written terms | **BLOCKED** | No approved written contract, payroll process, itemized pay statement process, time record, deduction treatment or payment date exists in evidence. Prepare before publication. |
| Leave/public holiday/rest-day/part-time rights | **USER CONFIRMATION REQUIRED** | If under a contract of service, confirm applicable Employment Act and part-time/casual employee treatment, including holidays, leave, rest days, overtime and records. At 10–12 hours/week the relationship may fall below the statutory part-time percentage threshold relative to a comparable full-time employee, so obtain qualified classification advice rather than assuming the Part-Time Employees Regulations apply. |
| Start-date condition | **READY** | Candidate copy and offer must keep start mutually agreed and conditional on incorporation, registrations, qualified review, signed terms and payroll readiness. |

### Worker-classification assessment

Current intended facts point more strongly toward a **contract of service / employee-like relationship** than a genuine independent business engagement:

| Factor | Current signal |
|---|---|
| Control/methods | Founder/designated-management guidance, draft approval and agreed responsibilities indicate meaningful control. |
| Hours | A recurring weekly target and hard planned ceiling are contemplated. |
| Supervision | Ongoing coordination and approvals are core duties. |
| Payment | Fixed recurring monthly RM1,000, not a price for a discrete project. |
| Integration | Marketing execution, content calendar, launch support and reporting are integrated into Terrer's ordinary operations. |
| Deliverables vs duties | Mix of deliverables and continuing duties; continuing duties dominate the proposed scope. |
| Exclusivity/other clients | Other work is permitted subject to conflicts, confidentiality and agreed commitments. |
| Equipment/expenses | Candidate supplies ordinary equipment; TerrerHR reimburses pre-approved business expenses against receipts. |
| Substitution/business risk | No right of substitution or independent profit/loss model is specified. |
| Remote/flexible work | Supports autonomy but is not decisive by itself. |

**Planning classification: employee-like / contract of service.** This user decision closes the planning-choice ambiguity but does not complete legal/payroll readiness. A qualified Malaysian employment or payroll professional must review the final agreement, wage basis, working-time controls, payroll treatment and statutory obligations before publication. The role must not be relabelled as an independent contractor merely to avoid those obligations.

## 2. Proposed publication-ready job specification

### English candidate copy

#### Part-Time Marketing & Growth Coordinator

**Employer:** TerrerHR

**Company:** Malaysia-first recruitment and hiring technology company

**Location:** Remote within Malaysia

**Commitment:** Target approximately 10 hours per week, with a planned maximum range of 10–12 hours per week

**Schedule:** Flexible around agreed responsibilities, deliverables and approval times

**Proposed compensation:** RM1,000 per month, subject to final classification, written terms and compliance validation

**Initial term:** Three-month part-time engagement; any renewal requires review and mutual written agreement

**Start:** To be mutually agreed after employer, contractual and payroll readiness

**Role purpose**

Support Terrer's early-stage marketing and growth execution under direct founder or designated management guidance. This is a coordinator-level execution role, not a marketing leadership position.

**Core responsibilities**

- Prepare and schedule approved social-media content.
- Adapt existing Terrer materials into simple candidate and employer communications.
- Support basic organic activity on LinkedIn, Instagram, TikTok or other specifically approved channels.
- Maintain a lightweight content calendar for the agreed weekly scope.
- Track basic reach, engagement, enquiries and content performance.
- Support defined launch campaigns and concise market research tasks.
- Coordinate drafts, factual checks and approvals with the designated Terrer representative.
- Prepare a concise periodic activity summary.

The role does not own company-wide strategy, executive marketing leadership, paid-media budgets, sales leadership or unrestricted brand decisions.

**Qualifications**

- Required working proficiency in English.
- Working proficiency in Bahasa Melayu for Malaysia-facing content.
- Comfortable with social media and simple design/content tools.
- Organized, dependable and able to complete agreed work independently.
- Basic familiarity with spreadsheets or simple reporting.
- Interest in recruitment, HR technology or early-stage companies.
- Students, fresh graduates and early-career applicants may be considered where legally and operationally appropriate.

Senior-management or executive-marketing experience is not required.

**Reporting**

Reports to the Founder / S Shahrin. The approval cadence must be stated in the written terms.

**Equipment, expenses and other work**

The employee supplies a suitable laptop, internet connection and ordinary work tools. TerrerHR reimburses pre-approved business expenses against receipts. Other work or clients are permitted provided there is no conflict of interest, confidentiality breach or failure to meet agreed commitments.

**Application and selection**

1. Submit or update a Terrer candidate profile.
2. Express interest using the approved action on this canonical opportunity.
3. Terrer reviews suitability; this does not automatically submit the candidate elsewhere.
4. Shortlisted candidates have a short introductory conversation.
5. A brief portfolio discussion or reasonable work sample may be requested only if necessary. It must not be unpaid productive work.
6. Final discussion and written offer, subject to employer and payroll readiness.

There is no applicant fee and no automatic submission to another employer.

**Employer identity copy**

> This is a TerrerHR-owned vacancy, not a confidential third-party client opportunity. The intended legal employer is Agensi Pekerjaan TerrerHR Sdn Bhd, subject to incorporation and employer-readiness confirmation. The full legal entity details will be included in formal employment discussions and written terms.

### Bahasa Melayu candidate copy

#### Penyelaras Pemasaran & Pertumbuhan Sambilan

**Majikan:** TerrerHR

**Syarikat:** Syarikat teknologi pengambilan dan penggajian berfokus Malaysia

**Lokasi:** Jarak jauh dalam Malaysia

**Komitmen:** Sasaran kira-kira 10 jam seminggu, dengan julat maksimum dirancang 10–12 jam seminggu

**Jadual:** Fleksibel berdasarkan tanggungjawab, hasil kerja dan masa kelulusan yang dipersetujui

**Cadangan bayaran:** RM1,000 sebulan, tertakluk kepada pengelasan, terma bertulis dan pengesahan pematuhan

**Tempoh awal:** Tiga bulan; sebarang pembaharuan memerlukan semakan dan persetujuan bertulis bersama

**Mula:** Dipersetujui bersama selepas majikan, kontrak dan penggajian bersedia

**Tujuan peranan**

Menyokong pelaksanaan pemasaran dan pertumbuhan peringkat awal Terrer di bawah bimbingan terus pengasas atau wakil pengurusan yang ditetapkan. Ini ialah peranan pelaksanaan peringkat penyelaras, bukan jawatan kepimpinan pemasaran.

**Tanggungjawab utama**

- Menyediakan dan menjadualkan kandungan media sosial yang telah diluluskan.
- Menyesuaikan bahan Terrer kepada komunikasi ringkas untuk calon dan majikan.
- Menyokong aktiviti organik asas di saluran yang diluluskan.
- Menyelenggara kalendar kandungan yang ringan.
- Menjejak capaian, penglibatan, pertanyaan dan prestasi kandungan asas.
- Menyokong kempen pelancaran dan penyelidikan pasaran ringkas yang ditetapkan.
- Menyelaras draf, semakan fakta dan kelulusan.
- Menyediakan ringkasan aktiviti berkala yang ringkas.

Peranan ini tidak memiliki strategi seluruh syarikat, kepimpinan pemasaran eksekutif, belanjawan media berbayar atau kepimpinan jualan.

**Kelayakan**

- Kemahiran kerja dalam bahasa Inggeris diperlukan.
- Kemahiran kerja dalam Bahasa Melayu diperlukan untuk kandungan yang ditujukan kepada pasaran Malaysia.
- Selesa menggunakan media sosial dan alat reka bentuk/kandungan mudah.
- Teratur, boleh dipercayai dan mampu menyiapkan kerja yang dipersetujui secara berdikari.
- Pengetahuan asas hamparan atau pelaporan mudah.
- Minat dalam pengambilan, teknologi HR atau syarikat peringkat awal.
- Pelajar, graduan baharu dan pemohon awal kerjaya boleh dipertimbangkan jika sesuai dari segi undang-undang dan operasi.

**Identiti majikan**

> Ini ialah kekosongan milik TerrerHR, bukan peluang pelanggan pihak ketiga yang dirahsiakan. Majikan sah yang dimaksudkan ialah Agensi Pekerjaan TerrerHR Sdn Bhd, tertakluk kepada pengesahan pemerbadanan dan kesediaan majikan. Butiran entiti sah penuh akan disertakan dalam perbincangan pekerjaan rasmi dan terma bertulis.

## 3. Publication data-path reassessment

### Static path

```text
public.jobs (`company_name = TerrerHR`, approved terms in description)
        ↓ job_id
public.candidate_web_jobs (published marker)
        ↓ service-role read in Edge Function
CandidateOpportunity DTO
        ↓ authenticated JSON
publicJobs mapping
        ├─ cards/search/My Matches/detail
        └─ canonical action → web_job_interest snapshot → My Activity
```

### Launch-specific findings

| Surface | Finding | Result |
|---|---|---|
| Employer identity | `jobs.company_name` flows consistently through the Edge Function, DTO, cards, search, details and interest snapshots. Using `TerrerHR` is truthful and approved. | **READY** |
| Legal entity disclosure | The public website may already name Agensi Pekerjaan TerrerHR Sdn Bhd. The withdrawn strict non-inference rule no longer conflicts with the bundle or metadata. Formal terms must identify the verified legal employer. | **READY WITH INCORPORATION CONDITION** |
| `jobs` content | Existing fields support title, public company, location, description, responsibilities, qualifications, seniority and operational metadata. Approved hours, pay, duration, schedule, equipment, expenses and conditions can be stated verbatim in `job_description_text`. | **SUPPORTED, UNSTRUCTURED** |
| `candidate_web_jobs` | Existing status and publication timestamp can gate initial publication. It has no expiry field, so the approved 30-day review must initially be an operational control. | **READY WITH MANUAL CONTROL** |
| Edge Function / DTO | Backend PR #7 merged at `be0157bb2fecb9ce9fe3d4e49227ced54a4cbadd`. Migration `20260802074653_add_canonical_compensation_text.sql` adds nullable `public.jobs.compensation_text` with no default, exposed unchanged as `CandidateOpportunity.salaryText: string | null`. | **TECHNICALLY COMPLETE; PRODUCTION ACTIVATION SEPARATELY GATED** |
| Candidate detail | Web PR #12 merged at `e0026aa9da3c0c5986fd8f0570ec7910d5ac1621`. Authoritative salary text is preserved exactly; null and invalid values use localized undisclosed states. Generated title, role-family, seniority, company, location and description-based estimates were removed. | **COMPLETE** |
| Responsibilities/qualifications | The unified mapping currently reduces canonical content to a summary and sets these fields to null. The approved description can still carry the copy, but detail quality is degraded. | **ENHANCEMENT, NOT A SAFETY BLOCKER** |
| Canonical action | Candidate interest remains candidate-owned and does not automatically create an application or submission. | **READY** |

### Salary-truthfulness implementation evidence

The mandatory salary repair is complete:

1. Backend PR #7 merged at `be0157bb2fecb9ce9fe3d4e49227ced54a4cbadd` with migration `20260802074653_add_canonical_compensation_text.sql`.
2. `public.jobs.compensation_text` is nullable text with no default and no generated or inferred value.
3. `CandidateOpportunity.salaryText: string | null` preserves valid strings and null exactly and rejects invalid canonical values safely.
4. Web PR #12 merged at `e0026aa9da3c0c5986fd8f0570ec7910d5ac1621`; automatic Vercel production deployment `dpl_5gNNmXCAgqkMhGeHVBpMyRGwuHid` is `READY`.
5. `RM1,000 per month` is preserved exactly. Null/invalid presentation is `Salary not disclosed` in English and `Gaji tidak dinyatakan` in Bahasa Melayu.
6. Verified surfaces include catalogue/search cards, opportunity detail, role-details modal, Featured Jobs, opportunity workspace, My Matches, saved opportunities/My Activity non-contradiction, metadata, and action/analytics isolation.
7. No candidate-facing generated estimate, title/role-family/seniority/company/location heuristic, or description parsing remains.

Focused evidence: backend compensation/query/auth tests **25 passed**; web salary truthfulness tests **8 passed**; unified opportunity web tests **4 passed**; unified opportunity i18n tests **4 passed**; focused TypeScript and changed-file ESLint passed; production web build passed.

No other mandatory platform technical blocker remains for representing and displaying this role accurately using the approved current fields. This does not authorize production backend activation, remote migration application or role insertion.

### Later enhancements, not launch blockers

- Add structured compensation, currency, pay period, employment type, target/maximum hours, duration and start-condition fields.
- Add `publication_expires_at` / `review_due_at` and automated 30-day unpublishing or review controls.
- Return full responsibilities, qualifications and seniority through the unified DTO.
- Add localized English/Bahasa Melayu publication fields rather than embedding both copies in one description.
- Add internal recruitment-owner and employer-ownership audit fields with appropriate access controls.
- Build separate confidential-employer publication fields and leak tests for genuine client vacancies. Do not impose that future architecture on this Terrer-owned launch role.
- Add BD-managed optional employer-confidentiality controls for genuine client vacancies.
- Build broader payroll or HR administration functionality separately; it is not required for truthful opportunity representation.

## 4. Exact proposed record mapping (no insert)

Only captured real columns are listed. `RUNTIME` means generated at an approved insertion; `WITHHELD` means do not populate until the relevant gate passes.

### `public.jobs`

| Column | Proposed value | Classification |
|---|---|---|
| `id` | RUNTIME opaque UUID | Supported |
| `external_job_url` | `null` | Supported; this is not an external vacancy |
| `job_title` | `Part-Time Marketing & Growth Coordinator` | Supported |
| `company_name` | `TerrerHR` | Supported and approved public employer display |
| `location` | `Remote — Malaysia` | Supported |
| `posted_date` | WITHHELD; approved publication date in unambiguous ISO text | Supported but weakly typed |
| `source` | `terrer_internal` | Supported |
| `source_company_id` | `null` | Supported; no external source company |
| `extracted_at` | `null` | Supported; not scraped |
| `job_id` | `null` | Supported; no external source job |
| `company_id` | WITHHELD until incorporation is confirmed and the correct existing company record is verified | Optional internal linkage; not a public confidentiality gate |
| `updated_at` | RUNTIME | Supported |
| `operational_status` | `active` only after employer/readiness gates pass; otherwise `not_started` | Supported |
| `last_seen_at` | RUNTIME publication verification time | Supported |
| `freshness_status` | `current` only after approved publication check | Supported but vocabulary requires confirmation |
| `market_cluster` | `null` | Supported; unnecessary |
| `is_market_signal_eligible` | `false` | Supported; this is an operational internal vacancy, not raw market intelligence |
| `market_signal_exclusion_reason` | `internal_canonical_recruitment` | Supported |
| `job_source_id` | `null` | Supported; no external source |
| `normalized_job_title` | `part-time marketing growth coordinator` | Supported |
| `role_family` | `Marketing / Growth` | Supported |
| `seniority` | `Coordinator / Early career` | Supported |
| `job_description_html` | `null` unless safely generated from approved copy | Supported |
| `job_description_text` | Approved public specification, including employer, pay, hours, duration, schedule, equipment, expenses and conditional start | Supported, but API truncates it to summary |
| `responsibilities` | Approved responsibility bullets as newline-separated text | Supported, but current Edge DTO does not return it |
| `qualifications` | Approved qualification bullets as newline-separated text | Supported, but current Edge DTO does not return it |

### `public.candidate_web_jobs`

| Column | Proposed value | Classification |
|---|---|---|
| `id` | RUNTIME opaque UUID | Supported |
| `job_id` | RUNTIME FK to the approved `jobs.id` | Supported |
| `status` | `hidden` until every checklist item passes; then `published` | Supported and fail-closed |
| `is_featured` | `false` for initial controlled release | Supported |
| `display_order` | `null` | Supported |
| `published_at` | WITHHELD until final publication approval | Supported |
| `created_at` / `updated_at` | RUNTIME | Supported |

### Required concepts absent from real schema

| Required concept | Current treatment | Required action |
|---|---|---|
| Public employer description | Can be embedded in description | Later structured projection enhancement |
| Work arrangement/employment type | Can be embedded in description | Later structured schema/API enhancement |
| Compensation/currency/visibility | Authoritative text is supported by nullable `compensation_text` and exposed as `salaryText`; the web renders it truthfully | Complete for launch; structured amount/currency/cadence remains a later enhancement |
| Hours min/target/max | Can be embedded in description | Later structured schema/API enhancement |
| Duration/start condition | Can be embedded in description | Later structured schema/API enhancement |
| Publication expiry/review date | Absent | Manual 30-day review initially; later schema/automation enhancement |
| Internal owner | Absent on job/publication | Operationally record Founder / S Shahrin; later metadata enhancement |
| Confidentiality flag | Not required for this Terrer-owned role | Later feature for genuine confidential-client vacancies |
| Internal employer ownership | `jobs.company_id` exists but lacks a captured FK | Later data-integrity enhancement; verify any linkage only after incorporation |
| BM copy | No canonical localized content fields | Can be included in description initially; later localization enhancement |

No insert SQL is supplied. The role must remain absent until incorporation, contract/payroll/statutory readiness and the salary-truthfulness repair all pass.

## 5. Candidate trust review

| Test | Result |
|---|---|
| Seniority is proportionate | Pass: coordinator/early-career; banned leadership titles excluded. |
| Workload is genuinely part-time | Pass with condition: duties are scoped to 10 hours target/12-hour ceiling; channel and campaign priorities must be limited. |
| Outcomes are realistic | Pass: no leadership or career promise. |
| Compensation is visible | Pass: authoritative `RM1,000 per month` can flow through `salaryText` unchanged; undisclosed values use truthful EN/BM states and no estimate remains. |
| Employer wording is honest | Pass: public employer is TerrerHR and the copy explicitly says this is not a confidential third-party client vacancy. |
| Readiness is not overstated | Pass: start and offer remain conditional. |
| Work sample is fair | Pass with condition: brief/non-productive only. |
| Data collection is proportionate | Pass: use existing Terrer profile; no extra sensitive data requested. |
| Canonical action is truthful | Pass: express interest creates candidate-owned interest/review state, not automatic external submission. |

## 6. Fail-closed acceptance checklist

| # | Mandatory gate | Status | Closure evidence |
|---:|---|---|---|
| 1 | Employer legally ready | **USER CONFIRMATION REQUIRED** | SSM and signatory evidence |
| 2 | Worker classification approved | **READY FOR PLANNING; BLOCKED FOR PUBLICATION** | Employee-like / contract-of-service planning decision recorded; final agreement and qualified review required |
| 3 | Pay and maximum hours compliant | **READY WITH CONDITION** | Payroll/legal validation and enforceable time ceiling |
| 4 | Written terms ready | **BLOCKED** | Signed-off contract template |
| 5 | EPF/SOCSO/EIS treatment confirmed | **USER CONFIRMATION REQUIRED** | Registration/contribution determination |
| 6 | Responsibilities proportionate | **READY** | Specification above |
| 7 | Qualifications proportionate | **READY** | Specification above |
| 8 | Duration approved | **READY** | Three-month initial duration approved |
| 9 | Reporting line approved | **READY** | Founder / S Shahrin |
| 10 | Start process approved | **READY** | Mutually agreed after all readiness gates |
| 11 | Application process approved | **READY** | Canonical candidate-owned flow above |
| 12 | Employer identity truthful | **READY WITH INCORPORATION CONDITION** | Public TerrerHR display; verified legal entity in formal terms |
| 13 | Public employer is TerrerHR | **READY** | User decision recorded |
| 14 | Confidentiality architecture | **NOT APPLICABLE TO THIS ROLE** | Preserve as a later feature for genuine confidential-client vacancies |
| 15 | Salary display is employer-supplied | **READY** | Backend `be0157b`; web `e0026aa`; exact value/null/invalid and cross-surface regression tests passed |
| 16 | Canonical action lifecycle truthful | **READY** | Static API/action audit; runtime acceptance still required |
| 17 | EN/BM candidate copy available | **READY WITH CONDITION** | Both copies prepared; structured localization remains an enhancement |
| 18 | Publication period approved | **READY WITH MANUAL CONTROL** | 30 days initially; record publication date and review before renewal |
| 19 | Internal recruitment owner assigned | **READY** | Founder / S Shahrin |
| 20 | Final publication approval recorded | **BLOCKED** | Approval after all gates pass |
| 21 | Unified Opportunity production backend activation | **SEPARATELY GATED; NOT AUTHORIZED** | Requires an explicit production activation task; this document changes no environment |

## 7. Unresolved user decisions

1. Confirm Agensi Pekerjaan TerrerHR Sdn Bhd is legally incorporated.
2. Verify the legal name and SSM details against authoritative company records.
3. Confirm an authorized signatory exists.
4. Confirm readiness to issue written employment terms.
5. Complete qualified Malaysian payroll/employment review of the actual contract-of-service arrangement.
6. Confirm the RM1,000 monthly wage basis, 10-hour target/12-hour ceiling and enforceable working-time controls.
7. Confirm payroll, payslips, tax/PCB and timekeeping readiness.
8. Confirm EPF/KWSP, SOCSO and EIS treatment for the selected employee and arrangement.
9. Confirm leave, public-holiday, rest-day, overtime and recordkeeping treatment.
10. Select the actual publication date.
11. Set the review date 30 days after publication before any renewal.
12. Record final publication approval only after every mandatory gate is READY.

## Final classification

**BLOCKED — NOT PUBLICATION-READY.** Platform technical readiness for salary truthfulness is **COMPLETE**, and no other mandatory platform technical blocker remains for accurately representing and displaying the approved role with the current fields. The title, three-month duration, hours, pay, location, schedule, reporting line, language requirements, equipment, expenses, outside-work rule and public TerrerHR identity are approved. Strict employer confidentiality is not a blocker for this vacancy.

Publication must still wait for verified incorporation/legal name/SSM details, authorized signatory, readiness to issue written employment terms, qualified Malaysian payroll/employment review, confirmed wage basis and working-time controls, payroll/payslip/tax/PCB/timekeeping readiness, EPF/KWSP/SOCSO/EIS treatment, leave/public-holiday/rest-day/overtime/recordkeeping treatment, the actual publication date, the 30-day review date, and recorded final publication approval.

Unified Opportunity production backend activation remains separately gated and unauthorized by this documentation task. No production or staging migration, Edge Function deployment, opportunity insertion, Auth, secret, CORS, Supabase or Vercel configuration change is authorized.
