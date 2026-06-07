-- Terrer authoritative live schema capture
-- Captured at UTC: Sun Jun 07 2026 05:07:53 GMT+0800 (Malaysia Time)
-- Catalog-derived, schema-only, no production row data.

CREATE SEQUENCE "public"."companies_id_seq"
  AS bigint
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 9223372036854775807
  START WITH 1
  CACHE 1
  NO CYCLE;

CREATE TABLE "public"."activity_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "submission_id" uuid,
  "entity_type" text COLLATE "pg_catalog"."default",
  "entity_id" text COLLATE "pg_catalog"."default",
  "activity_type" text COLLATE "pg_catalog"."default",
  "activity_channel" text COLLATE "pg_catalog"."default",
  "activity_direction" text COLLATE "pg_catalog"."default",
  "subject_line" text COLLATE "pg_catalog"."default",
  "message_summary" text COLLATE "pg_catalog"."default",
  "occurred_at" timestamp with time zone DEFAULT now(),
  "next_action_at" timestamp with time zone,
  "created_by" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."activity_log" OWNER TO "postgres";
ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ai_assessments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL,
  "candidate_id" uuid NOT NULL,
  "layer1_score" numeric,
  "ai_score" numeric,
  "ranking_adjustment" integer,
  "overall_recommendation" text COLLATE "pg_catalog"."default",
  "confidence" text COLLATE "pg_catalog"."default",
  "strengths" text[] COLLATE "pg_catalog"."default",
  "concerns" text[] COLLATE "pg_catalog"."default",
  "reasoning_summary" text COLLATE "pg_catalog"."default",
  "verification_notes" text[] COLLATE "pg_catalog"."default",
  "missing_information" text[] COLLATE "pg_catalog"."default",
  "submission_ready" boolean DEFAULT false,
  "model_used" text COLLATE "pg_catalog"."default",
  "model_version" text COLLATE "pg_catalog"."default",
  "assessed_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."ai_assessments" OWNER TO "postgres";
ALTER TABLE "public"."ai_assessments" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."applications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL,
  "candidate_id" uuid NOT NULL,
  "source" text COLLATE "pg_catalog"."default",
  "source_details" text COLLATE "pg_catalog"."default",
  "application_status" text COLLATE "pg_catalog"."default" DEFAULT 'new'::text,
  "raw_application_data" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."applications" OWNER TO "postgres";
ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."autonomous_recruiter_memory" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "memory_type" text COLLATE "pg_catalog"."default",
  "role_family" text COLLATE "pg_catalog"."default",
  "job_title" text COLLATE "pg_catalog"."default",
  "skills" text COLLATE "pg_catalog"."default",
  "location" text COLLATE "pg_catalog"."default",
  "successful_strategy" text COLLATE "pg_catalog"."default",
  "failed_strategy" text COLLATE "pg_catalog"."default",
  "recommended_query_pattern" text COLLATE "pg_catalog"."default",
  "recommended_next_move" text COLLATE "pg_catalog"."default",
  "recruiter_confidence_level" text COLLATE "pg_catalog"."default",
  "recruiter_confidence_score" integer,
  "sourcing_signal_flags" jsonb,
  "sourcing_risk_flags" jsonb,
  "total_candidates" integer,
  "successful_run" boolean,
  "source_run_id" uuid,
  "notes" text COLLATE "pg_catalog"."default",
  "memory_payload" jsonb
);
ALTER TABLE "public"."autonomous_recruiter_memory" OWNER TO "postgres";
ALTER TABLE "public"."autonomous_recruiter_memory" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."autonomous_recruiter_runs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "run_timestamp" timestamp with time zone,
  "mode" text COLLATE "pg_catalog"."default",
  "job_title" text COLLATE "pg_catalog"."default",
  "skills" text COLLATE "pg_catalog"."default",
  "location" text COLLATE "pg_catalog"."default",
  "seniority" text COLLATE "pg_catalog"."default",
  "total_candidates" integer,
  "strategy_count" integer,
  "best_strategy" text COLLATE "pg_catalog"."default",
  "weakest_strategy" text COLLATE "pg_catalog"."default",
  "query_quality_label" text COLLATE "pg_catalog"."default",
  "next_run_priority" text COLLATE "pg_catalog"."default",
  "recommended_next_search_focus" text COLLATE "pg_catalog"."default",
  "recommended_query_adjustments" jsonb,
  "winning_variant" text COLLATE "pg_catalog"."default",
  "reason_winning_variant" text COLLATE "pg_catalog"."default",
  "recommended_next_action" text COLLATE "pg_catalog"."default",
  "run_status" text COLLATE "pg_catalog"."default",
  "app_demo_summary" jsonb,
  "candidates_path" text COLLATE "pg_catalog"."default",
  "recruiter_report_path" text COLLATE "pg_catalog"."default",
  "agent_report_path" text COLLATE "pg_catalog"."default",
  "strategy_refinement_path" text COLLATE "pg_catalog"."default",
  "batch_summary_json_path" text COLLATE "pg_catalog"."default",
  "batch_summary_md_path" text COLLATE "pg_catalog"."default",
  "recruiter_confidence_level" text COLLATE "pg_catalog"."default",
  "recruiter_confidence_score" integer,
  "sourcing_signal_summary" text COLLATE "pg_catalog"."default",
  "sourcing_signal_flags" jsonb,
  "sourcing_risk_flags" jsonb,
  "iteration_mode" boolean DEFAULT false,
  "iteration_count" integer,
  "best_iteration" integer,
  "stopping_reason" text COLLATE "pg_catalog"."default",
  "iteration_summary" jsonb
);
ALTER TABLE "public"."autonomous_recruiter_runs" OWNER TO "postgres";
ALTER TABLE "public"."autonomous_recruiter_runs" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."bd_contacts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" bigint,
  "full_name" text COLLATE "pg_catalog"."default" NOT NULL,
  "first_name" text COLLATE "pg_catalog"."default",
  "last_name" text COLLATE "pg_catalog"."default",
  "email" text COLLATE "pg_catalog"."default",
  "phone" text COLLATE "pg_catalog"."default",
  "mobile_phone" text COLLATE "pg_catalog"."default",
  "job_title" text COLLATE "pg_catalog"."default",
  "department" text COLLATE "pg_catalog"."default",
  "relationship_status" text COLLATE "pg_catalog"."default" DEFAULT 'new'::text,
  "contact_type" text COLLATE "pg_catalog"."default" DEFAULT 'client_contact'::text,
  "source" text COLLATE "pg_catalog"."default" DEFAULT 'legacy_bd_list'::text,
  "notes" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "next_action" text COLLATE "pg_catalog"."default",
  "next_action_date" date,
  "last_contacted_at" timestamp with time zone
);
ALTER TABLE "public"."bd_contacts" OWNER TO "postgres";
ALTER TABLE "public"."bd_contacts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."bd_notes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" bigint NOT NULL,
  "contact_id" uuid,
  "note_body" text COLLATE "pg_catalog"."default" NOT NULL,
  "note_type" text COLLATE "pg_catalog"."default" DEFAULT 'general'::text NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."bd_notes" OWNER TO "postgres";
ALTER TABLE "public"."bd_notes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."candidate_capabilities" (
  "candidate_id" uuid,
  "capability" text COLLATE "pg_catalog"."default",
  "created_at" timestamp without time zone
);
ALTER TABLE "public"."candidate_capabilities" OWNER TO "postgres";

CREATE TABLE "public"."candidate_scores" (
  "candidate_id" uuid,
  "display_name" text COLLATE "pg_catalog"."default",
  "full_name" text COLLATE "pg_catalog"."default",
  "city" text COLLATE "pg_catalog"."default",
  "primary_role" text COLLATE "pg_catalog"."default",
  "repos" numeric,
  "followers" numeric,
  "capabilities" text COLLATE "pg_catalog"."default",
  "score" numeric,
  "score_reason" text COLLATE "pg_catalog"."default",
  "scored_at" timestamp without time zone
);
ALTER TABLE "public"."candidate_scores" OWNER TO "postgres";

CREATE TABLE "public"."candidate_skills" (
  "candidate_id" uuid,
  "skill_id" uuid,
  "source_profile_id" uuid,
  "evidence_id" uuid,
  "proficiency_score" numeric
);
ALTER TABLE "public"."candidate_skills" OWNER TO "postgres";
ALTER TABLE "public"."candidate_skills" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."candidates" (
  "candidate_id" uuid NOT NULL,
  "display_name" text COLLATE "pg_catalog"."default",
  "full_name" text COLLATE "pg_catalog"."default",
  "country" text COLLATE "pg_catalog"."default",
  "city" text COLLATE "pg_catalog"."default",
  "primary_role" text COLLATE "pg_catalog"."default",
  "dedup_hash" text COLLATE "pg_catalog"."default",
  "created_at" timestamp without time zone,
  "updated_at" timestamp without time zone,
  "email" text COLLATE "pg_catalog"."default",
  "phone" text COLLATE "pg_catalog"."default",
  "linkedin_url" text COLLATE "pg_catalog"."default",
  "github_url" text COLLATE "pg_catalog"."default",
  "score_total" numeric,
  "tier_label" text COLLATE "pg_catalog"."default",
  "contactability_status" text COLLATE "pg_catalog"."default",
  "candidate_status" text COLLATE "pg_catalog"."default" DEFAULT 'active'::text,
  "source_type" text COLLATE "pg_catalog"."default",
  "notes" text COLLATE "pg_catalog"."default",
  "resume_url" text COLLATE "pg_catalog"."default",
  "target_role" text COLLATE "pg_catalog"."default",
  "target_seniority" text COLLATE "pg_catalog"."default",
  "job_priorities" text[] COLLATE "pg_catalog"."default",
  "salary_expectation_min" numeric,
  "salary_expectation_max" numeric,
  "location_preference" text COLLATE "pg_catalog"."default",
  "notice_period" text COLLATE "pg_catalog"."default",
  "career_confidence" text COLLATE "pg_catalog"."default",
  "representation_opt_in" boolean DEFAULT false,
  "counsellor_completed_at" timestamp with time zone,
  "current_role" text COLLATE "pg_catalog"."default",
  "years_experience" numeric,
  "key_skills" text[] COLLATE "pg_catalog"."default",
  "salary_expectation_currency" text COLLATE "pg_catalog"."default" DEFAULT 'MYR'::text,
  "profile_capture_mode" text COLLATE "pg_catalog"."default",
  "profile_completeness_status" text COLLATE "pg_catalog"."default",
  "candidate_consent_given" boolean,
  "candidate_consent_at" timestamp with time zone,
  "candidate_consent_text" text COLLATE "pg_catalog"."default",
  "candidate_consent_version" text COLLATE "pg_catalog"."default",
  "representation_status" text COLLATE "pg_catalog"."default"
);
ALTER TABLE "public"."candidates" OWNER TO "postgres";

