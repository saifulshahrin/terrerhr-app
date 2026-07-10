-- Reconcile missing app migration-history ownership for views hardened by
-- 20260709_0004_view_security_hardening.sql.
--
-- Source of truth: docs/schema-evidence/live_schema_catalog_ddl.sql.
-- This migration only creates missing views using exact live definitions.
-- It does not replace existing views, broaden grants, or change security
-- behavior; 20260709_0004 owns the hardening treatment.

alter table public.jobs add column if not exists external_job_url text;
alter table public.jobs add column if not exists posted_date text;
alter table public.jobs add column if not exists source_company_id text;
alter table public.jobs add column if not exists extracted_at timestamp without time zone;
alter table public.jobs add column if not exists job_id text;
alter table public.jobs add column if not exists company_id bigint;
alter table public.jobs add column if not exists last_seen_at timestamp with time zone;
alter table public.jobs add column if not exists freshness_status text default 'unknown'::text;
alter table public.jobs add column if not exists market_cluster text;
alter table public.jobs add column if not exists is_market_signal_eligible boolean default true;
alter table public.jobs add column if not exists market_signal_exclusion_reason text;
alter table public.jobs add column if not exists job_description_html text;
alter table public.jobs add column if not exists job_description_text text;
alter table public.jobs add column if not exists responsibilities text;
alter table public.jobs add column if not exists qualifications text;

do $$
begin
  if to_regclass('public.jobs_latest') is null then
    execute $view$
CREATE VIEW "public"."jobs_latest" AS
 SELECT id,
    external_job_url,
    job_title,
    company_name,
    location,
    posted_date,
    source,
    source_company_id,
    extracted_at,
    job_id,
    rn
   FROM ( SELECT jobs.id,
            jobs.external_job_url,
            jobs.job_title,
            jobs.company_name,
            jobs.location,
            jobs.posted_date,
            jobs.source,
            jobs.source_company_id,
            jobs.extracted_at,
            jobs.job_id,
            row_number() OVER (PARTITION BY jobs.job_id ORDER BY jobs.extracted_at DESC) AS rn
           FROM jobs) t
  WHERE rn = 1
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.jobs_latest_practical') is null then
    execute $view$
CREATE VIEW "public"."jobs_latest_practical" AS
 SELECT id,
    external_job_url,
    job_title,
    company_name,
    location,
    posted_date,
    source,
    source_company_id,
    extracted_at,
    job_id,
    rn
   FROM ( SELECT jobs.id,
            jobs.external_job_url,
            jobs.job_title,
            jobs.company_name,
            jobs.location,
            jobs.posted_date,
            jobs.source,
            jobs.source_company_id,
            jobs.extracted_at,
            jobs.job_id,
            row_number() OVER (PARTITION BY jobs.company_name, (lower(TRIM(BOTH FROM jobs.job_title))), (lower(TRIM(BOTH FROM COALESCE(jobs.location, ''::text)))) ORDER BY jobs.extracted_at DESC) AS rn
           FROM jobs) t
  WHERE rn = 1
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.hiring_leaderboard_malaysia') is null then
    execute $view$
CREATE VIEW "public"."hiring_leaderboard_malaysia" AS
 SELECT company_name,
    count(*) AS active_jobs
   FROM jobs_latest_practical
  WHERE company_name = ANY (ARRAY['Hong Leong Bank'::text, 'Affin Bank'::text, 'Maxis'::text, 'Becton Dickinson'::text, 'GX Bank'::text])
  GROUP BY company_name
  ORDER BY (count(*)) DESC, company_name
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.jobs_reporting') is null then
    execute $view$
CREATE VIEW "public"."jobs_reporting" AS
 SELECT id,
    external_job_url,
    job_title,
    company_name,
    location,
    posted_date,
    source,
    source_company_id,
    extracted_at,
    job_id,
    rn
   FROM jobs_latest_practical
  WHERE company_name = ANY (ARRAY['Maxis'::text, 'Shell'::text])
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.terrer_hiring_now') is null then
    execute $view$
CREATE VIEW "public"."terrer_hiring_now" AS
 SELECT company_name,
    count(*)::integer AS active_jobs
   FROM jobs_latest_practical
  WHERE company_name IS NOT NULL AND btrim(company_name) <> ''::text
  GROUP BY company_name
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.terrer_jobs_view') is null then
    execute $view$
