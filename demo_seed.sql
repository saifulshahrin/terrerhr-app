-- Terrer Stakeholder Demo Seed Dataset
-- Scope: Jobs / Top Matches / Candidate Profile / Pipeline / BD Queue / Autonomous Recruiter
-- Marker: DEMO_SEED
--
-- IMPORTANT
-- - Do NOT run this in production without confirming rollback readiness.
-- - This script is designed to be re-runnable:
--     - It deletes prior DEMO_SEED rows by marker (safe, targeted)
--     - Then inserts a controlled dataset with fixed UUIDs
-- - Rollback script: rollback_demo_seed.sql
--
-- Recommended execution:
--   1) demo_seed.sql
--   2) verify app pages
--   3) rollback_demo_seed.sql (when done)

begin;

-- ---------------------------------------------------------------------------
-- 0) Housekeeping: remove prior demo rows by marker (keeps script idempotent)
-- ---------------------------------------------------------------------------

-- AI assessments (marker = model_used OR reasoning_summary)
delete from public.ai_assessments
where model_used = 'demo_seed'
   or reasoning_summary ilike '%DEMO_SEED%';

-- Pipeline submissions (marker = notes)
delete from public.submissions
where notes ilike '%DEMO_SEED%';

-- Job requirements (marker = notes)
delete from public.job_requirements
where notes ilike '%DEMO_SEED%';

-- Candidate scores (marker = score_reason)
delete from public.candidate_scores
where score_reason ilike '%DEMO_SEED%';

-- Source profiles (marker = source_name or URL marker)
delete from public.source_profiles
where source_name = 'demo_seed'
   or source_profile_url ilike '%DEMO_SEED%';

-- Candidates (marker = source_type or notes)
delete from public.candidates
where source_type = 'demo_seed'
   or notes ilike '%DEMO_SEED%';

-- Jobs (marker = source)
delete from public.jobs
where source = 'demo_seed';

-- Job sources (marker = source_type or notes)
delete from public.job_sources
where source_type = 'demo_seed'
   or notes ilike '%DEMO_SEED%';

-- BD contacts (marker = source or notes)
delete from public.bd_contacts
where source = 'demo_seed'
   or notes ilike '%DEMO_SEED%';

-- BD companies (marker = source_type or notes)
delete from public.companies
where source_type = 'demo_seed'
   or notes ilike '%DEMO_SEED%';

-- Autonomous recruiter runs (marker = mode OR JSON flag)
delete from public.autonomous_recruiter_runs
where mode = 'demo_seed'
   or (app_demo_summary ? 'demo_seed' and app_demo_summary->>'demo_seed' = 'true');

-- ---------------------------------------------------------------------------
-- 1) Job Sources (tier & trust metadata used by app trust policy)
-- ---------------------------------------------------------------------------

-- Fixed IDs (uuid)
-- Motorola Solutions Workday (Tier 1)
insert into public.job_sources (
  id, company_name, source_name, source_url, source_type, ats_family, tier, trust_score, country, market,
  extraction_method, status, notes, created_at, updated_at
)
values (
  '11111111-1111-4111-8111-111111111111',
  'Motorola Solutions',
  'motorola_workday_my',
  'https://motorolasolutions.wd5.myworkdayjobs.com/Careers',
  'workday',
  'workday',
  'tier_1',
  95,
  'Malaysia',
  'MY',
  'api_cxs',
  'active',
  'DEMO_SEED: Tier 1 employer system source for stakeholder demo.',
  now(),
  now()
);

-- AIA Digital+ Workday (Tier 1)
insert into public.job_sources (
  id, company_name, source_name, source_url, source_type, ats_family, tier, trust_score, country, market,
  extraction_method, status, notes, created_at, updated_at
)
values (
  '22222222-2222-4222-8222-222222222222',
  'AIA Digital+',
  'aia_digital_workday_my',
  'https://aia.wd3.myworkdayjobs.com/AIA-Digital',
  'workday',
  'workday',
  'tier_1',
  95,
  'Malaysia',
  'MY',
  'api_cxs',
  'active',
  'DEMO_SEED: Tier 1 employer system source for stakeholder demo.',
  now(),
  now()
);

-- Hong Leong Bank "career page" (Tier 1 demo)
insert into public.job_sources (
  id, company_name, source_name, source_url, source_type, ats_family, tier, trust_score, country, market,
  extraction_method, status, notes, created_at, updated_at
)
values (
  '33333333-3333-4333-8333-333333333333',
  'Hong Leong Bank',
  'hlb_career_page_my',
  'https://www.hlb.com.my/careers',
  'employer_career_page',
  null,
  'tier_1',
  92,
  'Malaysia',
  'MY',
  'manual_intake_demo',
  'active',
  'DEMO_SEED: Tier 1 employer career page source for stakeholder demo.',
  now(),
  now()
);

-- "Manual intake" (Tier 2 demo)
insert into public.job_sources (
  id, company_name, source_name, source_url, source_type, ats_family, tier, trust_score, country, market,
  extraction_method, status, notes, created_at, updated_at
)
values (
  '44444444-4444-4444-8444-444444444444',
  'Terrer Demo',
  'demo_seed_manual_intake',
  'https://terrerhr.com/demo',
  'manual_intake',
  null,
  'tier_2',
  70,
  'Malaysia',
  'MY',
  'demo_seed',
  'active',
  'DEMO_SEED: Demo-only manual intake source.',
  now(),
  now()
);

-- ---------------------------------------------------------------------------
-- 2) Jobs (3 hero + 5 supporting) - Malaysia-first, operational_status active
-- ---------------------------------------------------------------------------

-- Notes:
-- - Jobs table requires operational_status (NOT NULL).
-- - We set source='demo_seed' and include job_source_id for trusted sources.