CREATE TABLE "public"."companies" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "company_name" text COLLATE "pg_catalog"."default",
  "company_slug" text COLLATE "pg_catalog"."default",
  "website_url" text COLLATE "pg_catalog"."default",
  "linkedin_url" text COLLATE "pg_catalog"."default",
  "hq_country" text COLLATE "pg_catalog"."default",
  "primary_city" text COLLATE "pg_catalog"."default",
  "company_status" text COLLATE "pg_catalog"."default" DEFAULT 'active'::text,
  "source_type" text COLLATE "pg_catalog"."default",
  "notes" text COLLATE "pg_catalog"."default",
  "updated_at" timestamp with time zone DEFAULT now(),
  "career_url" text COLLATE "pg_catalog"."default",
  "ats_family" text COLLATE "pg_catalog"."default",
  "source_confidence" integer,
  "source_status" text COLLATE "pg_catalog"."default",
  "source_notes" text COLLATE "pg_catalog"."default",
  "last_enriched_at" timestamp with time zone,
  "last_checked_at" timestamp with time zone
);
ALTER TABLE "public"."companies" OWNER TO "postgres";
ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."company_identity_merge_v1_snapshot" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "merge_batch" text COLLATE "pg_catalog"."default" NOT NULL,
  "entity_type" text COLLATE "pg_catalog"."default" NOT NULL,
  "entity_id" text COLLATE "pg_catalog"."default" NOT NULL,
  "source_company_id" bigint NOT NULL,
  "destination_company_id" bigint NOT NULL,
  "source_company_name" text COLLATE "pg_catalog"."default",
  "destination_company_name" text COLLATE "pg_catalog"."default",
  "previous_company_status" text COLLATE "pg_catalog"."default",
  "previous_source_notes" text COLLATE "pg_catalog"."default",
  "captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."company_identity_merge_v1_snapshot" OWNER TO "postgres";
ALTER TABLE "public"."company_identity_merge_v1_snapshot" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."employer_intake_actions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employer_job_intake_id" uuid,
  "action_type" text COLLATE "pg_catalog"."default" NOT NULL,
  "employer_note" text COLLATE "pg_catalog"."default",
  "status" text COLLATE "pg_catalog"."default" DEFAULT 'new'::text,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."employer_intake_actions" OWNER TO "postgres";
ALTER TABLE "public"."employer_intake_actions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."employer_job_intake" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_name" text COLLATE "pg_catalog"."default" NOT NULL,
  "contact_name" text COLLATE "pg_catalog"."default",
  "contact_email" text COLLATE "pg_catalog"."default" NOT NULL,
  "contact_phone" text COLLATE "pg_catalog"."default",
  "job_title" text COLLATE "pg_catalog"."default" NOT NULL,
  "location" text COLLATE "pg_catalog"."default",
  "employment_type" text COLLATE "pg_catalog"."default",
  "salary_min" numeric,
  "salary_max" numeric,
  "currency" text COLLATE "pg_catalog"."default" DEFAULT 'MYR'::text,
  "job_description" text COLLATE "pg_catalog"."default",
  "required_skills" text[] COLLATE "pg_catalog"."default" DEFAULT '{}'::text[],
  "nice_to_have_skills" text[] COLLATE "pg_catalog"."default" DEFAULT '{}'::text[],
  "seniority" text COLLATE "pg_catalog"."default",
  "source" text COLLATE "pg_catalog"."default" DEFAULT 'web_employer_intake'::text,
  "submission_fingerprint" text COLLATE "pg_catalog"."default",
  "status" text COLLATE "pg_catalog"."default" DEFAULT 'new'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  "company_industry" text COLLATE "pg_catalog"."default",
  "company_size" text COLLATE "pg_catalog"."default",
  "company_website" text COLLATE "pg_catalog"."default",
  "salary_currency" text COLLATE "pg_catalog"."default" DEFAULT 'MYR'::text,
  "workplace_type" text COLLATE "pg_catalog"."default",
  "hiring_urgency" text COLLATE "pg_catalog"."default",
  "replacement_or_new_role" text COLLATE "pg_catalog"."default",
  "number_of_openings" integer,
  "benefits" text COLLATE "pg_catalog"."default",
  "notes" text COLLATE "pg_catalog"."default",
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."employer_job_intake" OWNER TO "postgres";
ALTER TABLE "public"."employer_job_intake" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."evidence_signals" (
  "evidence_id" uuid NOT NULL,
  "profile_id" uuid,
  "signal_name" text COLLATE "pg_catalog"."default",
  "signal_value" text COLLATE "pg_catalog"."default",
  "signal_ts" timestamp without time zone
);
ALTER TABLE "public"."evidence_signals" OWNER TO "postgres";

CREATE TABLE "public"."job_candidate_matches" (
  "match_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL,
  "candidate_id" uuid NOT NULL,
  "skill_match_score" integer DEFAULT 0,
  "title_match_score" integer DEFAULT 0,
  "seniority_match_score" integer DEFAULT 0,
  "location_match_score" integer DEFAULT 0,
  "manual_adjustment" integer DEFAULT 0,
  "final_score" integer GENERATED ALWAYS AS (((((skill_match_score + title_match_score) + seniority_match_score) + location_match_score) + manual_adjustment)) STORED,
  "match_reason" text COLLATE "pg_catalog"."default",
  "match_status" text COLLATE "pg_catalog"."default" DEFAULT 'suggested'::text,
  "reviewed_by" text COLLATE "pg_catalog"."default",
  "reviewed_at" timestamp with time zone,
  "notes" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."job_candidate_matches" OWNER TO "postgres";

CREATE TABLE "public"."job_requirements" (
  "job_requirement_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL,
  "skill_name" text COLLATE "pg_catalog"."default" NOT NULL,
  "requirement_type" text COLLATE "pg_catalog"."default",
  "min_years" numeric,
  "weight" integer,
  "notes" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."job_requirements" OWNER TO "postgres";
ALTER TABLE "public"."job_requirements" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."job_sources" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_name" text COLLATE "pg_catalog"."default" NOT NULL,
  "source_name" text COLLATE "pg_catalog"."default" NOT NULL,
  "source_url" text COLLATE "pg_catalog"."default" NOT NULL,
  "source_type" text COLLATE "pg_catalog"."default" DEFAULT 'unknown'::text NOT NULL,
  "ats_family" text COLLATE "pg_catalog"."default",
  "tier" text COLLATE "pg_catalog"."default" DEFAULT 'tier_3'::text NOT NULL,
  "trust_score" integer DEFAULT 0 NOT NULL,
  "country" text COLLATE "pg_catalog"."default",
  "market" text COLLATE "pg_catalog"."default",
  "extraction_method" text COLLATE "pg_catalog"."default",
  "status" text COLLATE "pg_catalog"."default" DEFAULT 'active'::text NOT NULL,
  "last_checked_at" timestamp with time zone,
  "last_success_at" timestamp with time zone,
  "notes" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_run_at" timestamp with time zone,
  "last_successful_run" timestamp with time zone,
  "last_job_count" integer,
  "malaysia_job_count" integer,
  "jobs_with_jd_count" integer,
  "jd_coverage_pct" numeric,
  "malaysia_coverage_pct" numeric,
  "source_health_status" text COLLATE "pg_catalog"."default",
  "dominant_failure_reason" text COLLATE "pg_catalog"."default",
  "operational_notes" text COLLATE "pg_catalog"."default",
  "canonical_source_key" text COLLATE "pg_catalog"."default"
);
ALTER TABLE "public"."job_sources" OWNER TO "postgres";
ALTER TABLE "public"."job_sources" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."jobs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "external_job_url" text COLLATE "pg_catalog"."default",
  "job_title" text COLLATE "pg_catalog"."default",
  "company_name" text COLLATE "pg_catalog"."default",
  "location" text COLLATE "pg_catalog"."default",
  "posted_date" text COLLATE "pg_catalog"."default",
  "source" text COLLATE "pg_catalog"."default",
  "source_company_id" text COLLATE "pg_catalog"."default",
  "extracted_at" timestamp without time zone,
  "job_id" text COLLATE "pg_catalog"."default",
  "company_id" bigint,
  "updated_at" timestamp with time zone DEFAULT now(),
  "operational_status" text COLLATE "pg_catalog"."default" DEFAULT 'not_started'::text NOT NULL,
  "last_seen_at" timestamp with time zone,
  "freshness_status" text COLLATE "pg_catalog"."default" DEFAULT 'unknown'::text,
  "market_cluster" text COLLATE "pg_catalog"."default",
  "is_market_signal_eligible" boolean DEFAULT true,
  "market_signal_exclusion_reason" text COLLATE "pg_catalog"."default",
  "job_source_id" uuid,
  "normalized_job_title" text COLLATE "pg_catalog"."default",
  "role_family" text COLLATE "pg_catalog"."default",
  "seniority" text COLLATE "pg_catalog"."default",
  "job_description_html" text COLLATE "pg_catalog"."default",
  "job_description_text" text COLLATE "pg_catalog"."default",
  "responsibilities" text COLLATE "pg_catalog"."default",
  "qualifications" text COLLATE "pg_catalog"."default"
);
ALTER TABLE "public"."jobs" OWNER TO "postgres";
ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."jobs_intake" (
  "job_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_title" text COLLATE "pg_catalog"."default",
  "company_name" text COLLATE "pg_catalog"."default",
  "location" text COLLATE "pg_catalog"."default",
  "work_mode" text COLLATE "pg_catalog"."default",
  "seniority" text COLLATE "pg_catalog"."default",
  "skills" text[] COLLATE "pg_catalog"."default",
  "raw_input" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now(),
  "created_by" text COLLATE "pg_catalog"."default",
  "status" text COLLATE "pg_catalog"."default" DEFAULT 'active'::text,
  "others_notes" text COLLATE "pg_catalog"."default"
);
ALTER TABLE "public"."jobs_intake" OWNER TO "postgres";
ALTER TABLE "public"."jobs_intake" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."match_interactions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "timestamp" timestamp with time zone DEFAULT now(),
  "job_id" uuid,
  "event_type" text COLLATE "pg_catalog"."default",
  "source_tier" text COLLATE "pg_catalog"."default",
  "candidate_id" uuid,
  "candidate_email" text COLLATE "pg_catalog"."default"
);
ALTER TABLE "public"."match_interactions" OWNER TO "postgres";
ALTER TABLE "public"."match_interactions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."outreach_log" (
  "outreach_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "outreach_date" timestamp with time zone DEFAULT now(),
  "job_id" uuid,
  "candidate_id" uuid,
  "company_id" uuid,
  "outreach_side" text COLLATE "pg_catalog"."default",
  "contact_person" text COLLATE "pg_catalog"."default",
  "channel" text COLLATE "pg_catalog"."default",
  "message_type" text COLLATE "pg_catalog"."default",
  "response_status" text COLLATE "pg_catalog"."default" DEFAULT 'no_reply'::text,
  "next_action_date" date,
  "owner" text COLLATE "pg_catalog"."default",
  "notes" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."outreach_log" OWNER TO "postgres";