CREATE VIEW "public"."terrer_jobs_view" AS
 SELECT j.id,
    c.company_name,
    j.job_title,
    j.city,
    j.country,
    j.status,
    j.source_type,
    j.source_url,
    j.created_at
   FROM terrer_jobs j
     LEFT JOIN terrer_companies c ON j.company_id = c.id
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.v_match_shortlist') is null then
    execute $view$
CREATE VIEW "public"."v_match_shortlist" AS
 SELECT match_id,
    job_id,
    candidate_id,
    final_score,
    match_status
   FROM job_candidate_matches m
  WHERE match_status = ANY (ARRAY['shortlisted'::text, 'submitted'::text])
  ORDER BY final_score DESC
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.v_outreach_due') is null then
    execute $view$
CREATE VIEW "public"."v_outreach_due" AS
 SELECT outreach_id,
    outreach_date,
    job_id,
    candidate_id,
    company_id,
    outreach_side,
    contact_person,
    channel,
    message_type,
    response_status,
    next_action_date,
    owner,
    notes,
    created_at
   FROM outreach_log
  WHERE next_action_date <= CURRENT_DATE
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.vw_candidate_search') is null then
    execute $view$
CREATE VIEW "public"."vw_candidate_search" AS
 SELECT c.candidate_id,
    c.display_name,
    c.full_name,
    c.country,
    c.city,
    c.primary_role,
    sp.source_name,
    sp.source_handle,
    sp.source_profile_url,
    csco.score,
    csco.score_reason,
    csco.scored_at,
    ( SELECT string_agg(DISTINCT s.skill_name, ', '::text ORDER BY s.skill_name) AS string_agg
           FROM candidate_skills csk
             JOIN skills s ON s.skill_id = csk.skill_id
          WHERE csk.candidate_id = c.candidate_id) AS top_skills,
    ( SELECT string_agg(DISTINCT cc.capability, ', '::text ORDER BY cc.capability) AS string_agg
           FROM candidate_capabilities cc
          WHERE cc.candidate_id = c.candidate_id) AS capabilities
   FROM candidates c
     LEFT JOIN source_profiles sp ON sp.candidate_id = c.candidate_id
     LEFT JOIN candidate_scores csco ON csco.candidate_id = c.candidate_id
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.vw_candidate_search_clean') is null then
    execute $view$
CREATE VIEW "public"."vw_candidate_search_clean" AS
 SELECT DISTINCT ON (candidate_id) candidate_id,
    display_name,
    full_name,
    country,
    city,
    primary_role,
    source_name,
    source_handle,
    source_profile_url,
    score,
    score_reason,
    top_skills,
    capabilities
   FROM vw_candidate_search
  ORDER BY candidate_id, scored_at DESC
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.vw_jobs_tier1_malaysia') is null then
    execute $view$
CREATE VIEW "public"."vw_jobs_tier1_malaysia" AS
 WITH tier1 AS (
         SELECT j.id,
            j.external_job_url,
            j.job_title,
            j.company_name,
            j.location,
            j.posted_date,
            j.source,
            j.source_company_id,
            j.extracted_at,
            j.job_id,
            j.company_id,
            j.updated_at,
            j.operational_status,
            j.last_seen_at,
            j.freshness_status,
            j.market_cluster,
            j.is_market_signal_eligible,
            j.market_signal_exclusion_reason,
            j.job_source_id,
            j.normalized_job_title,
            j.role_family,
            j.seniority,
            j.job_description_html,
            j.job_description_text,
            j.responsibilities,
            j.qualifications
           FROM jobs j
             LEFT JOIN job_sources js ON js.id = j.job_source_id
          WHERE js.tier = 'tier_1'::text OR (lower(COALESCE(j.source, ''::text)) = ANY (ARRAY['workday'::text, 'oracle'::text, 'manual_intake'::text]))
        ), malaysia_only AS (
         SELECT tier1.id,
            tier1.external_job_url,
            tier1.job_title,
            tier1.company_name,
            tier1.location,
            tier1.posted_date,
            tier1.source,
            tier1.source_company_id,
            tier1.extracted_at,
            tier1.job_id,
            tier1.company_id,
            tier1.updated_at,
            tier1.operational_status,
            tier1.last_seen_at,
            tier1.freshness_status,
            tier1.market_cluster,
            tier1.is_market_signal_eligible,
            tier1.market_signal_exclusion_reason,
            tier1.job_source_id,
            tier1.normalized_job_title,
            tier1.role_family,
            tier1.seniority,
            tier1.job_description_html,
            tier1.job_description_text,
            tier1.responsibilities,
            tier1.qualifications
           FROM tier1
          WHERE (lower(COALESCE(tier1.location, ''::text)) ~~ '%malaysia%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '%kuala lumpur%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '%selangor%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '%penang%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '%johor%'::text) AND NOT ((lower(COALESCE(tier1.location, ''::text)) ~~ '%brazil%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '%poland%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '% india%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '%singapore%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '%china%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '%europe%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '%united states%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '% usa%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '% us%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '%united kingdom%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '% uk%'::text OR lower(COALESCE(tier1.location, ''::text)) ~~ '%remote%'::text) AND lower(COALESCE(tier1.location, ''::text)) !~~ '%malaysia%'::text)
        )
 SELECT id,
    external_job_url,
    job_title,
    company_name,
    location,
    posted_date,
    source,
    source_company_id,
    extracted_at,
    job_id,
    company_id,
    updated_at,
    operational_status,
    last_seen_at,
    freshness_status,
    market_cluster,
    is_market_signal_eligible,
    market_signal_exclusion_reason,
    job_source_id,
    normalized_job_title,
    role_family,
    seniority,
    job_description_html,
    job_description_text,
    responsibilities,
    qualifications
   FROM malaysia_only
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.vw_market_signals') is null then
    execute $view$