insert into public.jobs (
  id, job_title, company_name, location, source, job_source_id,
  normalized_job_title, role_family, seniority,
  job_description_text, responsibilities, qualifications,
  operational_status, updated_at
)
values
  -- Hero 1: Backend / Software Engineer (Motorola)
  (
    'aaaaaaaa-0000-4000-8000-000000000001',
    'Backend Engineer (Node.js)',
    'Motorola Solutions',
    'Kuala Lumpur, Malaysia',
    'demo_seed',
    '11111111-1111-4111-8111-111111111111',
    'Backend Engineer',
    'Engineering / Technology',
    'Mid-level',
    'DEMO_SEED: We build backend services that power critical systems. You will design and ship APIs, improve reliability, and collaborate with product and platform teams.',
    'Design and build backend APIs; Improve service reliability and monitoring; Collaborate with product and frontend teams',
    '3+ years backend development; Node.js/TypeScript experience; SQL (PostgreSQL) and API design',
    'active',
    now()
  ),

  -- Hero 2: Data Analyst / BI Analyst (AIA Digital+)
  (
    'aaaaaaaa-0000-4000-8000-000000000002',
    'BI Analyst (Power BI)',
    'AIA Digital+',
    'Kuala Lumpur, Malaysia',
    'demo_seed',
    '22222222-2222-4222-8222-222222222222',
    'BI Analyst',
    'Data / Analytics',
    'Mid-level',
    'DEMO_SEED: Support business stakeholders with dashboards, reporting, and insights. Build data models, define KPIs, and ensure data quality for decision-making.',
    'Develop Power BI dashboards; Define metrics with stakeholders; Validate data quality and reconcile numbers',
    'Strong SQL; Power BI and DAX; Experience translating business questions into analytics',
    'active',
    now()
  ),

  -- Hero 3: Finance Analyst / FP&A (Hong Leong Bank)
  (
    'aaaaaaaa-0000-4000-8000-000000000003',
    'FP&A Analyst',
    'Hong Leong Bank',
    'Kuala Lumpur, Malaysia',
    'demo_seed',
    '33333333-3333-4333-8333-333333333333',
    'FP&A Analyst',
    'Finance / Risk',
    'Mid-level',
    'DEMO_SEED: Partner with business teams on budgeting, forecasting, and performance reporting. Build models and deliver clear management insights.',
    'Budgeting and forecasting; Variance analysis; Create management reporting packs',
    'Excel modelling; Strong financial acumen; Ability to present insights to stakeholders',
    'active',
    now()
  ),

  -- Supporting: Software Engineer (Maxis)
  (
    'aaaaaaaa-0000-4000-8000-000000000004',
    'Software Engineer (Platform)',
    'Maxis',
    'Cyberjaya, Malaysia',
    'demo_seed',
    '44444444-4444-4444-8444-444444444444',
    'Software Engineer',
    'Engineering / Technology',
    'Mid-level',
    'DEMO_SEED: Work on platform services, automation, and reliability to support product teams.',
    'Platform automation; CI/CD improvements; Service reliability',
    'Cloud fundamentals; Scripting; Systems thinking',
    'active',
    now()
  ),

  -- Supporting: Data Engineer (AIA Digital+)
  (
    'aaaaaaaa-0000-4000-8000-000000000005',
    'Data Engineer',
    'AIA Digital+',
    'Kuala Lumpur, Malaysia',
    'demo_seed',
    '22222222-2222-4222-8222-222222222222',
    'Data Engineer',
    'Data / Analytics',
    'Senior level',
    'DEMO_SEED: Build pipelines and maintain data quality for analytics and reporting use cases.',
    'Build ETL pipelines; Maintain data models; Ensure quality and lineage',
    'Python/SQL; Data warehousing; Observability and QA',
    'active',
    now()
  ),

  -- Supporting: Finance Analyst (Affin Bank)
  (
    'aaaaaaaa-0000-4000-8000-000000000006',
    'Finance Analyst',
    'Affin Bank',
    'Kuala Lumpur, Malaysia',
    'demo_seed',
    '44444444-4444-4444-8444-444444444444',
    'Finance Analyst',
    'Finance / Risk',
    'Mid-level',
    'DEMO_SEED: Support reporting and analysis for business units. Assist in month-end and management reporting.',
    'Management reporting; Business partnering support; Data validation',
    'Excel; Attention to detail; Basic accounting knowledge',
    'active',
    now()
  ),

  -- Supporting: Risk & Compliance Analyst (Hong Leong Bank)
  (
    'aaaaaaaa-0000-4000-8000-000000000007',
    'Risk & Compliance Analyst',
    'Hong Leong Bank',
    'Kuala Lumpur, Malaysia',
    'demo_seed',
    '33333333-3333-4333-8333-333333333333',
    'Risk & Compliance Analyst',
    'Finance / Risk',
    'Senior level',
    'DEMO_SEED: Support risk governance reporting and compliance checks across business units.',
    'Compliance review; Risk reporting; Policy and controls support',
    'Risk/compliance exposure; Reporting; Stakeholder management',
    'active',
    now()
  ),

  -- Supporting: PMO / Ops Analyst (Shared Services)
  (
    'aaaaaaaa-0000-4000-8000-000000000008',
    'PMO Analyst (Operations)',
    'Shared Services Group',
    'Petaling Jaya, Malaysia',
    'demo_seed',
    '44444444-4444-4444-8444-444444444444',
    'PMO Analyst',
    'Operations',
    'Mid-level',
    'DEMO_SEED: Support project tracking, reporting, and operational cadence for cross-functional programs.',
    'Project tracking; Status reporting; Stakeholder coordination',
    'Excel; Communication; Organised execution',
    'active',
    now()
  );

-- ---------------------------------------------------------------------------
-- 3) Candidates (18–20) + Source Profiles + Candidate Scores
-- ---------------------------------------------------------------------------

-- Candidates table: seed with rich profile fields where available.
-- The app’s candidate list uses vw_candidate_search_clean, which includes:
--  - candidates (display_name, full_name, country, city, primary_role)
--  - source_profiles (source_name, source_handle, source_profile_url)
--  - candidate_scores (score, score_reason, capabilities) and possibly top_skills
--
-- We seed:
--  - public.candidates (18 rows)
--  - public.source_profiles (18 rows)
--  - public.candidate_scores (18 rows)