CREATE TABLE "public"."profiles" (
  "id" uuid NOT NULL,
  "email" text COLLATE "pg_catalog"."default",
  "full_name" text COLLATE "pg_catalog"."default",
  "role" text COLLATE "pg_catalog"."default" DEFAULT 'recruiter'::text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."profiles" OWNER TO "postgres";
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."skills" (
  "skill_id" uuid NOT NULL,
  "skill_name" text COLLATE "pg_catalog"."default"
);
ALTER TABLE "public"."skills" OWNER TO "postgres";

CREATE TABLE "public"."source_profiles" (
  "profile_id" uuid NOT NULL,
  "candidate_id" uuid,
  "source_name" text COLLATE "pg_catalog"."default",
  "source_profile_url" text COLLATE "pg_catalog"."default",
  "source_handle" text COLLATE "pg_catalog"."default",
  "source_user_id" text COLLATE "pg_catalog"."default",
  "scraped_at" timestamp without time zone
);
ALTER TABLE "public"."source_profiles" OWNER TO "postgres";

CREATE TABLE "public"."staging_bullhorn_companies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "source_batch" text COLLATE "pg_catalog"."default",
  "source_image" text COLLATE "pg_catalog"."default",
  "bullhorn_contact_id" text COLLATE "pg_catalog"."default",
  "company_name" text COLLATE "pg_catalog"."default",
  "company_status" text COLLATE "pg_catalog"."default",
  "company_main_phone" text COLLATE "pg_catalog"."default",
  "address" text COLLATE "pg_catalog"."default",
  "parent_company_key" text COLLATE "pg_catalog"."default",
  "extraction_confidence" text COLLATE "pg_catalog"."default",
  "hallucination_risk" text COLLATE "pg_catalog"."default",
  "reviewer_status" text COLLATE "pg_catalog"."default",
  "merge_recommendation" text COLLATE "pg_catalog"."default",
  "possible_duplicate_group" text COLLATE "pg_catalog"."default",
  "classification_reason" text COLLATE "pg_catalog"."default",
  "classification_confidence" text COLLATE "pg_catalog"."default",
  "raw_row" jsonb,
  "import_status" text COLLATE "pg_catalog"."default" DEFAULT 'pending'::text,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."staging_bullhorn_companies" OWNER TO "postgres";
ALTER TABLE "public"."staging_bullhorn_companies" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."staging_bullhorn_contacts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "source_batch" text COLLATE "pg_catalog"."default",
  "source_image" text COLLATE "pg_catalog"."default",
  "bullhorn_contact_id" text COLLATE "pg_catalog"."default",
  "first_name" text COLLATE "pg_catalog"."default",
  "last_name" text COLLATE "pg_catalog"."default",
  "full_name" text COLLATE "pg_catalog"."default",
  "company_name" text COLLATE "pg_catalog"."default",
  "company_key" text COLLATE "pg_catalog"."default",
  "direct_phone" text COLLATE "pg_catalog"."default",
  "mobile_phone" text COLLATE "pg_catalog"."default",
  "email_1" text COLLATE "pg_catalog"."default",
  "email_2" text COLLATE "pg_catalog"."default",
  "occupation_title" text COLLATE "pg_catalog"."default",
  "status" text COLLATE "pg_catalog"."default",
  "date_added" text COLLATE "pg_catalog"."default",
  "notes" text COLLATE "pg_catalog"."default",
  "screenshot_type" text COLLATE "pg_catalog"."default",
  "extracted_text_evidence" text COLLATE "pg_catalog"."default",
  "extraction_confidence" text COLLATE "pg_catalog"."default",
  "uncertain_fields" text COLLATE "pg_catalog"."default",
  "hallucination_risk" text COLLATE "pg_catalog"."default",
  "reviewer_status" text COLLATE "pg_catalog"."default",
  "reviewer_notes" text COLLATE "pg_catalog"."default",
  "merge_recommendation" text COLLATE "pg_catalog"."default",
  "possible_duplicate_group" text COLLATE "pg_catalog"."default",
  "classification_reason" text COLLATE "pg_catalog"."default",
  "classification_confidence" text COLLATE "pg_catalog"."default",
  "extraction_version" text COLLATE "pg_catalog"."default",
  "raw_row" jsonb,
  "import_status" text COLLATE "pg_catalog"."default" DEFAULT 'pending'::text,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."staging_bullhorn_contacts" OWNER TO "postgres";
ALTER TABLE "public"."staging_bullhorn_contacts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."submissions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid,
  "candidate_id" uuid,
  "company_id" bigint,
  "match_score" numeric,
  "shortlist_rank" integer,
  "submission_stage" text COLLATE "pg_catalog"."default" DEFAULT 'identified'::text,
  "stage_updated_at" timestamp with time zone DEFAULT now(),
  "submitted_to_client_at" timestamp with time zone,
  "owner_name" text COLLATE "pg_catalog"."default",
  "decision_reason" text COLLATE "pg_catalog"."default",
  "outcome" text COLLATE "pg_catalog"."default",
  "notes" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "next_action_date" date,
  "submission_summary" text COLLATE "pg_catalog"."default",
  "submission_strengths" text[] COLLATE "pg_catalog"."default",
  "submission_concerns" text[] COLLATE "pg_catalog"."default",
  "submission_full_text" text COLLATE "pg_catalog"."default",
  "submission_generated_at" timestamp with time zone
);
ALTER TABLE "public"."submissions" OWNER TO "postgres";
ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."target_companies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_name" text COLLATE "pg_catalog"."default" NOT NULL,
  "sector" text COLLATE "pg_catalog"."default",
  "priority" text COLLATE "pg_catalog"."default" DEFAULT 'High'::text,
  "market_cluster" text COLLATE "pg_catalog"."default",
  "source_type" text COLLATE "pg_catalog"."default",
  "careers_url" text COLLATE "pg_catalog"."default",
  "is_active" boolean DEFAULT true,
  "notes" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "source_status" text COLLATE "pg_catalog"."default" DEFAULT 'unverified'::text,
  "signal_confidence" text COLLATE "pg_catalog"."default" DEFAULT 'unknown'::text
);
ALTER TABLE "public"."target_companies" OWNER TO "postgres";
ALTER TABLE "public"."target_companies" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."terrer_candidates" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "full_name" text COLLATE "pg_catalog"."default" NOT NULL,
  "current_title" text COLLATE "pg_catalog"."default",
  "normalized_title" text COLLATE "pg_catalog"."default",
  "city" text COLLATE "pg_catalog"."default",
  "state" text COLLATE "pg_catalog"."default",
  "country" text COLLATE "pg_catalog"."default" DEFAULT 'Malaysia'::text,
  "email" text COLLATE "pg_catalog"."default",
  "phone" text COLLATE "pg_catalog"."default",
  "linkedin_url" text COLLATE "pg_catalog"."default",
  "github_url" text COLLATE "pg_catalog"."default",
  "portfolio_url" text COLLATE "pg_catalog"."default",
  "years_experience" numeric(4,1),
  "seniority_level" text COLLATE "pg_catalog"."default",
  "current_company" text COLLATE "pg_catalog"."default",
  "notice_period" text COLLATE "pg_catalog"."default",
  "preferred_work_mode" text COLLATE "pg_catalog"."default",
  "candidate_status" text COLLATE "pg_catalog"."default" DEFAULT 'new'::text,
  "source_origin" text COLLATE "pg_catalog"."default",
  "notes" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."terrer_candidates" OWNER TO "postgres";

CREATE TABLE "public"."terrer_companies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_name" text COLLATE "pg_catalog"."default" NOT NULL,
  "company_slug" text COLLATE "pg_catalog"."default" GENERATED ALWAYS AS (lower(regexp_replace(COALESCE(company_name, ''::text), '[^a-zA-Z0-9]+'::text, '-'::text, 'g'::text))) STORED,
  "website_url" text COLLATE "pg_catalog"."default",
  "linkedin_url" text COLLATE "pg_catalog"."default",
  "industry" text COLLATE "pg_catalog"."default",
  "company_size" text COLLATE "pg_catalog"."default",
  "headquarters_city" text COLLATE "pg_catalog"."default",
  "country" text COLLATE "pg_catalog"."default" DEFAULT 'Malaysia'::text,
  "hiring_status" text COLLATE "pg_catalog"."default" DEFAULT 'active'::text,
  "source_type" text COLLATE "pg_catalog"."default",
  "source_url" text COLLATE "pg_catalog"."default",
  "notes" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."terrer_companies" OWNER TO "postgres";

CREATE TABLE "public"."terrer_company_contacts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "full_name" text COLLATE "pg_catalog"."default",
  "job_title" text COLLATE "pg_catalog"."default",
  "email" text COLLATE "pg_catalog"."default",
  "phone" text COLLATE "pg_catalog"."default",
  "linkedin_url" text COLLATE "pg_catalog"."default",
  "contact_type" text COLLATE "pg_catalog"."default",
  "is_primary" boolean DEFAULT false NOT NULL,
  "source_url" text COLLATE "pg_catalog"."default",
  "notes" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."terrer_company_contacts" OWNER TO "postgres";