CREATE VIEW "public"."vw_market_signals" AS
 SELECT market_cluster,
    freshness_status,
    count(*) AS role_count,
    count(DISTINCT company_name) AS company_count,
    array_agg(DISTINCT company_name) FILTER (WHERE company_name IS NOT NULL) AS companies,
    array_agg(DISTINCT location) FILTER (WHERE location IS NOT NULL) AS locations
   FROM jobs
  WHERE is_market_signal_eligible = true AND market_cluster IS NOT NULL
  GROUP BY market_cluster, freshness_status
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.vw_market_signals_active') is null then
    execute $view$
CREATE VIEW "public"."vw_market_signals_active" AS
 SELECT market_cluster,
    count(*) AS role_count,
    count(DISTINCT company_name) AS company_count,
    array_agg(DISTINCT company_name) AS companies,
    array_agg(DISTINCT location) AS locations
   FROM jobs
  WHERE freshness_status = 'active'::text
  GROUP BY market_cluster
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.vw_market_signals_realtime') is null then
    execute $view$
CREATE VIEW "public"."vw_market_signals_realtime" AS
 WITH base AS (
         SELECT j.id,
            j.external_job_url,
            j.job_title,
            j.company_name,
            j.location,
            j.posted_date,
            j.source,
            j.source_company_id,
            j.extracted_at,
            j.job_id,
            j.company_id,
            j.updated_at,
            j.operational_status,
            j.last_seen_at,
            j.freshness_status,
            j.market_cluster,
            j.is_market_signal_eligible,
            j.market_signal_exclusion_reason,
            COALESCE(j.updated_at, j.extracted_at::timestamp with time zone) AS signal_at
           FROM jobs j
        ), filtered AS (
         SELECT base.id,
            base.external_job_url,
            base.job_title,
            base.company_name,
            base.location,
            base.posted_date,
            base.source,
            base.source_company_id,
            base.extracted_at,
            base.job_id,
            base.company_id,
            base.updated_at,
            base.operational_status,
            base.last_seen_at,
            base.freshness_status,
            base.market_cluster,
            base.is_market_signal_eligible,
            base.market_signal_exclusion_reason,
            base.signal_at
           FROM base
          WHERE base.freshness_status = 'active'::text AND base.market_cluster IS NOT NULL AND base.signal_at >= (now() - '30 days'::interval)
        )
 SELECT id,
    job_id,
    job_title,
    company_name,
    location,
    market_cluster,
    source,
    source_company_id,
    external_job_url,
    posted_date,
    extracted_at,
    updated_at,
    freshness_status,
    signal_at,
        CASE
            WHEN signal_at >= (now() - '14 days'::interval) THEN 'core'::text
            ELSE 'recent'::text
        END AS signal_tier
   FROM filtered
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.vw_market_signals_recent') is null then
    execute $view$