insert into public.candidates (
  candidate_id, display_name, full_name, country, city,
  primary_role, current_role, target_role,
  email, phone, linkedin_url, github_url,
  salary_expectation_min, salary_expectation_max, salary_expectation_currency,
  notice_period, years_experience, key_skills,
  representation_opt_in, candidate_consent_given, candidate_consent_at,
  profile_capture_mode, profile_completeness_status,
  source_type, notes, created_at, updated_at
)
values
  -- TECH (10)
  (
    'bbbbbbbb-0000-4000-8000-000000000001',
    'Aiman Haziq', 'Aiman Haziq',
    'Malaysia', 'Kuala Lumpur',
    'Backend Engineer', 'Backend Engineer', 'Backend Engineer',
    'aiman.demo@terrer.example', '+6012-1111111',
    'https://linkedin.com/in/aiman-demo', 'https://github.com/aiman-demo',
    8000, 12000, 'MYR',
    '1 month', 4, array['Node.js','TypeScript','PostgreSQL','REST APIs','Docker'],
    true, true, now(),
    'demo_seed', 'complete',
    'demo_seed', 'DEMO_SEED: Tech candidate (backend).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000002',
    'Nur Aina', 'Nur Aina',
    'Malaysia', 'Petaling Jaya',
    'Software Engineer', 'Software Engineer', 'Backend Engineer',
    'aina.demo@terrer.example', '+6012-2222222',
    'https://linkedin.com/in/aina-demo', null,
    6500, 9500, 'MYR',
    '2 weeks', 3, array['JavaScript','Node.js','SQL','Git','Testing'],
    true, true, now(),
    'demo_seed', 'good',
    'demo_seed', 'DEMO_SEED: Tech candidate (generalist).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000003',
    'Daniel Tan', 'Daniel Tan',
    'Malaysia', 'Penang',
    'Platform Engineer', 'Platform Engineer', 'Software Engineer',
    'daniel.demo@terrer.example', '+6012-3333333',
    null, 'https://github.com/daniel-demo',
    9000, 14000, 'MYR',
    '1 month', 5, array['Linux','CI/CD','AWS','Terraform','Monitoring'],
    false, true, now(),
    'demo_seed', 'good',
    'demo_seed', 'DEMO_SEED: Tech candidate (platform).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000004',
    'Siti Farah', 'Siti Farah',
    'Malaysia', 'Kuala Lumpur',
    'Frontend Engineer', 'Frontend Engineer', 'Full Stack Engineer',
    'farah.demo@terrer.example', '+6012-4444444',
    'https://linkedin.com/in/farah-demo', null,
    6000, 10000, 'MYR',
    'Immediate', 3, array['React','TypeScript','CSS','APIs','UI Components'],
    true, true, now(),
    'demo_seed', 'good',
    'demo_seed', 'DEMO_SEED: Tech candidate (frontend).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000005',
    'Hafiz Rahman', 'Hafiz Rahman',
    'Malaysia', 'Cyberjaya',
    'Backend Engineer', 'Backend Engineer', 'Backend Engineer',
    'hafiz.demo@terrer.example', '+6012-5555555',
    null, null,
    7000, 11000, 'MYR',
    '1 month', 4, array['Node.js','Express','PostgreSQL','Redis','APIs'],
    false, true, now(),
    'demo_seed', 'good',
    'demo_seed', 'DEMO_SEED: Tech candidate (backend).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000006',
    'Jia Wei', 'Jia Wei',
    'Malaysia', 'Kuala Lumpur',
    'QA Engineer', 'QA Engineer', 'Software Engineer',
    'jiawei.demo@terrer.example', '+6012-6666666',
    null, null,
    5000, 8000, 'MYR',
    '2 weeks', 3, array['Testing','Automation','Playwright','API Testing','SQL'],
    false, true, now(),
    'demo_seed', 'good',
    'demo_seed', 'DEMO_SEED: Tech candidate (QA).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000007',
    'Kavitha Nair', 'Kavitha Nair',
    'Malaysia', 'Selangor',
    'Software Engineer', 'Software Engineer', 'Software Engineer',
    'kavitha.demo@terrer.example', '+6012-7777777',
    'https://linkedin.com/in/kavitha-demo', 'https://github.com/kavitha-demo',
    8500, 13000, 'MYR',
    '1 month', 5, array['TypeScript','Node.js','PostgreSQL','System Design','Cloud'],
    true, true, now(),
    'demo_seed', 'complete',
    'demo_seed', 'DEMO_SEED: Tech candidate (senior-ish).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000008',
    'Syafiq Amir', 'Syafiq Amir',
    'Malaysia', 'Kuala Lumpur',
    'DevOps Engineer', 'DevOps Engineer', 'Platform Engineer',
    'syafiq.demo@terrer.example', '+6012-8888888',
    null, null,
    9000, 15000, 'MYR',
    '1 month', 6, array['AWS','Kubernetes','CI/CD','Terraform','Monitoring'],
    false, true, now(),
    'demo_seed', 'good',
    'demo_seed', 'DEMO_SEED: Tech candidate (DevOps).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000009',
    'Melissa Goh', 'Melissa Goh',
    'Malaysia', 'Penang',
    'Mobile Engineer', 'Mobile Engineer', 'Software Engineer',
    'melissa.demo@terrer.example', '+6012-9999999',
    'https://linkedin.com/in/melissa-demo', null,
    7000, 11500, 'MYR',
    '2 weeks', 4, array['Kotlin','Android','APIs','Testing','Git'],
    true, true, now(),
    'demo_seed', 'good',
    'demo_seed', 'DEMO_SEED: Tech candidate (mobile).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000010',
    'Faris Khair', 'Faris Khair',
    'Malaysia', 'Kuala Lumpur',
    'Full Stack Engineer', 'Full Stack Engineer', 'Backend Engineer',
    'faris.demo@terrer.example', '+6013-1010101',
    null, 'https://github.com/faris-demo',
    7500, 12000, 'MYR',
    'Immediate', 4, array['Node.js','React','SQL','APIs','Git'],
    false, true, now(),
    'demo_seed', 'good',
    'demo_seed', 'DEMO_SEED: Tech candidate (full stack).', now(), now()
  ),

  -- DATA / ANALYTICS (5)
  (
    'bbbbbbbb-0000-4000-8000-000000000011',
    'Amelia Lim', 'Amelia Lim',
    'Malaysia', 'Kuala Lumpur',
    'BI Analyst', 'BI Analyst', 'BI Analyst',
    'amelia.demo@terrer.example', '+6013-1111111',
    'https://linkedin.com/in/amelia-demo', null,
    5500, 8500, 'MYR',
    '1 month', 3, array['SQL','Power BI','DAX','Excel','Dashboarding'],
    true, true, now(),
    'demo_seed', 'complete',
    'demo_seed', 'DEMO_SEED: Data candidate (BI).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000012',
    'Haziq Omar', 'Haziq Omar',
    'Malaysia', 'Petaling Jaya',
    'Data Analyst', 'Data Analyst', 'BI Analyst',
    'haziq.demo@terrer.example', '+6013-1212121',
    null, null,
    4500, 7000, 'MYR',
    '2 weeks', 2, array['SQL','Excel','Power BI','Reporting','Data Cleaning'],
    false, true, now(),
    'demo_seed', 'good',
    'demo_seed', 'DEMO_SEED: Data candidate (analyst).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000013',
    'Wei Ling', 'Wei Ling',
    'Malaysia', 'Kuala Lumpur',
    'Data Engineer', 'Data Engineer', 'Data Engineer',
    'weiling.demo@terrer.example', '+6013-1313131',
    null, 'https://github.com/weiling-demo',
    9000, 15000, 'MYR',
    '1 month', 5, array['Python','SQL','ETL','Data Modelling','Airflow'],
    false, true, now(),
    'demo_seed', 'good',
    'demo_seed', 'DEMO_SEED: Data candidate (engineer).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000014',
    'Shafiqah Noor', 'Shafiqah Noor',
    'Malaysia', 'Selangor',
    'Analytics Specialist', 'Analytics Specialist', 'BI Analyst',
    'shafiqah.demo@terrer.example', '+6013-1414141',
    'https://linkedin.com/in/shafiqah-demo', null,
    6000, 9000, 'MYR',
    '2 weeks', 3, array['SQL','Power BI','Stakeholder Management','KPIs','Reporting'],
    true, true, now(),
    'demo_seed', 'complete',
    'demo_seed', 'DEMO_SEED: Data candidate (analytics).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000015',
    'Irfan Malik', 'Irfan Malik',
    'Malaysia', 'Kuala Lumpur',
    'Business Analyst', 'Business Analyst', 'Data Analyst',
    'irfan.demo@terrer.example', '+6013-1515151',
    null, null,
    5500, 8500, 'MYR',
    '1 month', 4, array['Requirements Gathering','SQL','Excel','Reporting','Process Mapping'],
    false, true, now(),
    'demo_seed', 'good',
    'demo_seed', 'DEMO_SEED: Data/BA candidate.', now(), now()
  ),

  -- FINANCE / RISK (3)
  (
    'bbbbbbbb-0000-4000-8000-000000000016',
    'Nurul Izzah', 'Nurul Izzah',
    'Malaysia', 'Kuala Lumpur',
    'FP&A Analyst', 'FP&A Analyst', 'FP&A Analyst',
    'nurul.demo@terrer.example', '+6013-1616161',
    'https://linkedin.com/in/nurul-demo', null,
    6500, 10000, 'MYR',
    '1 month', 4, array['Budgeting','Forecasting','Excel','Financial Modelling','Variance Analysis'],
    true, true, now(),
    'demo_seed', 'complete',
    'demo_seed', 'DEMO_SEED: Finance candidate (FP&A).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000017',
    'Jason Wong', 'Jason Wong',
    'Malaysia', 'Petaling Jaya',
    'Finance Analyst', 'Finance Analyst', 'FP&A Analyst',
    'jason.demo@terrer.example', '+6013-1717171',
    null, null,
    5500, 8500, 'MYR',
    '2 weeks', 3, array['Financial Reporting','Excel','Reporting','Stakeholder Management','Analysis'],
    false, true, now(),
    'demo_seed', 'good',
    'demo_seed', 'DEMO_SEED: Finance candidate (analyst).', now(), now()
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000018',
    'Priya Menon', 'Priya Menon',
    'Malaysia', 'Kuala Lumpur',
    'Risk Analyst', 'Risk Analyst', 'Risk & Compliance Analyst',
    'priya.demo@terrer.example', '+6013-1818181',
    'https://linkedin.com/in/priya-demo', null,
    7000, 11000, 'MYR',
    '1 month', 5, array['Risk Management','Compliance','Reporting','Controls','Governance'],
    true, true, now(),
    'demo_seed', 'complete',
    'demo_seed', 'DEMO_SEED: Risk candidate.', now(), now()
  );