CREATE TABLE "public"."terrer_jobs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "external_job_id" text COLLATE "pg_catalog"."default",
  "job_title" text COLLATE "pg_catalog"."default" NOT NULL,
  "normalized_job_title" text COLLATE "pg_catalog"."default",
  "department" text COLLATE "pg_catalog"."default",
  "employment_type" text COLLATE "pg_catalog"."default",
  "seniority_level" text COLLATE "pg_catalog"."default",
  "work_mode" text COLLATE "pg_catalog"."default",
  "city" text COLLATE "pg_catalog"."default",
  "state" text COLLATE "pg_catalog"."default",
  "country" text COLLATE "pg_catalog"."default" DEFAULT 'Malaysia'::text,
  "salary_min" numeric(12,2),
  "salary_max" numeric(12,2),
  "salary_currency" text COLLATE "pg_catalog"."default" DEFAULT 'MYR'::text,
  "job_description_raw" text COLLATE "pg_catalog"."default",
  "job_summary" text COLLATE "pg_catalog"."default",
  "requirements_summary" text COLLATE "pg_catalog"."default",
  "posted_date" date,
  "expiry_date" date,
  "status" text COLLATE "pg_catalog"."default" DEFAULT 'active'::text NOT NULL,
  "source_type" text COLLATE "pg_catalog"."default",
  "source_url" text COLLATE "pg_catalog"."default",
  "first_seen_at" timestamp with time zone,
  "last_seen_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."terrer_jobs" OWNER TO "postgres";

CREATE TABLE "public"."terrer_pipeline" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL,
  "candidate_id" uuid NOT NULL,
  "company_contact_id" uuid,
  "match_score" numeric(5,2),
  "match_reason" text COLLATE "pg_catalog"."default",
  "pipeline_stage" text COLLATE "pg_catalog"."default" DEFAULT 'matched'::text NOT NULL,
  "outreach_status" text COLLATE "pg_catalog"."default" DEFAULT 'not_started'::text NOT NULL,
  "outreach_date" date,
  "submission_date" date,
  "interview_stage" text COLLATE "pg_catalog"."default",
  "employer_feedback" text COLLATE "pg_catalog"."default",
  "candidate_interest_status" text COLLATE "pg_catalog"."default",
  "placement_probability" numeric(5,2),
  "expected_fee" numeric(12,2),
  "actual_fee" numeric(12,2),
  "placed_date" date,
  "lost_reason" text COLLATE "pg_catalog"."default",
  "owner" text COLLATE "pg_catalog"."default",
  "notes" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."terrer_pipeline" OWNER TO "postgres";

CREATE TABLE "public"."terrer_skills" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "skill_name" text COLLATE "pg_catalog"."default" NOT NULL,
  "skill_slug" text COLLATE "pg_catalog"."default" GENERATED ALWAYS AS (lower(regexp_replace(COALESCE(skill_name, ''::text), '[^a-zA-Z0-9]+'::text, '-'::text, 'g'::text))) STORED,
  "skill_category" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."terrer_skills" OWNER TO "postgres";

CREATE TABLE "public"."web_candidate_intakes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "full_name" text COLLATE "pg_catalog"."default",
  "email" text COLLATE "pg_catalog"."default" NOT NULL,
  "phone" text COLLATE "pg_catalog"."default",
  "linkedin_url" text COLLATE "pg_catalog"."default",
  "current_job_title" text COLLATE "pg_catalog"."default",
  "preferred_role" text COLLATE "pg_catalog"."default",
  "location" text COLLATE "pg_catalog"."default",
  "resume_url" text COLLATE "pg_catalog"."default",
  "resume_file_name" text COLLATE "pg_catalog"."default",
  "source_page" text COLLATE "pg_catalog"."default",
  "source_job_id" uuid,
  "source_job_title" text COLLATE "pg_catalog"."default",
  "source_company" text COLLATE "pg_catalog"."default",
  "consent_to_contact" boolean DEFAULT false,
  "consent_to_store_profile" boolean DEFAULT false,
  "intake_status" text COLLATE "pg_catalog"."default" DEFAULT 'new'::text,
  "notes" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."web_candidate_intakes" OWNER TO "postgres";