CREATE VIEW "public"."vw_market_signals_recent" AS
 SELECT id,
    job_id,
    job_title,
    company_name,
    location,
    market_cluster,
    extracted_at::timestamp with time zone AS signal_at
   FROM jobs
  WHERE freshness_status = 'active'::text AND market_cluster IS NOT NULL AND extracted_at::timestamp with time zone >= (now() - '10 days'::interval)
  ORDER BY (extracted_at::timestamp with time zone) DESC
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.vw_tier1_source_health') is null then
    execute $view$
CREATE VIEW "public"."vw_tier1_source_health" AS
 WITH base AS (
         SELECT COALESCE(js.company_name, j.company_name, 'Unknown'::text) AS company_name,
            COALESCE(js.source_name, j.source, 'unknown'::text) AS source,
            count(*) AS total_jobs,
            count(*) FILTER (WHERE lower(COALESCE(j.location, ''::text)) ~ '(malaysia|kuala lumpur|kl|selangor|penang|johor|cyberjaya|putrajaya|shah alam|petaling jaya|pj|subang|puchong|melaka|malacca|perak|sabah|sarawak)'::text) AS malaysia_jobs,
            count(*) FILTER (WHERE NULLIF(TRIM(BOTH FROM COALESCE(j.job_description_text, ''::text)), ''::text) IS NOT NULL AND length(TRIM(BOTH FROM COALESCE(j.job_description_text, ''::text))) >= 200) AS jobs_with_jd,
            max(j.updated_at) AS latest_updated_at
           FROM jobs j
             LEFT JOIN job_sources js ON js.id = j.job_source_id
          WHERE (COALESCE(lower(js.tier), '1'::text) = ANY (ARRAY['1'::text, 'tier 1'::text, 'tier_1'::text, 'tier1'::text])) OR (lower(COALESCE(j.source, ''::text)) = ANY (ARRAY['workday'::text, 'oracle'::text]))
          GROUP BY (COALESCE(js.company_name, j.company_name, 'Unknown'::text)), (COALESCE(js.source_name, j.source, 'unknown'::text))
        ), scored AS (
         SELECT base.company_name,
            base.source,
            base.total_jobs,
            base.malaysia_jobs,
            base.jobs_with_jd,
            base.latest_updated_at,
            round(
                CASE
                    WHEN base.total_jobs = 0 THEN 0::numeric
                    ELSE base.jobs_with_jd::numeric / base.total_jobs::numeric * 100::numeric
                END, 1) AS jd_coverage_pct,
            round(
                CASE
                    WHEN base.total_jobs = 0 THEN 0::numeric
                    ELSE base.malaysia_jobs::numeric / base.total_jobs::numeric * 100::numeric
                END, 1) AS malaysia_coverage_pct
           FROM base
        ), classified AS (
         SELECT scored.company_name,
            scored.source,
            scored.total_jobs,
            scored.malaysia_jobs,
            scored.jobs_with_jd,
            scored.latest_updated_at,
            scored.jd_coverage_pct,
            scored.malaysia_coverage_pct,
                CASE
                    WHEN scored.total_jobs = 0 THEN 'Broken'::text
                    WHEN scored.malaysia_jobs = 0 AND scored.total_jobs >= 20 THEN 'Noisy'::text
                    WHEN scored.jd_coverage_pct >= 60::numeric AND scored.malaysia_coverage_pct >= 50::numeric THEN 'Healthy'::text
                    WHEN scored.jd_coverage_pct >= 20::numeric AND scored.malaysia_jobs > 0 THEN 'Partial'::text
                    WHEN scored.jd_coverage_pct < 20::numeric AND scored.malaysia_jobs > 0 THEN 'Partial'::text
                    ELSE 'Broken'::text
                END AS health_status
           FROM scored
        )
 SELECT company_name,
    source,
    total_jobs,
    malaysia_jobs,
    jobs_with_jd,
    latest_updated_at,
    jd_coverage_pct,
    malaysia_coverage_pct,
    health_status
   FROM classified
  ORDER BY (
        CASE
            WHEN health_status = 'Healthy'::text THEN 1
            WHEN health_status = 'Partial'::text THEN 2
            WHEN health_status = 'Noisy'::text THEN 3
            WHEN health_status = 'Broken'::text THEN 4
            ELSE 5
        END), jobs_with_jd DESC, total_jobs DESC
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.vw_tier1_source_health_v2') is null then
    execute $view$