-- Source profiles (one per candidate)
insert into public.source_profiles (
  profile_id, candidate_id, source_name, source_profile_url, source_handle, source_user_id, scraped_at
)
values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'GitHub', 'https://github.com/aiman-demo', 'aiman-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'LinkedIn', 'https://linkedin.com/in/aina-demo', 'aina-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000003', 'GitHub', 'https://github.com/daniel-demo', 'daniel-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000004', 'LinkedIn', 'https://linkedin.com/in/farah-demo', 'farah-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-000000000005', 'demo_seed', 'https://terrerhr.com/DEMO_SEED/candidates/hafiz', 'hafiz-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000006', 'bbbbbbbb-0000-4000-8000-000000000006', 'demo_seed', 'https://terrerhr.com/DEMO_SEED/candidates/jiawei', 'jiawei-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000007', 'bbbbbbbb-0000-4000-8000-000000000007', 'LinkedIn', 'https://linkedin.com/in/kavitha-demo', 'kavitha-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000008', 'bbbbbbbb-0000-4000-8000-000000000008', 'demo_seed', 'https://terrerhr.com/DEMO_SEED/candidates/syafiq', 'syafiq-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000009', 'bbbbbbbb-0000-4000-8000-000000000009', 'LinkedIn', 'https://linkedin.com/in/melissa-demo', 'melissa-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000010', 'bbbbbbbb-0000-4000-8000-000000000010', 'GitHub', 'https://github.com/faris-demo', 'faris-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000011', 'bbbbbbbb-0000-4000-8000-000000000011', 'LinkedIn', 'https://linkedin.com/in/amelia-demo', 'amelia-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000012', 'bbbbbbbb-0000-4000-8000-000000000012', 'demo_seed', 'https://terrerhr.com/DEMO_SEED/candidates/haziq', 'haziq-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000013', 'bbbbbbbb-0000-4000-8000-000000000013', 'GitHub', 'https://github.com/weiling-demo', 'weiling-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000014', 'bbbbbbbb-0000-4000-8000-000000000014', 'LinkedIn', 'https://linkedin.com/in/shafiqah-demo', 'shafiqah-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000015', 'bbbbbbbb-0000-4000-8000-000000000015', 'demo_seed', 'https://terrerhr.com/DEMO_SEED/candidates/irfan', 'irfan-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000016', 'bbbbbbbb-0000-4000-8000-000000000016', 'LinkedIn', 'https://linkedin.com/in/nurul-demo', 'nurul-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000017', 'bbbbbbbb-0000-4000-8000-000000000017', 'demo_seed', 'https://terrerhr.com/DEMO_SEED/candidates/jason', 'jason-demo', null, now()),
  ('cccccccc-0000-4000-8000-000000000018', 'bbbbbbbb-0000-4000-8000-000000000018', 'LinkedIn', 'https://linkedin.com/in/priya-demo', 'priya-demo', null, now());