ALTER TABLE "public"."web_candidate_intakes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."web_job_interest" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "candidate_id" uuid NOT NULL,
  "job_id" uuid NOT NULL,
  "job_title" text COLLATE "pg_catalog"."default",
  "company_name" text COLLATE "pg_catalog"."default",
  "interest_source" text COLLATE "pg_catalog"."default" DEFAULT 'matched_jobs_modal'::text,
  "interest_status" text COLLATE "pg_catalog"."default" DEFAULT 'interested'::text,
  "created_at" timestamp without time zone DEFAULT now(),
  "status" text COLLATE "pg_catalog"."default" DEFAULT 'new'::text,
  "next_action" text COLLATE "pg_catalog"."default",
  "last_updated_at" timestamp without time zone DEFAULT now(),
  "representation_requested" boolean,
  "representation_requested_at" timestamp with time zone,
  "representation_request_status" text COLLATE "pg_catalog"."default",
  "representation_consent_text" text COLLATE "pg_catalog"."default",
  "representation_consent_version" text COLLATE "pg_catalog"."default",
  "representation_notes" text COLLATE "pg_catalog"."default",
  "recruiter_review_status" text COLLATE "pg_catalog"."default",
  "recruiter_reviewed_at" timestamp with time zone,
  "recruiter_decision" text COLLATE "pg_catalog"."default"
);
ALTER TABLE "public"."web_job_interest" OWNER TO "postgres";
ALTER TABLE "public"."web_job_interest" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."buckets" (
  "id" text COLLATE "pg_catalog"."default" NOT NULL,
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "owner" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "public" boolean DEFAULT false,
  "avif_autodetection" boolean DEFAULT false,
  "file_size_limit" bigint,
  "allowed_mime_types" text[] COLLATE "pg_catalog"."default",
  "owner_id" text COLLATE "pg_catalog"."default",
  "type" storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);
ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";
ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."buckets_analytics" (
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "type" storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
  "format" text COLLATE "pg_catalog"."default" DEFAULT 'ICEBERG'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "deleted_at" timestamp with time zone
);
ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";
ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."buckets_vectors" (
  "id" text COLLATE "pg_catalog"."default" NOT NULL,
  "type" storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "storage"."buckets_vectors" OWNER TO "supabase_storage_admin";
ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."migrations" (
  "id" integer NOT NULL,
  "name" character varying(100) COLLATE "pg_catalog"."default" NOT NULL,
  "hash" character varying(40) COLLATE "pg_catalog"."default" NOT NULL,
  "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";
ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."objects" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "bucket_id" text COLLATE "pg_catalog"."default",
  "name" text COLLATE "pg_catalog"."default",
  "owner" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "last_accessed_at" timestamp with time zone DEFAULT now(),
  "metadata" jsonb,
  "path_tokens" text[] COLLATE "pg_catalog"."default" GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
  "version" text COLLATE "pg_catalog"."default",
  "owner_id" text COLLATE "pg_catalog"."default",
  "user_metadata" jsonb
);
ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";
ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."s3_multipart_uploads" (
  "id" text COLLATE "pg_catalog"."default" NOT NULL,
  "in_progress_size" bigint DEFAULT 0 NOT NULL,
  "upload_signature" text COLLATE "pg_catalog"."default" NOT NULL,
  "bucket_id" text COLLATE "pg_catalog"."default" NOT NULL,
  "key" text COLLATE "pg_catalog"."C" NOT NULL,
  "version" text COLLATE "pg_catalog"."default" NOT NULL,
  "owner_id" text COLLATE "pg_catalog"."default",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "user_metadata" jsonb,
  "metadata" jsonb
);
ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";
ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."s3_multipart_uploads_parts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "upload_id" text COLLATE "pg_catalog"."default" NOT NULL,
  "size" bigint DEFAULT 0 NOT NULL,
  "part_number" integer NOT NULL,
  "bucket_id" text COLLATE "pg_catalog"."default" NOT NULL,
  "key" text COLLATE "pg_catalog"."C" NOT NULL,
  "etag" text COLLATE "pg_catalog"."default" NOT NULL,
  "owner_id" text COLLATE "pg_catalog"."default",
  "version" text COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";
ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."vector_indexes" (
  "id" text COLLATE "pg_catalog"."default" DEFAULT gen_random_uuid() NOT NULL,
  "name" text COLLATE "pg_catalog"."C" NOT NULL,
  "bucket_id" text COLLATE "pg_catalog"."default" NOT NULL,
  "data_type" text COLLATE "pg_catalog"."default" NOT NULL,
  "dimension" integer NOT NULL,
  "distance_metric" text COLLATE "pg_catalog"."default" NOT NULL,
  "metadata_configuration" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "storage"."vector_indexes" OWNER TO "supabase_storage_admin";
ALTER TABLE "storage"."vector_indexes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE ONLY "public"."activity_log" ADD CONSTRAINT "activity_log_activity_type_check" CHECK (activity_type = ANY (ARRAY['outreach_sent'::text, 'follow_up_sent'::text, 'candidate_replied'::text, 'recruiter_reviewed'::text, 'shortlisted'::text, 'submitted_to_client'::text, 'client_feedback'::text, 'interview_scheduled'::text, 'interview_feedback'::text, 'offer_made'::text, 'offer_accepted'::text, 'rejected'::text, 'withdrew'::text, 'put_on_hold'::text, 'note_added'::text]));
ALTER TABLE ONLY "public"."activity_log" ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."activity_log" ADD CONSTRAINT "activity_log_submission_id_fkey" FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ai_assessments" ADD CONSTRAINT "ai_assessments_candidate_id_fkey" FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ai_assessments" ADD CONSTRAINT "ai_assessments_job_id_candidate_id_key" UNIQUE (job_id, candidate_id);
ALTER TABLE ONLY "public"."ai_assessments" ADD CONSTRAINT "ai_assessments_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ai_assessments" ADD CONSTRAINT "ai_assessments_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."applications" ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."applications" ADD CONSTRAINT "applications_job_id_candidate_id_key" UNIQUE (job_id, candidate_id);
ALTER TABLE ONLY "public"."applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."applications" ADD CONSTRAINT "applications_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."autonomous_recruiter_memory" ADD CONSTRAINT "autonomous_recruiter_memory_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."autonomous_recruiter_runs" ADD CONSTRAINT "autonomous_recruiter_runs_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."bd_contacts" ADD CONSTRAINT "bd_contacts_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."bd_contacts" ADD CONSTRAINT "bd_contacts_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."bd_notes" ADD CONSTRAINT "bd_notes_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."bd_notes" ADD CONSTRAINT "bd_notes_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES bd_contacts(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."bd_notes" ADD CONSTRAINT "bd_notes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."bd_notes" ADD CONSTRAINT "bd_notes_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."candidate_capabilities" ADD CONSTRAINT "candidate_capabilities_candidate_id_fkey" FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id);
ALTER TABLE ONLY "public"."candidate_scores" ADD CONSTRAINT "candidate_scores_candidate_id_fkey" FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id);
ALTER TABLE ONLY "public"."candidate_skills" ADD CONSTRAINT "candidate_skills_candidate_id_fkey" FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id);
ALTER TABLE ONLY "public"."candidate_skills" ADD CONSTRAINT "candidate_skills_skill_id_fkey" FOREIGN KEY (skill_id) REFERENCES skills(skill_id);
ALTER TABLE ONLY "public"."candidates" ADD CONSTRAINT "candidates_pkey" PRIMARY KEY (candidate_id);
ALTER TABLE ONLY "public"."companies" ADD CONSTRAINT "companies_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."companies" ADD CONSTRAINT "companies_source_status_check" CHECK (source_status IS NULL OR (source_status = ANY (ARRAY['missing'::text, 'queued'::text, 'partial'::text, 'ready'::text, 'blocked'::text])));
ALTER TABLE ONLY "public"."company_identity_merge_v1_snapshot" ADD CONSTRAINT "company_identity_merge_v1_snapshot_entity_type_check" CHECK (entity_type = ANY (ARRAY['bd_contact'::text, 'bd_note'::text, 'company_archive'::text]));
ALTER TABLE ONLY "public"."company_identity_merge_v1_snapshot" ADD CONSTRAINT "company_identity_merge_v1_snapshot_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."employer_intake_actions" ADD CONSTRAINT "employer_intake_actions_employer_job_intake_id_fkey" FOREIGN KEY (employer_job_intake_id) REFERENCES employer_job_intake(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."employer_intake_actions" ADD CONSTRAINT "employer_intake_actions_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."employer_job_intake" ADD CONSTRAINT "employer_job_intake_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."evidence_signals" ADD CONSTRAINT "evidence_signals_pkey" PRIMARY KEY (evidence_id);
ALTER TABLE ONLY "public"."evidence_signals" ADD CONSTRAINT "evidence_signals_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES source_profiles(profile_id);
ALTER TABLE ONLY "public"."job_candidate_matches" ADD CONSTRAINT "job_candidate_matches_job_id_candidate_id_key" UNIQUE (job_id, candidate_id);
ALTER TABLE ONLY "public"."job_candidate_matches" ADD CONSTRAINT "job_candidate_matches_pkey" PRIMARY KEY (match_id);
ALTER TABLE ONLY "public"."job_requirements" ADD CONSTRAINT "job_requirements_pkey" PRIMARY KEY (job_requirement_id);
ALTER TABLE ONLY "public"."job_requirements" ADD CONSTRAINT "job_requirements_requirement_type_check" CHECK (requirement_type = ANY (ARRAY['must_have'::text, 'good_to_have'::text]));
ALTER TABLE ONLY "public"."job_sources" ADD CONSTRAINT "job_sources_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."job_sources" ADD CONSTRAINT "job_sources_tier_check" CHECK (tier = ANY (ARRAY['tier_1'::text, 'tier_2'::text, 'tier_3'::text]));
ALTER TABLE ONLY "public"."job_sources" ADD CONSTRAINT "job_sources_trust_score_check" CHECK (trust_score >= 0 AND trust_score <= 100);
ALTER TABLE ONLY "public"."jobs" ADD CONSTRAINT "jobs_job_id_unique" UNIQUE (job_id);
ALTER TABLE ONLY "public"."jobs" ADD CONSTRAINT "jobs_job_source_id_fkey" FOREIGN KEY (job_source_id) REFERENCES job_sources(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."jobs" ADD CONSTRAINT "jobs_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."jobs_intake" ADD CONSTRAINT "jobs_intake_pkey" PRIMARY KEY (job_id);
ALTER TABLE ONLY "public"."match_interactions" ADD CONSTRAINT "match_interactions_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."outreach_log" ADD CONSTRAINT "outreach_log_pkey" PRIMARY KEY (outreach_id);
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_role_check" CHECK (role = ANY (ARRAY['admin'::text, 'recruiter'::text, 'bd'::text]));
ALTER TABLE ONLY "public"."skills" ADD CONSTRAINT "skills_pkey" PRIMARY KEY (skill_id);
ALTER TABLE ONLY "public"."source_profiles" ADD CONSTRAINT "source_profiles_candidate_id_fkey" FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id);
ALTER TABLE ONLY "public"."source_profiles" ADD CONSTRAINT "source_profiles_pkey" PRIMARY KEY (profile_id);
ALTER TABLE ONLY "public"."staging_bullhorn_companies" ADD CONSTRAINT "staging_bullhorn_companies_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."staging_bullhorn_contacts" ADD CONSTRAINT "staging_bullhorn_contacts_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."submissions" ADD CONSTRAINT "submissions_candidate_id_fkey" FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."submissions" ADD CONSTRAINT "submissions_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."submissions" ADD CONSTRAINT "submissions_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."submissions" ADD CONSTRAINT "submissions_next_action_check" CHECK ((submission_stage = ANY (ARRAY['new'::text, 'approached'::text, 'responded'::text, 'shortlisted'::text, 'ready_for_bd_review'::text, 'submitted_to_client'::text, 'interview'::text, 'offer'::text, 'hold'::text, 'on_hold'::text])) AND next_action_date IS NOT NULL OR (submission_stage = ANY (ARRAY['hired'::text, 'rejected'::text, 'withdrew'::text])) AND next_action_date IS NULL);
ALTER TABLE ONLY "public"."submissions" ADD CONSTRAINT "submissions_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."submissions" ADD CONSTRAINT "submissions_stage_check" CHECK (submission_stage = ANY (ARRAY['new'::text, 'approached'::text, 'responded'::text, 'shortlisted'::text, 'ready_for_bd_review'::text, 'submitted_to_client'::text, 'interview'::text, 'offer'::text, 'hired'::text, 'rejected'::text, 'withdrew'::text, 'hold'::text, 'on_hold'::text]));
ALTER TABLE ONLY "public"."target_companies" ADD CONSTRAINT "target_companies_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."target_companies" ADD CONSTRAINT "target_companies_priority_check" CHECK (priority = ANY (ARRAY['High'::text, 'Medium'::text, 'Low'::text]));
ALTER TABLE ONLY "public"."target_companies" ADD CONSTRAINT "target_companies_signal_confidence_check" CHECK (signal_confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text, 'unknown'::text]));
ALTER TABLE ONLY "public"."target_companies" ADD CONSTRAINT "target_companies_source_status_check" CHECK (source_status = ANY (ARRAY['unverified'::text, 'verified'::text, 'blocked'::text, 'manual_only'::text, 'inactive'::text]));
ALTER TABLE ONLY "public"."terrer_candidates" ADD CONSTRAINT "terrer_candidates_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."terrer_companies" ADD CONSTRAINT "terrer_companies_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."terrer_company_contacts" ADD CONSTRAINT "terrer_company_contacts_company_id_fkey" FOREIGN KEY (company_id) REFERENCES terrer_companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."terrer_company_contacts" ADD CONSTRAINT "terrer_company_contacts_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."terrer_jobs" ADD CONSTRAINT "terrer_jobs_company_id_fkey" FOREIGN KEY (company_id) REFERENCES terrer_companies(id) ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."terrer_jobs" ADD CONSTRAINT "terrer_jobs_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."terrer_pipeline" ADD CONSTRAINT "terrer_pipeline_candidate_id_fkey" FOREIGN KEY (candidate_id) REFERENCES terrer_candidates(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."terrer_pipeline" ADD CONSTRAINT "terrer_pipeline_company_contact_id_fkey" FOREIGN KEY (company_contact_id) REFERENCES terrer_company_contacts(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."terrer_pipeline" ADD CONSTRAINT "terrer_pipeline_job_id_candidate_id_key" UNIQUE (job_id, candidate_id);
ALTER TABLE ONLY "public"."terrer_pipeline" ADD CONSTRAINT "terrer_pipeline_job_id_fkey" FOREIGN KEY (job_id) REFERENCES terrer_jobs(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."terrer_pipeline" ADD CONSTRAINT "terrer_pipeline_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."terrer_skills" ADD CONSTRAINT "terrer_skills_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."web_candidate_intakes" ADD CONSTRAINT "web_candidate_intakes_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."web_job_interest" ADD CONSTRAINT "web_job_interest_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."buckets" ADD CONSTRAINT "buckets_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."buckets_analytics" ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."buckets_vectors" ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."migrations" ADD CONSTRAINT "migrations_name_key" UNIQUE (name);
ALTER TABLE ONLY "storage"."migrations" ADD CONSTRAINT "migrations_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."objects" ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
ALTER TABLE ONLY "storage"."objects" ADD CONSTRAINT "objects_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."s3_multipart_uploads" ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
ALTER TABLE ONLY "storage"."s3_multipart_uploads" ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts" ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts" ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts" ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;
ALTER TABLE ONLY "storage"."vector_indexes" ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);
ALTER TABLE ONLY "storage"."vector_indexes" ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY (id);

CREATE INDEX autonomous_recruiter_memory_confidence_level_idx ON public.autonomous_recruiter_memory USING btree (recruiter_confidence_level);
CREATE INDEX autonomous_recruiter_memory_created_at_idx ON public.autonomous_recruiter_memory USING btree (created_at DESC);
CREATE INDEX autonomous_recruiter_memory_role_family_idx ON public.autonomous_recruiter_memory USING btree (role_family);
CREATE INDEX autonomous_recruiter_runs_created_at_idx ON public.autonomous_recruiter_runs USING btree (created_at DESC);
CREATE INDEX autonomous_recruiter_runs_job_title_idx ON public.autonomous_recruiter_runs USING btree (job_title);
CREATE INDEX autonomous_recruiter_runs_mode_idx ON public.autonomous_recruiter_runs USING btree (mode);
CREATE INDEX autonomous_recruiter_runs_run_status_idx ON public.autonomous_recruiter_runs USING btree (run_status);
CREATE INDEX bd_contacts_company_id_idx ON public.bd_contacts USING btree (company_id);
CREATE INDEX bd_contacts_email_idx ON public.bd_contacts USING btree (email);
CREATE UNIQUE INDEX bd_contacts_email_uniq ON public.bd_contacts USING btree (email) WHERE ((email IS NOT NULL) AND (length(TRIM(BOTH FROM email)) > 0));
CREATE INDEX bd_contacts_relationship_status_idx ON public.bd_contacts USING btree (relationship_status);
CREATE INDEX bd_notes_company_id_created_at_idx ON public.bd_notes USING btree (company_id, created_at DESC);
CREATE INDEX bd_notes_contact_id_idx ON public.bd_notes USING btree (contact_id);
CREATE INDEX bd_notes_created_by_idx ON public.bd_notes USING btree (created_by);
CREATE INDEX idx_candidate_skills_candidate_id ON public.candidate_skills USING btree (candidate_id);
CREATE UNIQUE INDEX idx_employer_job_intake_fingerprint ON public.employer_job_intake USING btree (submission_fingerprint);
CREATE INDEX idx_matches_candidate ON public.job_candidate_matches USING btree (candidate_id);
CREATE INDEX idx_matches_job ON public.job_candidate_matches USING btree (job_id);
CREATE INDEX idx_matches_score ON public.job_candidate_matches USING btree (final_score DESC);
CREATE INDEX idx_job_requirements_job_id ON public.job_requirements USING btree (job_id);
CREATE INDEX job_sources_company_name_idx ON public.job_sources USING btree (company_name);
CREATE INDEX job_sources_source_type_tier_status_idx ON public.job_sources USING btree (source_type, tier, status);
CREATE UNIQUE INDEX job_sources_source_url_uidx ON public.job_sources USING btree (source_url);
CREATE INDEX idx_outreach_candidate ON public.outreach_log USING btree (candidate_id);
CREATE INDEX idx_outreach_next_action ON public.outreach_log USING btree (next_action_date);
CREATE UNIQUE INDEX staging_bullhorn_companies_batch_image_uniq ON public.staging_bullhorn_companies USING btree (source_batch, source_image) WHERE ((source_batch IS NOT NULL) AND (source_image IS NOT NULL));
CREATE INDEX staging_bullhorn_companies_bullhorn_contact_id_idx ON public.staging_bullhorn_companies USING btree (bullhorn_contact_id);
CREATE INDEX staging_bullhorn_companies_import_status_idx ON public.staging_bullhorn_companies USING btree (import_status);
CREATE INDEX staging_bullhorn_companies_parent_company_key_idx ON public.staging_bullhorn_companies USING btree (parent_company_key);
CREATE INDEX staging_bullhorn_companies_possible_duplicate_group_idx ON public.staging_bullhorn_companies USING btree (possible_duplicate_group);
CREATE UNIQUE INDEX staging_bullhorn_contacts_batch_image_uniq ON public.staging_bullhorn_contacts USING btree (source_batch, source_image) WHERE ((source_batch IS NOT NULL) AND (source_image IS NOT NULL));
CREATE INDEX staging_bullhorn_contacts_bullhorn_contact_id_idx ON public.staging_bullhorn_contacts USING btree (bullhorn_contact_id);
CREATE INDEX staging_bullhorn_contacts_company_key_idx ON public.staging_bullhorn_contacts USING btree (company_key);
CREATE INDEX staging_bullhorn_contacts_email_1_idx ON public.staging_bullhorn_contacts USING btree (email_1);
CREATE INDEX staging_bullhorn_contacts_email_2_idx ON public.staging_bullhorn_contacts USING btree (email_2);
CREATE INDEX staging_bullhorn_contacts_import_status_idx ON public.staging_bullhorn_contacts USING btree (import_status);
CREATE INDEX staging_bullhorn_contacts_possible_duplicate_group_idx ON public.staging_bullhorn_contacts USING btree (possible_duplicate_group);
CREATE UNIQUE INDEX submissions_job_candidate_unique ON public.submissions USING btree (job_id, candidate_id);
CREATE UNIQUE INDEX idx_target_companies_company_name_unique ON public.target_companies USING btree (lower(company_name));
CREATE INDEX idx_terrer_candidates_email ON public.terrer_candidates USING btree (email);
CREATE INDEX idx_terrer_candidates_name ON public.terrer_candidates USING btree (full_name);
CREATE INDEX idx_terrer_companies_name ON public.terrer_companies USING btree (company_name);
CREATE UNIQUE INDEX uq_terrer_companies_name_website ON public.terrer_companies USING btree (company_name, website_url);
CREATE INDEX idx_terrer_company_contacts_company_id ON public.terrer_company_contacts USING btree (company_id);
CREATE INDEX idx_terrer_jobs_company_id ON public.terrer_jobs USING btree (company_id);
CREATE INDEX idx_terrer_jobs_status ON public.terrer_jobs USING btree (status);
CREATE INDEX idx_terrer_jobs_title ON public.terrer_jobs USING btree (job_title);
CREATE UNIQUE INDEX uq_terrer_jobs_source_url ON public.terrer_jobs USING btree (source_url) WHERE (source_url IS NOT NULL);
CREATE INDEX idx_terrer_pipeline_candidate_id ON public.terrer_pipeline USING btree (candidate_id);
CREATE INDEX idx_terrer_pipeline_job_id ON public.terrer_pipeline USING btree (job_id);
CREATE INDEX idx_terrer_pipeline_stage ON public.terrer_pipeline USING btree (pipeline_stage);
CREATE UNIQUE INDEX uq_terrer_skills_name ON public.terrer_skills USING btree (skill_name);
CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);
CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);
CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");
CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");
CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);
CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);
CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);