CREATE VIEW "public"."vw_tier1_source_health_v2" AS
 SELECT company_name,
    source,
    total_jobs,
    malaysia_jobs,
    jobs_with_jd,
    latest_updated_at,
    jd_coverage_pct,
    malaysia_coverage_pct,
    health_status,
        CASE
            WHEN total_jobs = 0 THEN 'Broken'::text
            WHEN malaysia_jobs = 0 AND total_jobs >= 5 THEN 'Broken'::text
            WHEN total_jobs >= 15 AND jd_coverage_pct >= 60::numeric AND malaysia_coverage_pct >= 50::numeric THEN 'Healthy'::text
            WHEN total_jobs < 15 AND jd_coverage_pct >= 60::numeric AND malaysia_coverage_pct >= 50::numeric THEN 'Healthy - Small Sample'::text
            WHEN total_jobs >= 100 AND malaysia_coverage_pct < 40::numeric THEN 'Noisy'::text
            WHEN malaysia_jobs > 0 OR jobs_with_jd > 0 THEN 'Partial'::text
            ELSE 'Broken'::text
        END AS refined_health_status
   FROM vw_tier1_source_health
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.vw_tier1_source_diagnostics') is null then
    execute $view$
CREATE VIEW "public"."vw_tier1_source_diagnostics" AS
 SELECT company_name,
    source,
    total_jobs,
    malaysia_jobs,
    jobs_with_jd,
    total_jobs - jobs_with_jd AS jobs_missing_jd,
    total_jobs - malaysia_jobs AS non_malaysia_jobs,
    latest_updated_at,
        CASE
            WHEN latest_updated_at < (now() - '30 days'::interval) THEN true
            ELSE false
        END AS is_stale,
        CASE
            WHEN refined_health_status = 'Noisy'::text THEN 'Low Malaysia relevance'::text
            WHEN refined_health_status = 'Broken'::text AND malaysia_jobs = 0 THEN 'No Malaysia jobs detected'::text
            WHEN refined_health_status = 'Broken'::text AND jobs_with_jd = 0 THEN 'JD extraction failure'::text
            WHEN refined_health_status = 'Partial'::text AND (total_jobs - jobs_with_jd) > malaysia_jobs THEN 'Low JD enrichment coverage'::text
            WHEN refined_health_status = 'Partial'::text THEN 'Needs controlled enrichment'::text
            WHEN refined_health_status ~~ 'Healthy%'::text THEN 'Operationally healthy'::text
            ELSE 'Needs investigation'::text
        END AS dominant_failure_reason,
    refined_health_status
   FROM vw_tier1_source_health_v2
  ORDER BY (
        CASE
            WHEN refined_health_status = 'Broken'::text THEN 1
            WHEN refined_health_status = 'Noisy'::text THEN 2
            WHEN refined_health_status = 'Partial'::text THEN 3
            WHEN refined_health_status ~~ 'Healthy%'::text THEN 4
            ELSE 5
        END), (total_jobs - jobs_with_jd) DESC, (total_jobs - malaysia_jobs) DESC
$view$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.vw_tier1_source_health_summary') is null then
    execute $view$
CREATE VIEW "public"."vw_tier1_source_health_summary" AS
 SELECT count(*) FILTER (WHERE refined_health_status = 'Healthy'::text) AS healthy_sources,
    count(*) FILTER (WHERE refined_health_status = 'Healthy - Small Sample'::text) AS healthy_small_sample_sources,
    count(*) FILTER (WHERE refined_health_status = 'Partial'::text) AS partial_sources,
    count(*) FILTER (WHERE refined_health_status = 'Noisy'::text) AS noisy_sources,
    count(*) FILTER (WHERE refined_health_status = 'Broken'::text) AS broken_sources,
    sum(malaysia_jobs) AS total_malaysia_jobs,
    sum(jobs_with_jd) AS total_jobs_with_jd,
    round(
        CASE
            WHEN sum(total_jobs) = 0::numeric THEN 0::numeric
            ELSE sum(jobs_with_jd) / sum(total_jobs) * 100::numeric
        END, 1) AS overall_jd_coverage_pct,
    max(latest_updated_at) AS latest_pipeline_activity
   FROM vw_tier1_source_health_v2
$view$;
  end if;
end $$;