-- Candidate scores (feeds vw_candidate_search_clean score + reasoning + capabilities)
insert into public.candidate_scores (
  candidate_id, display_name, full_name, city, primary_role,
  repos, followers,
  capabilities, score, score_reason, scored_at
)
values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'Aiman Haziq', 'Aiman Haziq', 'Kuala Lumpur', 'Backend Engineer', 22, 180,
   'Node.js, TypeScript, PostgreSQL, REST APIs, Docker, Redis', 92, 'DEMO_SEED: Strong backend fit signals.', now()),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Nur Aina', 'Nur Aina', 'Petaling Jaya', 'Software Engineer', 14, 90,
   'JavaScript, Node.js, SQL, Testing, Git', 84, 'DEMO_SEED: Solid generalist engineering profile.', now()),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'Daniel Tan', 'Daniel Tan', 'Penang', 'Platform Engineer', 18, 120,
   'Linux, CI/CD, AWS, Terraform, Monitoring', 86, 'DEMO_SEED: Platform reliability signals.', now()),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'Siti Farah', 'Siti Farah', 'Kuala Lumpur', 'Frontend Engineer', 10, 60,
   'React, TypeScript, CSS, UI Components, API Integration', 78, 'DEMO_SEED: Frontend profile (supporting).', now()),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'Hafiz Rahman', 'Hafiz Rahman', 'Cyberjaya', 'Backend Engineer', 9, 40,
   'Node.js, Express, PostgreSQL, Redis, APIs', 80, 'DEMO_SEED: Backend engineer with strong stack overlap.', now()),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'Jia Wei', 'Jia Wei', 'Kuala Lumpur', 'QA Engineer', 7, 25,
   'Testing, Automation, Playwright, API Testing, SQL', 70, 'DEMO_SEED: QA/automation strengths.', now()),
  ('bbbbbbbb-0000-4000-8000-000000000007', 'Kavitha Nair', 'Kavitha Nair', 'Selangor', 'Software Engineer', 26, 240,
   'TypeScript, Node.js, PostgreSQL, System Design, Cloud', 90, 'DEMO_SEED: Senior-ish engineering signals.', now()),
  ('bbbbbbbb-0000-4000-8000-000000000008', 'Syafiq Amir', 'Syafiq Amir', 'Kuala Lumpur', 'DevOps Engineer', 12, 110,
   'AWS, Kubernetes, CI/CD, Terraform, Monitoring', 85, 'DEMO_SEED: DevOps/infra fit signals.', now()),
  ('bbbbbbbb-0000-4000-8000-000000000009', 'Melissa Goh', 'Melissa Goh', 'Penang', 'Mobile Engineer', 11, 55,
   'Kotlin, Android, APIs, Testing, Git', 74, 'DEMO_SEED: Mobile profile (supporting).', now()),
  ('bbbbbbbb-0000-4000-8000-000000000010', 'Faris Khair', 'Faris Khair', 'Kuala Lumpur', 'Full Stack Engineer', 13, 70,
   'Node.js, React, SQL, APIs, Git', 79, 'DEMO_SEED: Full stack candidate (supporting).', now()),

  ('bbbbbbbb-0000-4000-8000-000000000011', 'Amelia Lim', 'Amelia Lim', 'Kuala Lumpur', 'BI Analyst', 8, 22,
   'SQL, Power BI, DAX, Excel, Dashboarding', 88, 'DEMO_SEED: Strong BI fit signals.', now()),
  ('bbbbbbbb-0000-4000-8000-000000000012', 'Haziq Omar', 'Haziq Omar', 'Petaling Jaya', 'Data Analyst', 6, 18,
   'SQL, Excel, Power BI, Reporting, Data Cleaning', 76, 'DEMO_SEED: Analyst fit signals.', now()),
  ('bbbbbbbb-0000-4000-8000-000000000013', 'Wei Ling', 'Wei Ling', 'Kuala Lumpur', 'Data Engineer', 20, 150,
   'Python, SQL, ETL, Data Modelling, Airflow', 83, 'DEMO_SEED: Data engineering fit signals.', now()),
  ('bbbbbbbb-0000-4000-8000-000000000014', 'Shafiqah Noor', 'Shafiqah Noor', 'Selangor', 'Analytics Specialist', 9, 45,
   'SQL, Power BI, KPIs, Stakeholder Management, Reporting', 80, 'DEMO_SEED: Analytics stakeholder fit.', now()),
  ('bbbbbbbb-0000-4000-8000-000000000015', 'Irfan Malik', 'Irfan Malik', 'Kuala Lumpur', 'Business Analyst', 5, 12,
   'Requirements, SQL, Excel, Reporting, Process Mapping', 72, 'DEMO_SEED: BA profile (supporting).', now()),

  ('bbbbbbbb-0000-4000-8000-000000000016', 'Nurul Izzah', 'Nurul Izzah', 'Kuala Lumpur', 'FP&A Analyst', 0, 0,
   'Budgeting, Forecasting, Excel, Financial Modelling, Variance Analysis', 89, 'DEMO_SEED: Strong FP&A fit.', now()),
  ('bbbbbbbb-0000-4000-8000-000000000017', 'Jason Wong', 'Jason Wong', 'Petaling Jaya', 'Finance Analyst', 0, 0,
   'Financial Reporting, Excel, Analysis, Management Reporting', 77, 'DEMO_SEED: Finance analyst fit.', now()),
  ('bbbbbbbb-0000-4000-8000-000000000018', 'Priya Menon', 'Priya Menon', 'Kuala Lumpur', 'Risk Analyst', 0, 0,
   'Risk Management, Compliance, Controls, Governance, Reporting', 82, 'DEMO_SEED: Risk & compliance fit.', now());

-- ---------------------------------------------------------------------------
-- 4) Job Requirements for 3 hero jobs (enables real skill overlap in Top Matches)
-- ---------------------------------------------------------------------------

-- Hero 1: Backend Engineer (Motorola)
insert into public.job_requirements (job_requirement_id, job_id, skill_name, requirement_type, min_years, weight, notes, created_at)
values
  ('dddddddd-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','Node.js','must_have',3,5,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000001','TypeScript','must_have',2,4,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000003','aaaaaaaa-0000-4000-8000-000000000001','PostgreSQL','must_have',2,4,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000004','aaaaaaaa-0000-4000-8000-000000000001','REST APIs','must_have',2,4,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000005','aaaaaaaa-0000-4000-8000-000000000001','Docker','nice_to_have',1,2,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000006','aaaaaaaa-0000-4000-8000-000000000001','Redis','nice_to_have',1,2,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000007','aaaaaaaa-0000-4000-8000-000000000001','Testing','nice_to_have',1,2,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000008','aaaaaaaa-0000-4000-8000-000000000001','System Design','nice_to_have',1,2,'DEMO_SEED',now());

-- Hero 2: BI Analyst (AIA Digital+)
insert into public.job_requirements (job_requirement_id, job_id, skill_name, requirement_type, min_years, weight, notes, created_at)
values
  ('dddddddd-0000-4000-8000-000000000101','aaaaaaaa-0000-4000-8000-000000000002','SQL','must_have',2,5,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000102','aaaaaaaa-0000-4000-8000-000000000002','Power BI','must_have',2,5,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000103','aaaaaaaa-0000-4000-8000-000000000002','DAX','must_have',1,4,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000104','aaaaaaaa-0000-4000-8000-000000000002','Excel','must_have',2,3,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000105','aaaaaaaa-0000-4000-8000-000000000002','Dashboarding','must_have',1,3,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000106','aaaaaaaa-0000-4000-8000-000000000002','Data Cleaning','nice_to_have',1,2,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000107','aaaaaaaa-0000-4000-8000-000000000002','Stakeholder Management','nice_to_have',1,2,'DEMO_SEED',now());

-- Hero 3: FP&A Analyst (Hong Leong Bank)
insert into public.job_requirements (job_requirement_id, job_id, skill_name, requirement_type, min_years, weight, notes, created_at)
values
  ('dddddddd-0000-4000-8000-000000000201','aaaaaaaa-0000-4000-8000-000000000003','Budgeting','must_have',2,5,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000202','aaaaaaaa-0000-4000-8000-000000000003','Forecasting','must_have',2,5,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000203','aaaaaaaa-0000-4000-8000-000000000003','Variance Analysis','must_have',2,4,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000204','aaaaaaaa-0000-4000-8000-000000000003','Financial Modelling','must_have',2,4,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000205','aaaaaaaa-0000-4000-8000-000000000003','Excel','must_have',3,3,'DEMO_SEED',now()),
  ('dddddddd-0000-4000-8000-000000000206','aaaaaaaa-0000-4000-8000-000000000003','Stakeholder Management','nice_to_have',1,2,'DEMO_SEED',now());

-- ---------------------------------------------------------------------------
-- 5) Submissions (12–15) across stages for Pipeline + BD Queue continuity
-- ---------------------------------------------------------------------------

-- Notes:
-- - submissions.submission_stage is text
-- - next_action_date is date
-- - created_at/updated_at/stage_updated_at are timestamptz
-- - We use notes='DEMO_SEED: ...' to allow rollback