ALTER SEQUENCE "public"."companies_id_seq" OWNED BY "public"."companies"."id";

CREATE VIEW "public"."hiring_leaderboard_malaysia" AS
 SELECT company_name,
    count(*) AS active_jobs
   FROM jobs_latest_practical
  WHERE company_name = ANY (ARRAY['Hong Leong Bank'::text, 'Affin Bank'::text, 'Maxis'::text, 'Becton Dickinson'::text, 'GX Bank'::text])
  GROUP BY company_name
  ORDER BY (count(*)) DESC, company_name;;
ALTER VIEW "public"."hiring_leaderboard_malaysia" OWNER TO "postgres";

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
  WHERE rn = 1;;
ALTER VIEW "public"."jobs_latest" OWNER TO "postgres";

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
  WHERE rn = 1;;
ALTER VIEW "public"."jobs_latest_practical" OWNER TO "postgres";

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
  WHERE company_name = ANY (ARRAY['Maxis'::text, 'Shell'::text]);;
ALTER VIEW "public"."jobs_reporting" OWNER TO "postgres";

CREATE VIEW "public"."recruiter_active_submissions" AS
 SELECT s.id AS submission_id,
    c.display_name,
    j.company_name,
    j.job_title,
    s.submission_stage,
    s.next_action_date,
    s.stage_updated_at
   FROM submissions s
     LEFT JOIN candidates c ON c.candidate_id = s.candidate_id
     LEFT JOIN jobs j ON j.id = s.job_id
  WHERE s.submission_stage <> ALL (ARRAY['hired'::text, 'rejected'::text, 'withdrew'::text])
  ORDER BY s.next_action_date, s.stage_updated_at DESC;;
ALTER VIEW "public"."recruiter_active_submissions" OWNER TO "postgres";

CREATE VIEW "public"."terrer_hiring_now" AS
 SELECT company_name,
    count(*)::integer AS active_jobs
   FROM jobs_latest_practical
  WHERE company_name IS NOT NULL AND btrim(company_name) <> ''::text
  GROUP BY company_name;;
ALTER VIEW "public"."terrer_hiring_now" OWNER TO "postgres";

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
     LEFT JOIN terrer_companies c ON j.company_id = c.id;;
ALTER VIEW "public"."terrer_jobs_view" OWNER TO "postgres";

CREATE VIEW "public"."v_match_shortlist" AS
 SELECT match_id,
    job_id,
    candidate_id,
    final_score,
    match_status
   FROM job_candidate_matches m
  WHERE match_status = ANY (ARRAY['shortlisted'::text, 'submitted'::text])
  ORDER BY final_score DESC;;
ALTER VIEW "public"."v_match_shortlist" OWNER TO "postgres";

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
  WHERE next_action_date <= CURRENT_DATE;;
ALTER VIEW "public"."v_outreach_due" OWNER TO "postgres";

CREATE VIEW "public"."vw_activity_log_enriched" AS
 SELECT a.id AS activity_id,
    a.submission_id,
    a.entity_type,
    a.entity_id,
    a.activity_type,
    a.activity_channel,
    a.activity_direction,
    a.subject_line,
    a.message_summary,
    a.occurred_at,
    a.next_action_at,
    a.created_by,
    a.created_at,
    s.submission_stage,
    s.match_score,
    s.owner_name,
    j.job_title,
    j.company_name,
    c.display_name,
    c.full_name,
    c.email,
    c.phone,
    c.linkedin_url,
    c.github_url
   FROM activity_log a
     LEFT JOIN submissions s ON a.submission_id = s.id
     LEFT JOIN jobs j ON s.job_id = j.id
     LEFT JOIN candidates c ON s.candidate_id = c.candidate_id;;
ALTER VIEW "public"."vw_activity_log_enriched" OWNER TO "postgres";

CREATE VIEW "public"."vw_candidate_pipeline_summary" AS
 SELECT c.candidate_id,
    c.display_name,
    c.full_name,
    s.submission_stage,
    count(*) AS submission_count
   FROM submissions s
     LEFT JOIN candidates c ON s.candidate_id = c.candidate_id
  GROUP BY c.candidate_id, c.display_name, c.full_name, s.submission_stage
  ORDER BY c.display_name, s.submission_stage;;
ALTER VIEW "public"."vw_candidate_pipeline_summary" OWNER TO "postgres";

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
     LEFT JOIN candidate_scores csco ON csco.candidate_id = c.candidate_id;;
ALTER VIEW "public"."vw_candidate_search" OWNER TO "postgres";

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
  ORDER BY candidate_id, scored_at DESC;;
ALTER VIEW "public"."vw_candidate_search_clean" OWNER TO "postgres";