insert into public.submissions (
  id, job_id, candidate_id, match_score, shortlist_rank,
  submission_stage, stage_updated_at, next_action_date,
  owner_name, decision_reason, notes, created_at, updated_at
)
values
  -- Backend hero job (Motorola)
  ('eeeeeeee-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000001', 92, 1, 'shortlisted', now() - interval '2 days', current_date + 1, 'Recruiter Demo', 'Strong Node/TS overlap', 'DEMO_SEED: Backend hero shortlist 1', now() - interval '3 days', now() - interval '2 days'),
  ('eeeeeeee-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000007', 90, 2, 'ready_for_bd_review', now() - interval '1 days', current_date, 'Recruiter Demo', 'System design + backend stack', 'DEMO_SEED: Backend hero BD review', now() - interval '2 days', now() - interval '1 days'),
  ('eeeeeeee-0000-4000-8000-000000000003','aaaaaaaa-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000005', 80, 3, 'new', now() - interval '1 days', current_date + 2, 'Recruiter Demo', 'Potential fit, needs verification', 'DEMO_SEED: Backend hero new', now() - interval '1 days', now() - interval '1 days'),
  ('eeeeeeee-0000-4000-8000-000000000004','aaaaaaaa-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000003', 86, 4, 'submitted_to_client', now() - interval '6 days', current_date + 3, 'Recruiter Demo', 'Platform experience relevant', 'DEMO_SEED: Backend hero submitted', now() - interval '8 days', now() - interval '6 days'),

  -- BI hero job (AIA Digital+)
  ('eeeeeeee-0000-4000-8000-000000000101','aaaaaaaa-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000011', 88, 1, 'shortlisted', now() - interval '2 days', current_date + 1, 'Recruiter Demo', 'Power BI + DAX strong', 'DEMO_SEED: BI hero shortlist', now() - interval '3 days', now() - interval '2 days'),
  ('eeeeeeee-0000-4000-8000-000000000102','aaaaaaaa-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000014', 80, 2, 'ready_for_bd_review', now() - interval '1 days', current_date, 'Recruiter Demo', 'Analytics specialist good stakeholder fit', 'DEMO_SEED: BI hero BD review', now() - interval '2 days', now() - interval '1 days'),
  ('eeeeeeee-0000-4000-8000-000000000103','aaaaaaaa-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000012', 76, 3, 'new', now() - interval '1 days', current_date + 2, 'Recruiter Demo', 'Analyst fit, needs deeper check', 'DEMO_SEED: BI hero new', now() - interval '1 days', now() - interval '1 days'),

  -- FP&A hero job (Hong Leong Bank)
  ('eeeeeeee-0000-4000-8000-000000000201','aaaaaaaa-0000-4000-8000-000000000003','bbbbbbbb-0000-4000-8000-000000000016', 89, 1, 'submitted_to_client', now() - interval '5 days', current_date + 1, 'Recruiter Demo', 'FP&A stack is strong', 'DEMO_SEED: FP&A hero submitted', now() - interval '7 days', now() - interval '5 days'),
  ('eeeeeeee-0000-4000-8000-000000000202','aaaaaaaa-0000-4000-8000-000000000003','bbbbbbbb-0000-4000-8000-000000000017', 77, 2, 'interview', now() - interval '3 days', current_date + 4, 'Recruiter Demo', 'Finance analyst progressing', 'DEMO_SEED: FP&A hero interview', now() - interval '5 days', now() - interval '3 days'),
  ('eeeeeeee-0000-4000-8000-000000000203','aaaaaaaa-0000-4000-8000-000000000003','bbbbbbbb-0000-4000-8000-000000000018', 82, 3, 'offer', now() - interval '1 days', current_date + 7, 'Recruiter Demo', 'Risk profile - alternate path', 'DEMO_SEED: FP&A hero offer-ish', now() - interval '2 days', now() - interval '1 days'),

  -- Supporting jobs feed pipeline breadth
  ('eeeeeeee-0000-4000-8000-000000000301','aaaaaaaa-0000-4000-8000-000000000005','bbbbbbbb-0000-4000-8000-000000000013', 83, 1, 'new', now() - interval '1 days', current_date + 3, 'Recruiter Demo', 'Data eng for AIA supporting role', 'DEMO_SEED: Supporting submission 1', now() - interval '1 days', now() - interval '1 days'),
  ('eeeeeeee-0000-4000-8000-000000000302','aaaaaaaa-0000-4000-8000-000000000006','bbbbbbbb-0000-4000-8000-000000000017', 77, 1, 'shortlisted', now() - interval '2 days', current_date + 2, 'Recruiter Demo', 'Finance analyst for Affin supporting role', 'DEMO_SEED: Supporting submission 2', now() - interval '3 days', now() - interval '2 days');

-- ---------------------------------------------------------------------------
-- 6) AI Assessments (5–6) tied to hero jobs/candidates
-- ---------------------------------------------------------------------------

insert into public.ai_assessments (
  id, job_id, candidate_id,
  layer1_score, ai_score, ranking_adjustment,
  overall_recommendation, confidence,
  strengths, concerns,
  reasoning_summary, verification_notes, missing_information,
  submission_ready,
  model_used, model_version, assessed_at
)
values
  -- Backend hero job assessments
  (
    'ffffffff-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000001',
    'bbbbbbbb-0000-4000-8000-000000000001',
    92, 90, 0,
    'Proceed', 'high',
    array['Strong Node.js + TypeScript overlap','Solid SQL and service fundamentals'],
    array['Confirm scale/ownership context'],
    'DEMO_SEED: Strong backend match. Prioritise for recruiter call.',
    array['Confirm recent project examples','Validate notice period'],
    array['No salary expectation captured beyond range'],
    true,
    'demo_seed', 'v_demo', now() - interval '2 days'
  ),
  (
    'ffffffff-0000-4000-8000-000000000002',
    'aaaaaaaa-0000-4000-8000-000000000001',
    'bbbbbbbb-0000-4000-8000-000000000007',
    90, 86, 0,
    'Proceed', 'medium',
    array['Backend fundamentals and design signals','Cloud + data store experience'],
    array['Check specific Node framework depth'],
    'DEMO_SEED: Good fit; verify stack specificity.',
    array['Confirm TypeScript production usage'],
    array['Exact team/scope unknown'],
    true,
    'demo_seed', 'v_demo', now() - interval '1 days'
  ),

  -- BI hero job assessments
  (
    'ffffffff-0000-4000-8000-000000000101',
    'aaaaaaaa-0000-4000-8000-000000000002',
    'bbbbbbbb-0000-4000-8000-000000000011',
    88, 89, 0,
    'Proceed', 'high',
    array['Power BI + DAX strong','Clear stakeholder reporting capability'],
    array['Confirm data modelling depth'],
    'DEMO_SEED: Strong BI candidate. Good for dashboard ownership.',
    array['Ask for dashboard portfolio examples'],
    array['Confirm KPI definition exposure'],
    true,
    'demo_seed', 'v_demo', now() - interval '2 days'
  ),
  (
    'ffffffff-0000-4000-8000-000000000102',
    'aaaaaaaa-0000-4000-8000-000000000002',
    'bbbbbbbb-0000-4000-8000-000000000012',
    76, 70, -3,
    'Review', 'low',
    array['SQL and reporting baseline'],
    array['May need mentorship for DAX/modeling'],
    'DEMO_SEED: Moderate fit; consider junior pipeline only.',
    array['Probe DAX and modelling examples'],
    array['Portfolio not available'],
    false,
    'demo_seed', 'v_demo', now() - interval '1 days'
  ),

  -- FP&A hero job assessments
  (
    'ffffffff-0000-4000-8000-000000000201',
    'aaaaaaaa-0000-4000-8000-000000000003',
    'bbbbbbbb-0000-4000-8000-000000000016',
    89, 88, 0,
    'Proceed', 'high',
    array['Budgeting/forecasting and modelling strong','Clear management reporting ability'],
    array['Confirm stakeholder cadence and tools'],
    'DEMO_SEED: Strong FP&A fit; progress to client-facing shortlist.',
    array['Validate business partnering examples'],
    array['Confirm reporting tools (Excel/PowerBI)'],
    true,
    'demo_seed', 'v_demo', now() - interval '3 days'
  ),
  (
    'ffffffff-0000-4000-8000-000000000202',
    'aaaaaaaa-0000-4000-8000-000000000003',
    'bbbbbbbb-0000-4000-8000-000000000017',
    77, 74, -1,
    'Proceed', 'medium',
    array['Strong reporting baseline','Good communication signals'],
    array['Check modelling depth'],
    'DEMO_SEED: Good finance analyst; ensure FP&A readiness.',
    array['Ask for model examples'],
    array['Exact FP&A exposure unclear'],
    true,
    'demo_seed', 'v_demo', now() - interval '2 days'
  );

-- ---------------------------------------------------------------------------
-- 7) Autonomous Recruiter Runs (5 rows)
-- ---------------------------------------------------------------------------

insert into public.autonomous_recruiter_runs (
  id, created_at, run_timestamp, mode,
  job_title, skills, location, seniority,
  total_candidates, strategy_count,
  best_strategy, weakest_strategy,
  query_quality_label, next_run_priority,
  recommended_next_search_focus, recommended_query_adjustments,
  winning_variant, reason_winning_variant, recommended_next_action,
  run_status,
  recruiter_confidence_level, recruiter_confidence_score,
  sourcing_signal_summary, sourcing_signal_flags, sourcing_risk_flags,
  app_demo_summary,
  candidates_path, recruiter_report_path, agent_report_path, strategy_refinement_path,
  batch_summary_json_path, batch_summary_md_path
)
values
  (
    '99999999-0000-4000-8000-000000000001',
    now() - interval '4 days',
    now() - interval '4 days',
    'demo_seed',
    'Backend Engineer', 'Node.js, Express, PostgreSQL', 'Malaysia', 'Mid',
    28, 6,
    'technology_first', 'broad_fallback',
    'good', 'repeat_with_variation',
    'Focus Node.js + SQL profiles in KL/Selangor',
    jsonb_build_array(jsonb_build_object('adjustment','add language:TypeScript', 'reason','reduce frontend noise')),
    null, null,
    'Repeat strongest strategy with TypeScript emphasis.',
    'completed',
    'high', 82,
    'Strong candidate availability for backend profiles in Malaysia.',
    jsonb_build_array('Strong backend skill concentration','Consistent strategy performance'),
    jsonb_build_array('Profile-search limitation detected'),
    jsonb_build_object('demo_seed','true','summary','DEMO_SEED run'),
    'Outputs/demo_seed_backend_candidates.xlsx',
    'Outputs/demo_seed_backend_recruiter_report.md',
    'Outputs/demo_seed_backend_agent_report.json',
    'Outputs/demo_seed_backend_strategy_refinement.json',
    null, null
  ),
  (
    '99999999-0000-4000-8000-000000000002',
    now() - interval '3 days',
    now() - interval '3 days',
    'demo_seed',
    'BI Analyst', 'SQL, Power BI, DAX', 'Malaysia', 'Mid',
    19, 5,
    'framework_first', 'broad_fallback',
    'mixed', 'narrow_search',
    'Focus Power BI + SQL + KPI reporting profiles',
    jsonb_build_array(jsonb_build_object('adjustment','add \"dashboard\" keyword', 'reason','increase BI relevance')),
    null, null,
    'Narrow into Power BI + DAX + KPI profiles.',
    'completed',
    'medium', 68,
    'Moderate BI candidate supply; some noise from generic analysts.',
    jsonb_build_array('Good BI signal density'),
    jsonb_build_array('Broad search produced noisy results'),
    jsonb_build_object('demo_seed','true','summary','DEMO_SEED run'),
    'Outputs/demo_seed_bi_candidates.xlsx',
    'Outputs/demo_seed_bi_recruiter_report.md',
    'Outputs/demo_seed_bi_agent_report.json',
    'Outputs/demo_seed_bi_strategy_refinement.json',
    null, null
  ),
  (
    '99999999-0000-4000-8000-000000000003',
    now() - interval '2 days',
    now() - interval '2 days',
    'demo_seed',
    'FP&A Analyst', 'Budgeting, Forecasting, Financial Modelling', 'Malaysia', 'Mid',
    14, 4,
    'direct_role', 'technology_first',
    'good', 'repeat_with_variation',
    'Focus FP&A + modelling + reporting profiles',
    jsonb_build_array(jsonb_build_object('adjustment','add \"variance\" keyword', 'reason','FP&A specificity')),
    null, null,
    'Repeat direct_role with modelling/variance keywords.',
    'completed',
    'medium', 70,
    'Healthy finance analyst availability; need FP&A specificity.',
    jsonb_build_array('Consistent strategy performance'),
    jsonb_build_array('Weak query quality in broad variants'),
    jsonb_build_object('demo_seed','true','summary','DEMO_SEED run'),
    'Outputs/demo_seed_fpa_candidates.xlsx',
    'Outputs/demo_seed_fpa_recruiter_report.md',
    'Outputs/demo_seed_fpa_agent_report.json',
    'Outputs/demo_seed_fpa_strategy_refinement.json',
    null, null
  ),
  (
    '99999999-0000-4000-8000-000000000004',
    now() - interval '1 days',
    now() - interval '1 days',
    'demo_seed',
    'Backend Engineer', 'Node.js, PostgreSQL', 'Malaysia', 'Mid',
    9, 3,
    'direct_role', 'broad_fallback',
    'weak', 'broaden_search',
    'Broaden titles: software engineer, API engineer',
    jsonb_build_array(jsonb_build_object('adjustment','drop strict framework terms', 'reason','avoid starving results')),
    'broad', 'Broader role keywords improved candidate count slightly.',
    'Broaden search then narrow by backend signals.',
    'partial_failed',
    'low', 44,
    'Low signal density in this run; broaden then refine.',
    jsonb_build_array('Some candidate availability'),
    jsonb_build_array('Weak query quality','Low signal density'),
    jsonb_build_object('demo_seed','true','summary','DEMO_SEED run'),
    'Outputs/demo_seed_backend_iter_candidates.xlsx',
    'Outputs/demo_seed_backend_iter_recruiter_report.md',
    'Outputs/demo_seed_backend_iter_agent_report.json',
    'Outputs/demo_seed_backend_iter_strategy_refinement.json',
    null, null
  ),
  (
    '99999999-0000-4000-8000-000000000005',
    now(),
    now(),
    'demo_seed',
    'BI Analyst', 'SQL, Power BI', 'Malaysia', 'Mid',
    0, 5,
    'location_variant', 'direct_role',
    'weak', 'broaden_search',
    'Remove location strictness; expand to Selangor/KL variants',
    jsonb_build_array(jsonb_build_object('adjustment','try city variants', 'reason','increase coverage')),
    'baseline', 'Baseline failed; needs broader plan.',
    'Broaden role terms; avoid over-filtering location.',
    'failed',
    'weak', 10,
    'Run failed to discover candidates; broaden strategy next.',
    jsonb_build_array(),
    jsonb_build_array('Insufficient data'),
    jsonb_build_object('demo_seed','true','summary','DEMO_SEED run'),
    'Outputs/demo_seed_bi_zero_candidates.xlsx',
    'Outputs/demo_seed_bi_zero_recruiter_report.md',
    'Outputs/demo_seed_bi_zero_agent_report.json',
    'Outputs/demo_seed_bi_zero_strategy_refinement.json',
    null, null
  );