CREATE VIEW "public"."vw_company_pipeline_summary" AS
 SELECT j.company_id,
    j.company_name,
    s.submission_stage,
    count(*) AS submission_count
   FROM submissions s
     LEFT JOIN jobs j ON s.job_id = j.id
  GROUP BY j.company_id, j.company_name, s.submission_stage
  ORDER BY j.company_name, s.submission_stage;;
ALTER VIEW "public"."vw_company_pipeline_summary" OWNER TO "postgres";

CREATE VIEW "public"."vw_followup_queue" AS
 SELECT a.id AS activity_id,
    a.submission_id,
    a.activity_type,
    a.activity_channel,
    a.subject_line,
    a.message_summary,
    a.occurred_at,
    a.next_action_at,
    a.created_by,
    s.submission_stage,
    s.owner_name,
    s.match_score,
    s.shortlist_rank,
    j.job_title,
    j.company_name,
    c.display_name,
    c.full_name,
    c.email,
    c.phone,
    c.contactability_status,
    c.tier_label,
    c.score_total
   FROM activity_log a
     LEFT JOIN submissions s ON a.submission_id = s.id
     LEFT JOIN jobs j ON s.job_id = j.id
     LEFT JOIN candidates c ON s.candidate_id = c.candidate_id
  WHERE a.next_action_at IS NOT NULL AND (s.submission_stage = ANY (ARRAY['submitted_to_client'::text, 'client_review'::text, 'interview'::text, 'offer'::text]))
  ORDER BY a.next_action_at;;
ALTER VIEW "public"."vw_followup_queue" OWNER TO "postgres";

CREATE VIEW "public"."vw_job_shortlist" AS
 SELECT submission_id,
    job_id,
    company_id,
    company_name,
    job_title,
    candidate_id,
    display_name,
    full_name,
    primary_role,
    city,
    country,
    email,
    phone,
    linkedin_url,
    github_url,
    match_score,
    score_total,
    tier_label,
    contactability_status,
    shortlist_rank,
    submission_stage,
    stage_updated_at,
    owner_name,
    created_at
   FROM vw_submissions_enriched s
  WHERE submission_stage = ANY (ARRAY['identified'::text, 'shortlisted'::text, 'approached'::text, 'replied'::text, 'qualified'::text])
  ORDER BY job_title, shortlist_rank, match_score DESC NULLS LAST, score_total DESC NULLS LAST, created_at DESC;;
ALTER VIEW "public"."vw_job_shortlist" OWNER TO "postgres";

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
   FROM malaysia_only;;
ALTER VIEW "public"."vw_jobs_tier1_malaysia" OWNER TO "postgres";

CREATE VIEW "public"."vw_live_work_queue" AS
 SELECT id AS submission_id,
    job_id,
    candidate_id,
    company_id,
    submission_stage,
    next_action_date,
        CASE
            WHEN next_action_date < CURRENT_DATE THEN 'overdue'::text
            WHEN next_action_date = CURRENT_DATE THEN 'due_today'::text
            WHEN next_action_date = (CURRENT_DATE + 1) THEN 'due_tomorrow'::text
            ELSE 'upcoming'::text
        END AS urgency,
    owner_name,
    created_at,
    updated_at
   FROM submissions s
  WHERE submission_stage <> ALL (ARRAY['hired'::text, 'rejected'::text, 'withdrew'::text]);;
ALTER VIEW "public"."vw_live_work_queue" OWNER TO "postgres";

CREATE VIEW "public"."vw_market_signals" AS
 SELECT market_cluster,
    freshness_status,
    count(*) AS role_count,
    count(DISTINCT company_name) AS company_count,
    array_agg(DISTINCT company_name) FILTER (WHERE company_name IS NOT NULL) AS companies,
    array_agg(DISTINCT location) FILTER (WHERE location IS NOT NULL) AS locations
   FROM jobs
  WHERE is_market_signal_eligible = true AND market_cluster IS NOT NULL
  GROUP BY market_cluster, freshness_status;;
ALTER VIEW "public"."vw_market_signals" OWNER TO "postgres";

CREATE VIEW "public"."vw_market_signals_active" AS
 SELECT market_cluster,
    count(*) AS role_count,
    count(DISTINCT company_name) AS company_count,
    array_agg(DISTINCT company_name) AS companies,
    array_agg(DISTINCT location) AS locations
   FROM jobs
  WHERE freshness_status = 'active'::text
  GROUP BY market_cluster;;
ALTER VIEW "public"."vw_market_signals_active" OWNER TO "postgres";

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
   FROM filtered;;
ALTER VIEW "public"."vw_market_signals_realtime" OWNER TO "postgres";

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
  ORDER BY (extracted_at::timestamp with time zone) DESC;;
ALTER VIEW "public"."vw_market_signals_recent" OWNER TO "postgres";

CREATE VIEW "public"."vw_outcomes_summary" AS
 SELECT submission_stage,
    count(*) AS outcome_count
   FROM submissions
  WHERE submission_stage = ANY (ARRAY['hired'::text, 'rejected'::text, 'withdrew'::text])
  GROUP BY submission_stage
  ORDER BY submission_stage;;
ALTER VIEW "public"."vw_outcomes_summary" OWNER TO "postgres";

CREATE VIEW "public"."vw_pipeline_summary" AS
 SELECT submission_stage,
    count(*) AS submission_count
   FROM submissions
  GROUP BY submission_stage
  ORDER BY submission_stage;;
ALTER VIEW "public"."vw_pipeline_summary" OWNER TO "postgres";

CREATE VIEW "public"."vw_recruiter_dashboard" AS
 WITH latest_activity AS (
         SELECT DISTINCT ON (a.submission_id) a.submission_id,
            a.activity_type,
            a.activity_channel,
            a.subject_line,
            a.message_summary,
            a.occurred_at,
            a.next_action_at,
            a.created_by
           FROM activity_log a
          ORDER BY a.submission_id, a.occurred_at DESC, a.id DESC
        )
 SELECT s.submission_id,
    s.company_name,
    s.job_title,
    s.display_name,
    s.full_name,
    s.email,
    s.phone,
    s.match_score,
    s.score_total,
    s.tier_label,
    s.contactability_status,
    s.submission_stage,
    s.stage_updated_at,
    s.owner_name,
    la.next_action_at,
    s.created_at
   FROM vw_submissions_enriched s
     LEFT JOIN latest_activity la ON s.submission_id = la.submission_id
  WHERE s.submission_stage = ANY (ARRAY['approached'::text, 'replied'::text, 'qualified'::text, 'submitted_to_client'::text, 'client_review'::text, 'interview'::text, 'offer'::text, 'placed'::text])
  ORDER BY (
        CASE
            WHEN la.next_action_at IS NULL THEN 1
            ELSE 0
        END), la.next_action_at, s.stage_updated_at DESC, s.created_at DESC;;
ALTER VIEW "public"."vw_recruiter_dashboard" OWNER TO "postgres";

CREATE VIEW "public"."vw_submissions_enriched" AS
 SELECT s.id AS submission_id,
    s.job_id,
    s.candidate_id,
    s.company_id,
    s.submission_stage,
    s.stage_updated_at,
    s.match_score,
    s.shortlist_rank,
    s.submitted_to_client_at,
    s.owner_name,
    s.decision_reason,
    s.outcome,
    s.notes,
    s.created_at,
    s.updated_at,
    j.job_title,
    j.company_name,
    c.display_name,
    c.full_name,
    c.primary_role,
    c.city,
    c.country,
    c.email,
    c.phone,
    c.linkedin_url,
    c.github_url,
    c.score_total,
    c.tier_label,
    c.contactability_status,
    c.source_type AS candidate_source_type
   FROM submissions s
     LEFT JOIN jobs j ON s.job_id = j.id
     LEFT JOIN candidates c ON s.candidate_id = c.candidate_id;;
ALTER VIEW "public"."vw_submissions_enriched" OWNER TO "postgres";

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
        END), (total_jobs - jobs_with_jd) DESC, (total_jobs - malaysia_jobs) DESC;;
ALTER VIEW "public"."vw_tier1_source_diagnostics" OWNER TO "postgres";

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
        END), jobs_with_jd DESC, total_jobs DESC;;
ALTER VIEW "public"."vw_tier1_source_health" OWNER TO "postgres";

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
   FROM vw_tier1_source_health_v2;;
ALTER VIEW "public"."vw_tier1_source_health_summary" OWNER TO "postgres";

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
   FROM vw_tier1_source_health;;
ALTER VIEW "public"."vw_tier1_source_health_v2" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.create_submission_with_activity(p_job_id uuid, p_candidate_id uuid, p_company_id bigint, p_owner_name text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_submission_id uuid;
begin

  -- 1. create submission
  insert into submissions (
    job_id,
    candidate_id,
    company_id,
    submission_stage,
    owner_name,
    created_at,
    updated_at,
    next_action_date
  )
  values (
    p_job_id,
    p_candidate_id,
    p_company_id,
    'new',
    p_owner_name,
    now(),
    now(),
    current_date + 3
  )
  returning id into v_submission_id;

  -- 2. create initial activity
  insert into activity_log (
    submission_id,
    entity_type,
    entity_id,
    activity_type,
    occurred_at,
    next_action_at,
    created_by
  )
  values (
    v_submission_id,
    'submission',
    v_submission_id::text,
    'recruiter_reviewed',
    now(),
    now() + interval '3 days',
    p_owner_name
  );

  return v_submission_id;

end;
$function$

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.is_active, false) = true
  );
$function$

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$

CREATE OR REPLACE FUNCTION public.sync_submission_next_action_from_activity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  update submissions
  set
    next_action_date = case
      when new.next_action_at is not null then new.next_action_at::date
      else next_action_date
    end,
    updated_at = now()
  where id = new.submission_id;

  return new;
end;
$function$

CREATE OR REPLACE FUNCTION public.sync_submission_stage_from_activity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin

  update submissions
  set
    submission_stage = case
      when new.activity_type = 'outreach_sent' then 'approached'
      when new.activity_type = 'candidate_replied' then 'responded'
      when new.activity_type = 'shortlisted' then 'shortlisted'
      when new.activity_type = 'submitted_to_client' then 'submitted_to_client'
      when new.activity_type = 'interview_scheduled' then 'interview'
      when new.activity_type = 'offer_made' then 'offer'
      when new.activity_type = 'offer_accepted' then 'hired'
      when new.activity_type = 'rejected' then 'rejected'
      when new.activity_type = 'withdrew' then 'withdrew'
      when new.activity_type = 'put_on_hold' then 'on_hold'
      else submission_stage
    end,

    next_action_date = case
      when new.activity_type in ('offer_accepted', 'rejected', 'withdrew')
        then null
      when new.activity_type = 'put_on_hold' and new.next_action_at is not null
        then new.next_action_at::date
      else next_action_date
    end,

    updated_at = now()
  where id = new.submission_id;

  return new;