-- ---------------------------------------------------------------------------
-- 8) BD Relationship Layer (5 companies + 8 contacts)
-- ---------------------------------------------------------------------------

-- companies.id is BIGINT (auto). We'll insert and then link contacts by joining on company_name.
insert into public.companies (
  company_name, company_slug, website_url, hq_country, primary_city,
  company_status, source_type, notes, created_at, updated_at
)
values
  ('Motorola Solutions', 'motorola-solutions', 'https://www.motorolasolutions.com', 'Malaysia', 'Kuala Lumpur',
   'target', 'demo_seed', 'DEMO_SEED: BD relationship company.', now(), now()),
  ('Maxis', 'maxis', 'https://www.maxis.com.my', 'Malaysia', 'Cyberjaya',
   'target', 'demo_seed', 'DEMO_SEED: BD relationship company.', now(), now()),
  ('AIA Digital+', 'aia-digital-plus', 'https://aia.wd3.myworkdayjobs.com/AIA-Digital', 'Malaysia', 'Kuala Lumpur',
   'active', 'demo_seed', 'DEMO_SEED: BD relationship company.', now(), now()),
  ('Hong Leong Bank', 'hong-leong-bank', 'https://www.hlb.com.my', 'Malaysia', 'Kuala Lumpur',
   'active', 'demo_seed', 'DEMO_SEED: BD relationship company.', now(), now()),
  ('Affin Bank', 'affin-bank', 'https://www.affinbank.com.my', 'Malaysia', 'Kuala Lumpur',
   'target', 'demo_seed', 'DEMO_SEED: BD relationship company.', now(), now());

-- bd_contacts (UUID id). Link to companies by company_name.
with company_map as (
  select id, company_name
  from public.companies
  where source_type = 'demo_seed' and (notes ilike '%DEMO_SEED%')
)
insert into public.bd_contacts (
  id, company_id, full_name, email, phone, mobile_phone, job_title, department,
  relationship_status, contact_type, source, notes, created_at, updated_at,
  next_action, next_action_date, last_contacted_at
)
select
  v.id,
  cm.id as company_id,
  v.full_name,
  v.email,
  v.phone,
  v.mobile_phone,
  v.job_title,
  v.department,
  v.relationship_status,
  'client_contact' as contact_type,
  'demo_seed' as source,
  v.notes,
  now(),
  now(),
  v.next_action,
  v.next_action_date,
  v.last_contacted_at
from (
  values
    ('abababab-0000-4000-8000-000000000001'::uuid, 'Motorola Solutions', 'Farah Ahmad', 'farah.ahmad@motorola.example', '+603-20000001', '+6012-20000001', 'Talent Acquisition Partner', 'HR', 'new', 'DEMO_SEED: BD contact (Motorola).', 'follow_up', current_date, null),
    ('abababab-0000-4000-8000-000000000002'::uuid, 'Motorola Solutions', 'Jason Lee', 'jason.lee@motorola.example', '+603-20000002', '+6012-20000002', 'Engineering Hiring Manager', 'Engineering', 'contacted', 'DEMO_SEED: BD contact (Motorola).', null, null, now() - interval '2 days'),

    ('abababab-0000-4000-8000-000000000003'::uuid, 'Maxis', 'Aina Tan', 'aina.tan@maxis.example', '+603-30000001', '+6012-30000001', 'Recruitment Lead', 'People', 'contacted', 'DEMO_SEED: BD contact (Maxis).', 'follow_up', current_date + 2, now() - interval '1 days'),
    ('abababab-0000-4000-8000-000000000004'::uuid, 'Maxis', 'Kumar Raj', 'kumar.raj@maxis.example', '+603-30000002', '+6012-30000002', 'Head of Platform', 'Technology', 'responded', 'DEMO_SEED: BD contact (Maxis).', null, null, now() - interval '5 days'),

    ('abababab-0000-4000-8000-000000000005'::uuid, 'AIA Digital+', 'Wei Ming', 'weiming@aia.example', '+603-40000001', '+6012-40000001', 'Analytics Manager', 'Data', 'new', 'DEMO_SEED: BD contact (AIA Digital+).', 'follow_up', current_date + 1, null),
    ('abababab-0000-4000-8000-000000000006'::uuid, 'AIA Digital+', 'Sarah Lim', 'sarah.lim@aia.example', '+603-40000002', '+6012-40000002', 'People Partner', 'HR', 'new', 'DEMO_SEED: BD contact (AIA Digital+).', null, null, null),

    ('abababab-0000-4000-8000-000000000007'::uuid, 'Hong Leong Bank', 'Nurul Hassan', 'nurul.hassan@hlb.example', '+603-50000001', '+6012-50000001', 'Finance HRBP', 'HR', 'responded', 'DEMO_SEED: BD contact (HLB).', 'follow_up', current_date + 3, now() - interval '3 days'),
    ('abababab-0000-4000-8000-000000000008'::uuid, 'Affin Bank', 'Priya Nair', 'priya.nair@affin.example', '+603-60000001', '+6012-60000001', 'Talent Acquisition', 'HR', 'new', 'DEMO_SEED: BD contact (Affin).', null, null, null)
) as v(id, company_name, full_name, email, phone, mobile_phone, job_title, department, relationship_status, notes, next_action, next_action_date, last_contacted_at)
join company_map cm
  on cm.company_name = v.company_name;

commit;