end;
$function$

CREATE OR REPLACE FUNCTION public.update_submission_stage_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.submission_stage is distinct from old.submission_stage then
    new.stage_updated_at = now();
  end if;
  return new;
end;
$function$

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$

CREATE OR REPLACE FUNCTION storage.allow_any_operation(expected_operations text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$function$

CREATE OR REPLACE FUNCTION storage.allow_only_operation(expected_operation text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$function$

CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$function$

CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$function$

CREATE OR REPLACE FUNCTION storage.extension(name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$function$

CREATE OR REPLACE FUNCTION storage.filename(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$function$

CREATE OR REPLACE FUNCTION storage.foldername(name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$function$

CREATE OR REPLACE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$function$

CREATE OR REPLACE FUNCTION storage.get_size_by_bucket()
 RETURNS TABLE(size bigint, bucket_id text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$function$

CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text)
 RETURNS TABLE(key text, id text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$function$

CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$function$

CREATE OR REPLACE FUNCTION storage.operation()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$function$

CREATE OR REPLACE FUNCTION storage.protect_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$function$

CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$function$

CREATE OR REPLACE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$function$

CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$function$

CREATE OR REPLACE FUNCTION storage.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$function$

CREATE TRIGGER trg_sync_submission_next_action_from_activity AFTER INSERT ON activity_log FOR EACH ROW EXECUTE FUNCTION sync_submission_next_action_from_activity();
CREATE TRIGGER trg_sync_submission_stage_from_activity AFTER INSERT ON activity_log FOR EACH ROW EXECUTE FUNCTION sync_submission_stage_from_activity();
CREATE TRIGGER set_updated_at_candidates BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_companies BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_jobs BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_submission_stage_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_submission_stage_timestamp();
CREATE TRIGGER set_updated_at_submissions BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_target_companies_updated_at BEFORE UPDATE ON target_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_terrer_candidates_updated_at BEFORE UPDATE ON terrer_candidates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_terrer_companies_updated_at BEFORE UPDATE ON terrer_companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_terrer_company_contacts_updated_at BEFORE UPDATE ON terrer_company_contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_terrer_jobs_updated_at BEFORE UPDATE ON terrer_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_terrer_pipeline_updated_at BEFORE UPDATE ON terrer_pipeline FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();
CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();

CREATE EVENT TRIGGER "ensure_rls" ON ddl_command_end WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO') EXECUTE FUNCTION "public".rls_auto_enable();
ALTER EVENT TRIGGER "ensure_rls" OWNER TO "postgres";

CREATE POLICY "activity_log_insert_anon" ON "public"."activity_log" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "activity_log_select_anon" ON "public"."activity_log" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "Allow anon select on ai_assessments" ON "public"."ai_assessments" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "Anon users can insert ai_assessments" ON "public"."ai_assessments" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "Anon users can read ai_assessments" ON "public"."ai_assessments" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "Anon users can update ai_assessments" ON "public"."ai_assessments" AS PERMISSIVE FOR UPDATE TO "anon" USING (true) WITH CHECK (true);
CREATE POLICY "autonomous_recruiter_memory_insert_authenticated" ON "public"."autonomous_recruiter_memory" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "autonomous_recruiter_memory_select_authenticated" ON "public"."autonomous_recruiter_memory" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "autonomous_recruiter_runs_insert_authenticated" ON "public"."autonomous_recruiter_runs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "autonomous_recruiter_runs_select_anon_demo" ON "public"."autonomous_recruiter_runs" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "autonomous_recruiter_runs_select_authenticated" ON "public"."autonomous_recruiter_runs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Anon users can read bd_contacts" ON "public"."bd_contacts" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "Anon users can update bd_contacts" ON "public"."bd_contacts" AS PERMISSIVE FOR UPDATE TO "anon" USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert bd_contacts" ON "public"."bd_contacts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE p.id = auth.uid() AND p.is_active = true AND (p.role = ANY (ARRAY['admin'::text, 'recruiter'::text, 'bd'::text])))));
CREATE POLICY "Authenticated users can read bd_contacts" ON "public"."bd_contacts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can update bd_contacts" ON "public"."bd_contacts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert bd_notes" ON "public"."bd_notes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE p.id = auth.uid() AND p.is_active = true AND (p.role = ANY (ARRAY['admin'::text, 'recruiter'::text, 'bd'::text])))));
CREATE POLICY "Authenticated users can read bd_notes" ON "public"."bd_notes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE p.id = auth.uid() AND p.is_active = true AND (p.role = ANY (ARRAY['admin'::text, 'recruiter'::text, 'bd'::text])))));
CREATE POLICY "Authenticated users can update own bd_notes" ON "public"."bd_notes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (created_by = auth.uid() AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE p.id = auth.uid() AND p.is_active = true AND (p.role = ANY (ARRAY['admin'::text, 'recruiter'::text, 'bd'::text]))))) WITH CHECK (created_by = auth.uid() AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE p.id = auth.uid() AND p.is_active = true AND (p.role = ANY (ARRAY['admin'::text, 'recruiter'::text, 'bd'::text])))));
CREATE POLICY "Anon can insert candidate_skills" ON "public"."candidate_skills" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "Anon can read candidate_skills" ON "public"."candidate_skills" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "Anon can update candidate_skills" ON "public"."candidate_skills" AS PERMISSIVE FOR UPDATE TO "anon" USING (true) WITH CHECK (true);
CREATE POLICY "Anon users can read companies" ON "public"."companies" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "Authenticated users can insert companies" ON "public"."companies" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE p.id = auth.uid() AND p.is_active = true AND (p.role = ANY (ARRAY['admin'::text, 'recruiter'::text, 'bd'::text])))));
CREATE POLICY "Authenticated users can read companies" ON "public"."companies" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "anon_insert_employer_intake_actions" ON "public"."employer_intake_actions" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "anon_select_employer_intake_actions" ON "public"."employer_intake_actions" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "auth_read_employer_intake_actions" ON "public"."employer_intake_actions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "anon_insert_employer_job_intake" ON "public"."employer_job_intake" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "anon_select_employer_job_intake" ON "public"."employer_job_intake" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "auth_read_employer_job_intake" ON "public"."employer_job_intake" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Anon can insert job_requirements" ON "public"."job_requirements" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "Anon can read job_requirements" ON "public"."job_requirements" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "Anon can update job_requirements" ON "public"."job_requirements" AS PERMISSIVE FOR UPDATE TO "anon" USING (true) WITH CHECK (true);
CREATE POLICY "Anon users can read job_sources" ON "public"."job_sources" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "Authenticated users can read job_sources" ON "public"."job_sources" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Anon users can insert jobs" ON "public"."jobs" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "Anon users can read jobs" ON "public"."jobs" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "Anon users can update jobs" ON "public"."jobs" AS PERMISSIVE FOR UPDATE TO "anon" USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert jobs" ON "public"."jobs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Authenticated users can read jobs" ON "public"."jobs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can update jobs" ON "public"."jobs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "jobs_intake_insert_anon" ON "public"."jobs_intake" AS PERMISSIVE FOR INSERT TO "anon", "authenticated" WITH CHECK (true);
CREATE POLICY "jobs_intake_select_anon" ON "public"."jobs_intake" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);
CREATE POLICY "profiles_select_admin_all" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_current_user_admin());
CREATE POLICY "profiles_select_own" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = id);
CREATE POLICY "profiles_update_admin_all" ON "public"."profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());
CREATE POLICY "profiles_update_own" ON "public"."profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Anon users can delete submissions" ON "public"."submissions" AS PERMISSIVE FOR DELETE TO "anon" USING (true);
CREATE POLICY "Anon users can insert submissions" ON "public"."submissions" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "Anon users can read submissions" ON "public"."submissions" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "Anon users can update submissions" ON "public"."submissions" AS PERMISSIVE FOR UPDATE TO "anon" USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete submissions" ON "public"."submissions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can insert submissions" ON "public"."submissions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Authenticated users can read submissions" ON "public"."submissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can update submissions" ON "public"."submissions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "allow anon insert submissions" ON "public"."submissions" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "demo_allow_anon_delete_submissions" ON "public"."submissions" AS PERMISSIVE FOR DELETE TO "anon" USING (true);
CREATE POLICY "demo_allow_anon_select_submissions" ON "public"."submissions" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "demo_allow_anon_update_submissions" ON "public"."submissions" AS PERMISSIVE FOR UPDATE TO "anon" USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to read candidate intakes" ON "public"."web_candidate_intakes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Allow public candidate intake insert" ON "public"."web_candidate_intakes" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (email IS NOT NULL);
CREATE POLICY "Allow public job interest insert" ON "public"."web_job_interest" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "allow anon update web_job_interest for now" ON "public"."web_job_interest" AS PERMISSIVE FOR UPDATE TO "anon" USING (true) WITH CHECK (true);
CREATE POLICY "allow read all for now" ON "public"."web_job_interest" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);
CREATE POLICY "Allow authenticated users to read resumes" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (bucket_id = 'candidate-resumes'::text);
CREATE POLICY "Allow public resume uploads" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (bucket_id = 'candidate-resumes'::text);
CREATE POLICY "Allow upload from web i5g8va_0" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (bucket_id = 'resumes'::text);
CREATE POLICY "Authenticated app users can read candidate resumes" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (bucket_id = 'candidate-resumes'::text);
CREATE POLICY "Authenticated app users can upload candidate resumes" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (bucket_id = 'candidate-resumes'::text);
CREATE POLICY "bd_photo_intake_delete_own_authenticated" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (bucket_id = 'bd-photo-intake'::text);
CREATE POLICY "bd_photo_intake_insert_own_authenticated" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (bucket_id = 'bd-photo-intake'::text);
CREATE POLICY "bd_photo_intake_read_authenticated" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (bucket_id = 'bd-photo-intake'::text);
CREATE POLICY "bd_photo_intake_update_own_authenticated" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (bucket_id = 'bd-photo-intake'::text) WITH CHECK (bucket_id = 'bd-photo-intake'::text);

