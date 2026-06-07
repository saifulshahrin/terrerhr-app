export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          activity_channel: string | null
          activity_direction: string | null
          activity_type: string | null
          created_at: string | null
          created_by: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message_summary: string | null
          next_action_at: string | null
          occurred_at: string | null
          subject_line: string | null
          submission_id: string | null
        }
        Insert: {
          activity_channel?: string | null
          activity_direction?: string | null
          activity_type?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message_summary?: string | null
          next_action_at?: string | null
          occurred_at?: string | null
          subject_line?: string | null
          submission_id?: string | null
        }
        Update: {
          activity_channel?: string | null
          activity_direction?: string | null
          activity_type?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message_summary?: string | null
          next_action_at?: string | null
          occurred_at?: string | null
          subject_line?: string | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "recruiter_active_submissions"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "vw_job_shortlist"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "vw_live_work_queue"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "vw_recruiter_dashboard"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "vw_submissions_enriched"
            referencedColumns: ["submission_id"]
          },
        ]
      }
      ai_assessments: {
        Row: {
          ai_score: number | null
          assessed_at: string | null
          candidate_id: string
          concerns: string[] | null
          confidence: string | null
          id: string
          job_id: string
          layer1_score: number | null
          missing_information: string[] | null
          model_used: string | null
          model_version: string | null
          overall_recommendation: string | null
          ranking_adjustment: number | null
          reasoning_summary: string | null
          strengths: string[] | null
          submission_ready: boolean | null
          verification_notes: string[] | null
        }
        Insert: {
          ai_score?: number | null
          assessed_at?: string | null
          candidate_id: string
          concerns?: string[] | null
          confidence?: string | null
          id?: string
          job_id: string
          layer1_score?: number | null
          missing_information?: string[] | null
          model_used?: string | null
          model_version?: string | null
          overall_recommendation?: string | null
          ranking_adjustment?: number | null
          reasoning_summary?: string | null
          strengths?: string[] | null
          submission_ready?: boolean | null
          verification_notes?: string[] | null
        }
        Update: {
          ai_score?: number | null
          assessed_at?: string | null
          candidate_id?: string
          concerns?: string[] | null
          confidence?: string | null
          id?: string
          job_id?: string
          layer1_score?: number | null
          missing_information?: string[] | null
          model_used?: string | null
          model_version?: string | null
          overall_recommendation?: string | null
          ranking_adjustment?: number | null
          reasoning_summary?: string | null
          strengths?: string[] | null
          submission_ready?: boolean | null
          verification_notes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_assessments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "ai_assessments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_pipeline_summary"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "ai_assessments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "ai_assessments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search_clean"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "ai_assessments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assessments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assessments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_latest_practical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assessments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_reporting"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assessments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_jobs_tier1_malaysia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assessments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_market_signals_realtime"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assessments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_market_signals_recent"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          application_status: string | null
          candidate_id: string
          created_at: string | null
          id: string
          job_id: string
          raw_application_data: Json | null
          source: string | null
          source_details: string | null
          updated_at: string | null
        }
        Insert: {
          application_status?: string | null
          candidate_id: string
          created_at?: string | null
          id?: string
          job_id: string
          raw_application_data?: Json | null
          source?: string | null
          source_details?: string | null
          updated_at?: string | null
        }
        Update: {
          application_status?: string | null
          candidate_id?: string
          created_at?: string | null
          id?: string
          job_id?: string
          raw_application_data?: Json | null
          source?: string | null
          source_details?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_pipeline_summary"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search_clean"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_latest_practical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_reporting"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_jobs_tier1_malaysia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_market_signals_realtime"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_market_signals_recent"
            referencedColumns: ["id"]
          },
        ]
      }
      autonomous_recruiter_memory: {
        Row: {
          created_at: string
          failed_strategy: string | null
          id: string
          job_title: string | null
          location: string | null
          memory_payload: Json | null
          memory_type: string | null
          notes: string | null
          recommended_next_move: string | null
          recommended_query_pattern: string | null
          recruiter_confidence_level: string | null
          recruiter_confidence_score: number | null
          role_family: string | null
          skills: string | null
          source_run_id: string | null
          sourcing_risk_flags: Json | null
          sourcing_signal_flags: Json | null
          successful_run: boolean | null
          successful_strategy: string | null
          total_candidates: number | null
        }
        Insert: {
          created_at?: string
          failed_strategy?: string | null
          id?: string
          job_title?: string | null
          location?: string | null
          memory_payload?: Json | null
          memory_type?: string | null
          notes?: string | null
          recommended_next_move?: string | null
          recommended_query_pattern?: string | null
          recruiter_confidence_level?: string | null
          recruiter_confidence_score?: number | null
          role_family?: string | null
          skills?: string | null
          source_run_id?: string | null
          sourcing_risk_flags?: Json | null
          sourcing_signal_flags?: Json | null
          successful_run?: boolean | null
          successful_strategy?: string | null
          total_candidates?: number | null
        }
        Update: {
          created_at?: string
          failed_strategy?: string | null
          id?: string
          job_title?: string | null
          location?: string | null
          memory_payload?: Json | null
          memory_type?: string | null
          notes?: string | null
          recommended_next_move?: string | null
          recommended_query_pattern?: string | null
          recruiter_confidence_level?: string | null
          recruiter_confidence_score?: number | null
          role_family?: string | null
          skills?: string | null
          source_run_id?: string | null
          sourcing_risk_flags?: Json | null
          sourcing_signal_flags?: Json | null
          successful_run?: boolean | null
          successful_strategy?: string | null
          total_candidates?: number | null
        }
        Relationships: []
      }
      autonomous_recruiter_runs: {
        Row: {
          agent_report_path: string | null
          app_demo_summary: Json | null
          batch_summary_json_path: string | null
          batch_summary_md_path: string | null
          best_iteration: number | null
          best_strategy: string | null
          candidates_path: string | null
          created_at: string
          id: string
          iteration_count: number | null
          iteration_mode: boolean | null
          iteration_summary: Json | null
          job_title: string | null
          location: string | null
          mode: string | null
          next_run_priority: string | null
          query_quality_label: string | null
          reason_winning_variant: string | null
          recommended_next_action: string | null
          recommended_next_search_focus: string | null
          recommended_query_adjustments: Json | null
          recruiter_confidence_level: string | null
          recruiter_confidence_score: number | null
          recruiter_report_path: string | null
          run_status: string | null
          run_timestamp: string | null
          seniority: string | null
          skills: string | null
          sourcing_risk_flags: Json | null
          sourcing_signal_flags: Json | null
          sourcing_signal_summary: string | null
          stopping_reason: string | null
          strategy_count: number | null
          strategy_refinement_path: string | null
          total_candidates: number | null
          weakest_strategy: string | null
          winning_variant: string | null
        }
        Insert: {
          agent_report_path?: string | null
          app_demo_summary?: Json | null
          batch_summary_json_path?: string | null
          batch_summary_md_path?: string | null
          best_iteration?: number | null
          best_strategy?: string | null
          candidates_path?: string | null
          created_at?: string
          id?: string
          iteration_count?: number | null
          iteration_mode?: boolean | null
          iteration_summary?: Json | null
          job_title?: string | null
          location?: string | null
          mode?: string | null
          next_run_priority?: string | null
          query_quality_label?: string | null
          reason_winning_variant?: string | null
          recommended_next_action?: string | null
          recommended_next_search_focus?: string | null
          recommended_query_adjustments?: Json | null
          recruiter_confidence_level?: string | null
          recruiter_confidence_score?: number | null
          recruiter_report_path?: string | null
          run_status?: string | null
          run_timestamp?: string | null
          seniority?: string | null
          skills?: string | null
          sourcing_risk_flags?: Json | null
          sourcing_signal_flags?: Json | null
          sourcing_signal_summary?: string | null
          stopping_reason?: string | null
          strategy_count?: number | null
          strategy_refinement_path?: string | null
          total_candidates?: number | null
          weakest_strategy?: string | null
          winning_variant?: string | null
        }
        Update: {
          agent_report_path?: string | null
          app_demo_summary?: Json | null
          batch_summary_json_path?: string | null
          batch_summary_md_path?: string | null
          best_iteration?: number | null
          best_strategy?: string | null
          candidates_path?: string | null
          created_at?: string
          id?: string
          iteration_count?: number | null
          iteration_mode?: boolean | null
          iteration_summary?: Json | null
          job_title?: string | null
          location?: string | null
          mode?: string | null
          next_run_priority?: string | null
          query_quality_label?: string | null
          reason_winning_variant?: string | null
          recommended_next_action?: string | null
          recommended_next_search_focus?: string | null
          recommended_query_adjustments?: Json | null
          recruiter_confidence_level?: string | null
          recruiter_confidence_score?: number | null
          recruiter_report_path?: string | null
          run_status?: string | null
          run_timestamp?: string | null
          seniority?: string | null
          skills?: string | null
          sourcing_risk_flags?: Json | null
          sourcing_signal_flags?: Json | null
          sourcing_signal_summary?: string | null
          stopping_reason?: string | null
          strategy_count?: number | null
          strategy_refinement_path?: string | null
          total_candidates?: number | null
          weakest_strategy?: string | null
          winning_variant?: string | null
        }
        Relationships: []
      }
      bd_contacts: {
        Row: {
          company_id: number | null
          contact_type: string | null
          created_at: string | null
          department: string | null
          email: string | null
          first_name: string | null
          full_name: string
          id: string
          job_title: string | null
          last_contacted_at: string | null
          last_name: string | null
          mobile_phone: string | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          phone: string | null
          relationship_status: string | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: number | null
          contact_type?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          job_title?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          mobile_phone?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string | null
          relationship_status?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: number | null
          contact_type?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          mobile_phone?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string | null
          relationship_status?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bd_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_notes: {
        Row: {
          company_id: number
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          note_body: string
          note_type: string
          updated_at: string
        }
        Insert: {
          company_id: number
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note_body: string
          note_type?: string
          updated_at?: string
        }
        Update: {
          company_id?: number
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note_body?: string
          note_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "bd_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_capabilities: {
        Row: {
          candidate_id: string | null
          capability: string | null
          created_at: string | null
        }
        Insert: {
          candidate_id?: string | null
          capability?: string | null
          created_at?: string | null
        }
        Update: {
          candidate_id?: string | null
          capability?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_capabilities_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_capabilities_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_pipeline_summary"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_capabilities_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_capabilities_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search_clean"
            referencedColumns: ["candidate_id"]
          },
        ]
      }
      candidate_scores: {
        Row: {
          candidate_id: string | null
          capabilities: string | null
          city: string | null
          display_name: string | null
          followers: number | null
          full_name: string | null
          primary_role: string | null
          repos: number | null
          score: number | null
          score_reason: string | null
          scored_at: string | null
        }
        Insert: {
          candidate_id?: string | null
          capabilities?: string | null
          city?: string | null
          display_name?: string | null
          followers?: number | null
          full_name?: string | null
          primary_role?: string | null
          repos?: number | null
          score?: number | null
          score_reason?: string | null
          scored_at?: string | null
        }
        Update: {
          candidate_id?: string | null
          capabilities?: string | null
          city?: string | null
          display_name?: string | null
          followers?: number | null
          full_name?: string | null
          primary_role?: string | null
          repos?: number | null
          score?: number | null
          score_reason?: string | null
          scored_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_pipeline_summary"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search_clean"
            referencedColumns: ["candidate_id"]
          },
        ]
      }
      candidate_skills: {
        Row: {
          candidate_id: string | null
          evidence_id: string | null
          proficiency_score: number | null
          skill_id: string | null
          source_profile_id: string | null
        }
        Insert: {
          candidate_id?: string | null
          evidence_id?: string | null
          proficiency_score?: number | null
          skill_id?: string | null
          source_profile_id?: string | null
        }
        Update: {
          candidate_id?: string | null
          evidence_id?: string | null
          proficiency_score?: number | null
          skill_id?: string | null
          source_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_skills_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_skills_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_pipeline_summary"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_skills_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_skills_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search_clean"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["skill_id"]
          },
        ]
      }
      candidates: {
        Row: {
          candidate_consent_at: string | null
          candidate_consent_given: boolean | null
          candidate_consent_text: string | null
          candidate_consent_version: string | null
          candidate_id: string
          candidate_status: string | null
          career_confidence: string | null
          city: string | null
          contactability_status: string | null
          counsellor_completed_at: string | null
          country: string | null
          created_at: string | null
          current_role: string | null
          dedup_hash: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          github_url: string | null
          job_priorities: string[] | null
          key_skills: string[] | null
          linkedin_url: string | null
          location_preference: string | null
          notes: string | null
          notice_period: string | null
          phone: string | null
          primary_role: string | null
          profile_capture_mode: string | null
          profile_completeness_status: string | null
          representation_opt_in: boolean | null
          representation_status: string | null
          resume_url: string | null
          salary_expectation_currency: string | null
          salary_expectation_max: number | null
          salary_expectation_min: number | null
          score_total: number | null
          source_type: string | null
          target_role: string | null
          target_seniority: string | null
          tier_label: string | null
          updated_at: string | null
          years_experience: number | null
        }
        Insert: {
          candidate_consent_at?: string | null
          candidate_consent_given?: boolean | null
          candidate_consent_text?: string | null
          candidate_consent_version?: string | null
          candidate_id: string
          candidate_status?: string | null
          career_confidence?: string | null
          city?: string | null
          contactability_status?: string | null
          counsellor_completed_at?: string | null
          country?: string | null
          created_at?: string | null
          current_role?: string | null
          dedup_hash?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          job_priorities?: string[] | null
          key_skills?: string[] | null
          linkedin_url?: string | null
          location_preference?: string | null
          notes?: string | null
          notice_period?: string | null
          phone?: string | null
          primary_role?: string | null
          profile_capture_mode?: string | null
          profile_completeness_status?: string | null
          representation_opt_in?: boolean | null
          representation_status?: string | null
          resume_url?: string | null
          salary_expectation_currency?: string | null
          salary_expectation_max?: number | null
          salary_expectation_min?: number | null
          score_total?: number | null
          source_type?: string | null
          target_role?: string | null
          target_seniority?: string | null
          tier_label?: string | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Update: {
          candidate_consent_at?: string | null
          candidate_consent_given?: boolean | null
          candidate_consent_text?: string | null
          candidate_consent_version?: string | null
          candidate_id?: string
          candidate_status?: string | null
          career_confidence?: string | null
          city?: string | null
          contactability_status?: string | null
          counsellor_completed_at?: string | null
          country?: string | null
          created_at?: string | null
          current_role?: string | null
          dedup_hash?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          job_priorities?: string[] | null
          key_skills?: string[] | null
          linkedin_url?: string | null
          location_preference?: string | null
          notes?: string | null
          notice_period?: string | null
          phone?: string | null
          primary_role?: string | null
          profile_capture_mode?: string | null
          profile_completeness_status?: string | null
          representation_opt_in?: boolean | null
          representation_status?: string | null
          resume_url?: string | null
          salary_expectation_currency?: string | null
          salary_expectation_max?: number | null
          salary_expectation_min?: number | null
          score_total?: number | null
          source_type?: string | null
          target_role?: string | null
          target_seniority?: string | null
          tier_label?: string | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          ats_family: string | null
          career_url: string | null
          company_name: string | null
          company_slug: string | null
          company_status: string | null
          created_at: string
          hq_country: string | null
          id: number
          last_checked_at: string | null
          last_enriched_at: string | null
          linkedin_url: string | null
          notes: string | null
          primary_city: string | null
          source_confidence: number | null
          source_notes: string | null
          source_status: string | null
          source_type: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          ats_family?: string | null
          career_url?: string | null
          company_name?: string | null
          company_slug?: string | null
          company_status?: string | null
          created_at?: string
          hq_country?: string | null
          id?: number
          last_checked_at?: string | null
          last_enriched_at?: string | null
          linkedin_url?: string | null
          notes?: string | null
          primary_city?: string | null
          source_confidence?: number | null
          source_notes?: string | null
          source_status?: string | null
          source_type?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          ats_family?: string | null
          career_url?: string | null
          company_name?: string | null
          company_slug?: string | null
          company_status?: string | null
          created_at?: string
          hq_country?: string | null
          id?: number
          last_checked_at?: string | null
          last_enriched_at?: string | null
          linkedin_url?: string | null
          notes?: string | null
          primary_city?: string | null
          source_confidence?: number | null
          source_notes?: string | null
          source_status?: string | null
          source_type?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      company_identity_merge_v1_snapshot: {
        Row: {
          captured_at: string
          destination_company_id: number
          destination_company_name: string | null
          entity_id: string
          entity_type: string
          id: string
          merge_batch: string
          previous_company_status: string | null
          previous_source_notes: string | null
          source_company_id: number
          source_company_name: string | null
        }
        Insert: {
          captured_at?: string
          destination_company_id: number
          destination_company_name?: string | null
          entity_id: string
          entity_type: string
          id?: string
          merge_batch: string
          previous_company_status?: string | null
          previous_source_notes?: string | null
          source_company_id: number
          source_company_name?: string | null
        }
        Update: {
          captured_at?: string
          destination_company_id?: number
          destination_company_name?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          merge_batch?: string
          previous_company_status?: string | null
          previous_source_notes?: string | null
          source_company_id?: number
          source_company_name?: string | null
        }
        Relationships: []
      }
      employer_intake_actions: {
        Row: {
          action_type: string
          created_at: string | null
          employer_job_intake_id: string | null
          employer_note: string | null
          id: string
          status: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          employer_job_intake_id?: string | null
          employer_note?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          employer_job_intake_id?: string | null
          employer_note?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_intake_actions_employer_job_intake_id_fkey"
            columns: ["employer_job_intake_id"]
            isOneToOne: false
            referencedRelation: "employer_job_intake"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_job_intake: {
        Row: {
          benefits: string | null
          company_industry: string | null
          company_name: string
          company_size: string | null
          company_website: string | null
          contact_email: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          currency: string | null
          employment_type: string | null
          hiring_urgency: string | null
          id: string
          job_description: string | null
          job_title: string
          location: string | null
          nice_to_have_skills: string[] | null
          notes: string | null
          number_of_openings: number | null
          replacement_or_new_role: string | null
          required_skills: string[] | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          seniority: string | null
          source: string | null
          status: string | null
          submission_fingerprint: string | null
          updated_at: string | null
          workplace_type: string | null
        }
        Insert: {
          benefits?: string | null
          company_industry?: string | null
          company_name: string
          company_size?: string | null
          company_website?: string | null
          contact_email: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          currency?: string | null
          employment_type?: string | null
          hiring_urgency?: string | null
          id?: string
          job_description?: string | null
          job_title: string
          location?: string | null
          nice_to_have_skills?: string[] | null
          notes?: string | null
          number_of_openings?: number | null
          replacement_or_new_role?: string | null
          required_skills?: string[] | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          source?: string | null
          status?: string | null
          submission_fingerprint?: string | null
          updated_at?: string | null
          workplace_type?: string | null
        }
        Update: {
          benefits?: string | null
          company_industry?: string | null
          company_name?: string
          company_size?: string | null
          company_website?: string | null
          contact_email?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          currency?: string | null
          employment_type?: string | null
          hiring_urgency?: string | null
          id?: string
          job_description?: string | null
          job_title?: string
          location?: string | null
          nice_to_have_skills?: string[] | null
          notes?: string | null
          number_of_openings?: number | null
          replacement_or_new_role?: string | null
          required_skills?: string[] | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          source?: string | null
          status?: string | null
          submission_fingerprint?: string | null
          updated_at?: string | null
          workplace_type?: string | null
        }
        Relationships: []
      }
      evidence_signals: {
        Row: {
          evidence_id: string
          profile_id: string | null
          signal_name: string | null
          signal_ts: string | null
          signal_value: string | null
        }
        Insert: {
          evidence_id: string
          profile_id?: string | null
          signal_name?: string | null
          signal_ts?: string | null
          signal_value?: string | null
        }
        Update: {
          evidence_id?: string
          profile_id?: string | null
          signal_name?: string | null
          signal_ts?: string | null
          signal_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_signals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "source_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      job_candidate_matches: {
        Row: {
          candidate_id: string
          created_at: string | null
          final_score: number | null
          job_id: string
          location_match_score: number | null
          manual_adjustment: number | null
          match_id: string
          match_reason: string | null
          match_status: string | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seniority_match_score: number | null
          skill_match_score: number | null
          title_match_score: number | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          final_score?: number | null
          job_id: string
          location_match_score?: number | null
          manual_adjustment?: number | null
          match_id?: string
          match_reason?: string | null
          match_status?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seniority_match_score?: number | null
          skill_match_score?: number | null
          title_match_score?: number | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          final_score?: number | null
          job_id?: string
          location_match_score?: number | null
          manual_adjustment?: number | null
          match_id?: string
          match_reason?: string | null
          match_status?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seniority_match_score?: number | null
          skill_match_score?: number | null
          title_match_score?: number | null
        }
        Relationships: []
      }
      job_requirements: {
        Row: {
          created_at: string | null
          job_id: string
          job_requirement_id: string
          min_years: number | null
          notes: string | null
          requirement_type: string | null
          skill_name: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          job_id: string
          job_requirement_id?: string
          min_years?: number | null
          notes?: string | null
          requirement_type?: string | null
          skill_name: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          job_id?: string
          job_requirement_id?: string
          min_years?: number | null
          notes?: string | null
          requirement_type?: string | null
          skill_name?: string
          weight?: number | null
        }
        Relationships: []
      }
      job_sources: {
        Row: {
          ats_family: string | null
          canonical_source_key: string | null
          company_name: string
          country: string | null
          created_at: string
          dominant_failure_reason: string | null
          extraction_method: string | null
          id: string
          jd_coverage_pct: number | null
          jobs_with_jd_count: number | null
          last_checked_at: string | null
          last_job_count: number | null
          last_run_at: string | null
          last_success_at: string | null
          last_successful_run: string | null
          malaysia_coverage_pct: number | null
          malaysia_job_count: number | null
          market: string | null
          notes: string | null
          operational_notes: string | null
          source_health_status: string | null
          source_name: string
          source_type: string
          source_url: string
          status: string
          tier: string
          trust_score: number
          updated_at: string
        }
        Insert: {
          ats_family?: string | null
          canonical_source_key?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          dominant_failure_reason?: string | null
          extraction_method?: string | null
          id?: string
          jd_coverage_pct?: number | null
          jobs_with_jd_count?: number | null
          last_checked_at?: string | null
          last_job_count?: number | null
          last_run_at?: string | null
          last_success_at?: string | null
          last_successful_run?: string | null
          malaysia_coverage_pct?: number | null
          malaysia_job_count?: number | null
          market?: string | null
          notes?: string | null
          operational_notes?: string | null
          source_health_status?: string | null
          source_name: string
          source_type?: string
          source_url: string
          status?: string
          tier?: string
          trust_score?: number
          updated_at?: string
        }
        Update: {
          ats_family?: string | null
          canonical_source_key?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          dominant_failure_reason?: string | null
          extraction_method?: string | null
          id?: string
          jd_coverage_pct?: number | null
          jobs_with_jd_count?: number | null
          last_checked_at?: string | null
          last_job_count?: number | null
          last_run_at?: string | null
          last_success_at?: string | null
          last_successful_run?: string | null
          malaysia_coverage_pct?: number | null
          malaysia_job_count?: number | null
          market?: string | null
          notes?: string | null
          operational_notes?: string | null
          source_health_status?: string | null
          source_name?: string
          source_type?: string
          source_url?: string
          status?: string
          tier?: string
          trust_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          company_id: number | null
          company_name: string | null
          external_job_url: string | null
          extracted_at: string | null
          freshness_status: string | null
          id: string
          is_market_signal_eligible: boolean | null
          job_description_html: string | null
          job_description_text: string | null
          job_id: string | null
          job_source_id: string | null
          job_title: string | null
          last_seen_at: string | null
          location: string | null
          market_cluster: string | null
          market_signal_exclusion_reason: string | null
          normalized_job_title: string | null
          operational_status: string
          posted_date: string | null
          qualifications: string | null
          responsibilities: string | null
          role_family: string | null
          seniority: string | null
          source: string | null
          source_company_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: number | null
          company_name?: string | null
          external_job_url?: string | null
          extracted_at?: string | null
          freshness_status?: string | null
          id?: string
          is_market_signal_eligible?: boolean | null
          job_description_html?: string | null
          job_description_text?: string | null
          job_id?: string | null
          job_source_id?: string | null
          job_title?: string | null
          last_seen_at?: string | null
          location?: string | null
          market_cluster?: string | null
          market_signal_exclusion_reason?: string | null
          normalized_job_title?: string | null
          operational_status?: string
          posted_date?: string | null
          qualifications?: string | null
          responsibilities?: string | null
          role_family?: string | null
          seniority?: string | null
          source?: string | null
          source_company_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: number | null
          company_name?: string | null
          external_job_url?: string | null
          extracted_at?: string | null
          freshness_status?: string | null
          id?: string
          is_market_signal_eligible?: boolean | null
          job_description_html?: string | null
          job_description_text?: string | null
          job_id?: string | null
          job_source_id?: string | null
          job_title?: string | null
          last_seen_at?: string | null
          location?: string | null
          market_cluster?: string | null
          market_signal_exclusion_reason?: string | null
          normalized_job_title?: string | null
          operational_status?: string
          posted_date?: string | null
          qualifications?: string | null
          responsibilities?: string | null
          role_family?: string | null
          seniority?: string | null
          source?: string | null
          source_company_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_job_source_id_fkey"
            columns: ["job_source_id"]
            isOneToOne: false
            referencedRelation: "job_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs_intake: {
        Row: {
          company_name: string | null
          created_at: string | null
          created_by: string | null
          job_id: string
          job_title: string | null
          location: string | null
          others_notes: string | null
          raw_input: string | null
          seniority: string | null
          skills: string[] | null
          status: string | null
          work_mode: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          job_id?: string
          job_title?: string | null
          location?: string | null
          others_notes?: string | null
          raw_input?: string | null
          seniority?: string | null
          skills?: string[] | null
          status?: string | null
          work_mode?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          job_id?: string
          job_title?: string | null
          location?: string | null
          others_notes?: string | null
          raw_input?: string | null
          seniority?: string | null
          skills?: string[] | null
          status?: string | null
          work_mode?: string | null
        }
        Relationships: []
      }
      match_interactions: {
        Row: {
          candidate_email: string | null
          candidate_id: string | null
          event_type: string | null
          id: string
          job_id: string | null
          source_tier: string | null
          timestamp: string | null
        }
        Insert: {
          candidate_email?: string | null
          candidate_id?: string | null
          event_type?: string | null
          id?: string
          job_id?: string | null
          source_tier?: string | null
          timestamp?: string | null
        }
        Update: {
          candidate_email?: string | null
          candidate_id?: string | null
          event_type?: string | null
          id?: string
          job_id?: string | null
          source_tier?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      outreach_log: {
        Row: {
          candidate_id: string | null
          channel: string | null
          company_id: string | null
          contact_person: string | null
          created_at: string | null
          job_id: string | null
          message_type: string | null
          next_action_date: string | null
          notes: string | null
          outreach_date: string | null
          outreach_id: string
          outreach_side: string | null
          owner: string | null
          response_status: string | null
        }
        Insert: {
          candidate_id?: string | null
          channel?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          job_id?: string | null
          message_type?: string | null
          next_action_date?: string | null
          notes?: string | null
          outreach_date?: string | null
          outreach_id?: string
          outreach_side?: string | null
          owner?: string | null
          response_status?: string | null
        }
        Update: {
          candidate_id?: string | null
          channel?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          job_id?: string | null
          message_type?: string | null
          next_action_date?: string | null
          notes?: string | null
          outreach_date?: string | null
          outreach_id?: string
          outreach_side?: string | null
          owner?: string | null
          response_status?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          skill_id: string
          skill_name: string | null
        }
        Insert: {
          skill_id: string
          skill_name?: string | null
        }
        Update: {
          skill_id?: string
          skill_name?: string | null
        }
        Relationships: []
      }
      source_profiles: {
        Row: {
          candidate_id: string | null
          profile_id: string
          scraped_at: string | null
          source_handle: string | null
          source_name: string | null
          source_profile_url: string | null
          source_user_id: string | null
        }
        Insert: {
          candidate_id?: string | null
          profile_id: string
          scraped_at?: string | null
          source_handle?: string | null
          source_name?: string | null
          source_profile_url?: string | null
          source_user_id?: string | null
        }
        Update: {
          candidate_id?: string | null
          profile_id?: string
          scraped_at?: string | null
          source_handle?: string | null
          source_name?: string | null
          source_profile_url?: string | null
          source_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_profiles_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "source_profiles_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_pipeline_summary"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "source_profiles_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "source_profiles_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search_clean"
            referencedColumns: ["candidate_id"]
          },
        ]
      }
      staging_bullhorn_companies: {
        Row: {
          address: string | null
          bullhorn_contact_id: string | null
          classification_confidence: string | null
          classification_reason: string | null
          company_main_phone: string | null
          company_name: string | null
          company_status: string | null
          created_at: string | null
          extraction_confidence: string | null
          hallucination_risk: string | null
          id: string
          import_status: string | null
          merge_recommendation: string | null
          parent_company_key: string | null
          possible_duplicate_group: string | null
          raw_row: Json | null
          reviewer_status: string | null
          source_batch: string | null
          source_image: string | null
        }
        Insert: {
          address?: string | null
          bullhorn_contact_id?: string | null
          classification_confidence?: string | null
          classification_reason?: string | null
          company_main_phone?: string | null
          company_name?: string | null
          company_status?: string | null
          created_at?: string | null
          extraction_confidence?: string | null
          hallucination_risk?: string | null
          id?: string
          import_status?: string | null
          merge_recommendation?: string | null
          parent_company_key?: string | null
          possible_duplicate_group?: string | null
          raw_row?: Json | null
          reviewer_status?: string | null
          source_batch?: string | null
          source_image?: string | null
        }
        Update: {
          address?: string | null
          bullhorn_contact_id?: string | null
          classification_confidence?: string | null
          classification_reason?: string | null
          company_main_phone?: string | null
          company_name?: string | null
          company_status?: string | null
          created_at?: string | null
          extraction_confidence?: string | null
          hallucination_risk?: string | null
          id?: string
          import_status?: string | null
          merge_recommendation?: string | null
          parent_company_key?: string | null
          possible_duplicate_group?: string | null
          raw_row?: Json | null
          reviewer_status?: string | null
          source_batch?: string | null
          source_image?: string | null
        }
        Relationships: []
      }
      staging_bullhorn_contacts: {
        Row: {
          bullhorn_contact_id: string | null
          classification_confidence: string | null
          classification_reason: string | null
          company_key: string | null
          company_name: string | null
          created_at: string | null
          date_added: string | null
          direct_phone: string | null
          email_1: string | null
          email_2: string | null
          extracted_text_evidence: string | null
          extraction_confidence: string | null
          extraction_version: string | null
          first_name: string | null
          full_name: string | null
          hallucination_risk: string | null
          id: string
          import_status: string | null
          last_name: string | null
          merge_recommendation: string | null
          mobile_phone: string | null
          notes: string | null
          occupation_title: string | null
          possible_duplicate_group: string | null
          raw_row: Json | null
          reviewer_notes: string | null
          reviewer_status: string | null
          screenshot_type: string | null
          source_batch: string | null
          source_image: string | null
          status: string | null
          uncertain_fields: string | null
        }
        Insert: {
          bullhorn_contact_id?: string | null
          classification_confidence?: string | null
          classification_reason?: string | null
          company_key?: string | null
          company_name?: string | null
          created_at?: string | null
          date_added?: string | null
          direct_phone?: string | null
          email_1?: string | null
          email_2?: string | null
          extracted_text_evidence?: string | null
          extraction_confidence?: string | null
          extraction_version?: string | null
          first_name?: string | null
          full_name?: string | null
          hallucination_risk?: string | null
          id?: string
          import_status?: string | null
          last_name?: string | null
          merge_recommendation?: string | null
          mobile_phone?: string | null
          notes?: string | null
          occupation_title?: string | null
          possible_duplicate_group?: string | null
          raw_row?: Json | null
          reviewer_notes?: string | null
          reviewer_status?: string | null
          screenshot_type?: string | null
          source_batch?: string | null
          source_image?: string | null
          status?: string | null
          uncertain_fields?: string | null
        }
        Update: {
          bullhorn_contact_id?: string | null
          classification_confidence?: string | null
          classification_reason?: string | null
          company_key?: string | null
          company_name?: string | null
          created_at?: string | null
          date_added?: string | null
          direct_phone?: string | null
          email_1?: string | null
          email_2?: string | null
          extracted_text_evidence?: string | null
          extraction_confidence?: string | null
          extraction_version?: string | null
          first_name?: string | null
          full_name?: string | null
          hallucination_risk?: string | null
          id?: string
          import_status?: string | null
          last_name?: string | null
          merge_recommendation?: string | null
          mobile_phone?: string | null
          notes?: string | null
          occupation_title?: string | null
          possible_duplicate_group?: string | null
          raw_row?: Json | null
          reviewer_notes?: string | null
          reviewer_status?: string | null
          screenshot_type?: string | null
          source_batch?: string | null
          source_image?: string | null
          status?: string | null
          uncertain_fields?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          candidate_id: string | null
          company_id: number | null
          created_at: string | null
          decision_reason: string | null
          id: string
          job_id: string | null
          match_score: number | null
          next_action_date: string | null
          notes: string | null
          outcome: string | null
          owner_name: string | null
          shortlist_rank: number | null
          stage_updated_at: string | null
          submission_concerns: string[] | null
          submission_full_text: string | null
          submission_generated_at: string | null
          submission_stage: string | null
          submission_strengths: string[] | null
          submission_summary: string | null
          submitted_to_client_at: string | null
          updated_at: string | null
        }
        Insert: {
          candidate_id?: string | null
          company_id?: number | null
          created_at?: string | null
          decision_reason?: string | null
          id?: string
          job_id?: string | null
          match_score?: number | null
          next_action_date?: string | null
          notes?: string | null
          outcome?: string | null
          owner_name?: string | null
          shortlist_rank?: number | null
          stage_updated_at?: string | null
          submission_concerns?: string[] | null
          submission_full_text?: string | null
          submission_generated_at?: string | null
          submission_stage?: string | null
          submission_strengths?: string[] | null
          submission_summary?: string | null
          submitted_to_client_at?: string | null
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string | null
          company_id?: number | null
          created_at?: string | null
          decision_reason?: string | null
          id?: string
          job_id?: string | null
          match_score?: number | null
          next_action_date?: string | null
          notes?: string | null
          outcome?: string | null
          owner_name?: string | null
          shortlist_rank?: number | null
          stage_updated_at?: string | null
          submission_concerns?: string[] | null
          submission_full_text?: string | null
          submission_generated_at?: string | null
          submission_stage?: string | null
          submission_strengths?: string[] | null
          submission_summary?: string | null
          submitted_to_client_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_pipeline_summary"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search_clean"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_latest_practical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_reporting"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_jobs_tier1_malaysia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_market_signals_realtime"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_market_signals_recent"
            referencedColumns: ["id"]
          },
        ]
      }
      target_companies: {
        Row: {
          careers_url: string | null
          company_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          market_cluster: string | null
          notes: string | null
          priority: string | null
          sector: string | null
          signal_confidence: string | null
          source_status: string | null
          source_type: string | null
          updated_at: string | null
        }
        Insert: {
          careers_url?: string | null
          company_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          market_cluster?: string | null
          notes?: string | null
          priority?: string | null
          sector?: string | null
          signal_confidence?: string | null
          source_status?: string | null
          source_type?: string | null
          updated_at?: string | null
        }
        Update: {
          careers_url?: string | null
          company_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          market_cluster?: string | null
          notes?: string | null
          priority?: string | null
          sector?: string | null
          signal_confidence?: string | null
          source_status?: string | null
          source_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      terrer_candidates: {
        Row: {
          candidate_status: string | null
          city: string | null
          country: string | null
          created_at: string
          current_company: string | null
          current_title: string | null
          email: string | null
          full_name: string
          github_url: string | null
          id: string
          linkedin_url: string | null
          normalized_title: string | null
          notes: string | null
          notice_period: string | null
          phone: string | null
          portfolio_url: string | null
          preferred_work_mode: string | null
          seniority_level: string | null
          source_origin: string | null
          state: string | null
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          candidate_status?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_company?: string | null
          current_title?: string | null
          email?: string | null
          full_name: string
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          normalized_title?: string | null
          notes?: string | null
          notice_period?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_work_mode?: string | null
          seniority_level?: string | null
          source_origin?: string | null
          state?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          candidate_status?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_company?: string | null
          current_title?: string | null
          email?: string | null
          full_name?: string
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          normalized_title?: string | null
          notes?: string | null
          notice_period?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_work_mode?: string | null
          seniority_level?: string | null
          source_origin?: string | null
          state?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      terrer_companies: {
        Row: {
          company_name: string
          company_size: string | null
          company_slug: string | null
          country: string | null
          created_at: string
          headquarters_city: string | null
          hiring_status: string | null
          id: string
          industry: string | null
          linkedin_url: string | null
          notes: string | null
          source_type: string | null
          source_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          company_name: string
          company_size?: string | null
          company_slug?: string | null
          country?: string | null
          created_at?: string
          headquarters_city?: string | null
          hiring_status?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          notes?: string | null
          source_type?: string | null
          source_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          company_name?: string
          company_size?: string | null
          company_slug?: string | null
          country?: string | null
          created_at?: string
          headquarters_city?: string | null
          hiring_status?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          notes?: string | null
          source_type?: string | null
          source_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      terrer_company_contacts: {
        Row: {
          company_id: string
          contact_type: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_primary: boolean
          job_title: string | null
          linkedin_url: string | null
          notes: string | null
          phone: string | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_type?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_type?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "terrer_company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "terrer_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      terrer_jobs: {
        Row: {
          city: string | null
          company_id: string
          country: string | null
          created_at: string
          department: string | null
          employment_type: string | null
          expiry_date: string | null
          external_job_id: string | null
          first_seen_at: string | null
          id: string
          job_description_raw: string | null
          job_summary: string | null
          job_title: string
          last_seen_at: string | null
          normalized_job_title: string | null
          posted_date: string | null
          requirements_summary: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          seniority_level: string | null
          source_type: string | null
          source_url: string | null
          state: string | null
          status: string
          updated_at: string
          work_mode: string | null
        }
        Insert: {
          city?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          department?: string | null
          employment_type?: string | null
          expiry_date?: string | null
          external_job_id?: string | null
          first_seen_at?: string | null
          id?: string
          job_description_raw?: string | null
          job_summary?: string | null
          job_title: string
          last_seen_at?: string | null
          normalized_job_title?: string | null
          posted_date?: string | null
          requirements_summary?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority_level?: string | null
          source_type?: string | null
          source_url?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          work_mode?: string | null
        }
        Update: {
          city?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          department?: string | null
          employment_type?: string | null
          expiry_date?: string | null
          external_job_id?: string | null
          first_seen_at?: string | null
          id?: string
          job_description_raw?: string | null
          job_summary?: string | null
          job_title?: string
          last_seen_at?: string | null
          normalized_job_title?: string | null
          posted_date?: string | null
          requirements_summary?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority_level?: string | null
          source_type?: string | null
          source_url?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          work_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terrer_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "terrer_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      terrer_pipeline: {
        Row: {
          actual_fee: number | null
          candidate_id: string
          candidate_interest_status: string | null
          company_contact_id: string | null
          created_at: string
          employer_feedback: string | null
          expected_fee: number | null
          id: string
          interview_stage: string | null
          job_id: string
          lost_reason: string | null
          match_reason: string | null
          match_score: number | null
          notes: string | null
          outreach_date: string | null
          outreach_status: string
          owner: string | null
          pipeline_stage: string
          placed_date: string | null
          placement_probability: number | null
          submission_date: string | null
          updated_at: string
        }
        Insert: {
          actual_fee?: number | null
          candidate_id: string
          candidate_interest_status?: string | null
          company_contact_id?: string | null
          created_at?: string
          employer_feedback?: string | null
          expected_fee?: number | null
          id?: string
          interview_stage?: string | null
          job_id: string
          lost_reason?: string | null
          match_reason?: string | null
          match_score?: number | null
          notes?: string | null
          outreach_date?: string | null
          outreach_status?: string
          owner?: string | null
          pipeline_stage?: string
          placed_date?: string | null
          placement_probability?: number | null
          submission_date?: string | null
          updated_at?: string
        }
        Update: {
          actual_fee?: number | null
          candidate_id?: string
          candidate_interest_status?: string | null
          company_contact_id?: string | null
          created_at?: string
          employer_feedback?: string | null
          expected_fee?: number | null
          id?: string
          interview_stage?: string | null
          job_id?: string
          lost_reason?: string | null
          match_reason?: string | null
          match_score?: number | null
          notes?: string | null
          outreach_date?: string | null
          outreach_status?: string
          owner?: string | null
          pipeline_stage?: string
          placed_date?: string | null
          placement_probability?: number | null
          submission_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "terrer_pipeline_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "terrer_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terrer_pipeline_company_contact_id_fkey"
            columns: ["company_contact_id"]
            isOneToOne: false
            referencedRelation: "terrer_company_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terrer_pipeline_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "terrer_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terrer_pipeline_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "terrer_jobs_view"
            referencedColumns: ["id"]
          },
        ]
      }
      terrer_skills: {
        Row: {
          created_at: string
          id: string
          skill_category: string | null
          skill_name: string
          skill_slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          skill_category?: string | null
          skill_name: string
          skill_slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          skill_category?: string | null
          skill_name?: string
          skill_slug?: string | null
        }
        Relationships: []
      }
      web_candidate_intakes: {
        Row: {
          consent_to_contact: boolean | null
          consent_to_store_profile: boolean | null
          created_at: string | null
          current_job_title: string | null
          email: string
          full_name: string | null
          id: string
          intake_status: string | null
          linkedin_url: string | null
          location: string | null
          notes: string | null
          phone: string | null
          preferred_role: string | null
          resume_file_name: string | null
          resume_url: string | null
          source_company: string | null
          source_job_id: string | null
          source_job_title: string | null
          source_page: string | null
          updated_at: string | null
        }
        Insert: {
          consent_to_contact?: boolean | null
          consent_to_store_profile?: boolean | null
          created_at?: string | null
          current_job_title?: string | null
          email: string
          full_name?: string | null
          id?: string
          intake_status?: string | null
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          preferred_role?: string | null
          resume_file_name?: string | null
          resume_url?: string | null
          source_company?: string | null
          source_job_id?: string | null
          source_job_title?: string | null
          source_page?: string | null
          updated_at?: string | null
        }
        Update: {
          consent_to_contact?: boolean | null
          consent_to_store_profile?: boolean | null
          created_at?: string | null
          current_job_title?: string | null
          email?: string
          full_name?: string | null
          id?: string
          intake_status?: string | null
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          preferred_role?: string | null
          resume_file_name?: string | null
          resume_url?: string | null
          source_company?: string | null
          source_job_id?: string | null
          source_job_title?: string | null
          source_page?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      web_job_interest: {
        Row: {
          candidate_id: string
          company_name: string | null
          created_at: string | null
          id: string
          interest_source: string | null
          interest_status: string | null
          job_id: string
          job_title: string | null
          last_updated_at: string | null
          next_action: string | null
          recruiter_decision: string | null
          recruiter_review_status: string | null
          recruiter_reviewed_at: string | null
          representation_consent_text: string | null
          representation_consent_version: string | null
          representation_notes: string | null
          representation_request_status: string | null
          representation_requested: boolean | null
          representation_requested_at: string | null
          status: string | null
        }
        Insert: {
          candidate_id: string
          company_name?: string | null
          created_at?: string | null
          id?: string
          interest_source?: string | null
          interest_status?: string | null
          job_id: string
          job_title?: string | null
          last_updated_at?: string | null
          next_action?: string | null
          recruiter_decision?: string | null
          recruiter_review_status?: string | null
          recruiter_reviewed_at?: string | null
          representation_consent_text?: string | null
          representation_consent_version?: string | null
          representation_notes?: string | null
          representation_request_status?: string | null
          representation_requested?: boolean | null
          representation_requested_at?: string | null
          status?: string | null
        }
        Update: {
          candidate_id?: string
          company_name?: string | null
          created_at?: string | null
          id?: string
          interest_source?: string | null
          interest_status?: string | null
          job_id?: string
          job_title?: string | null
          last_updated_at?: string | null
          next_action?: string | null
          recruiter_decision?: string | null
          recruiter_review_status?: string | null
          recruiter_reviewed_at?: string | null
          representation_consent_text?: string | null
          representation_consent_version?: string | null
          representation_notes?: string | null
          representation_request_status?: string | null
          representation_requested?: boolean | null
          representation_requested_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      hiring_leaderboard_malaysia: {
        Row: {
          active_jobs: number | null
          company_name: string | null
        }
        Relationships: []
      }
      jobs_latest: {
        Row: {
          company_name: string | null
          external_job_url: string | null
          extracted_at: string | null
          id: string | null
          job_id: string | null
          job_title: string | null
          location: string | null
          posted_date: string | null
          rn: number | null
          source: string | null
          source_company_id: string | null
        }
        Relationships: []
      }
      jobs_latest_practical: {
        Row: {
          company_name: string | null
          external_job_url: string | null
          extracted_at: string | null
          id: string | null
          job_id: string | null
          job_title: string | null
          location: string | null
          posted_date: string | null
          rn: number | null
          source: string | null
          source_company_id: string | null
        }
        Relationships: []
      }
      jobs_reporting: {
        Row: {
          company_name: string | null
          external_job_url: string | null
          extracted_at: string | null
          id: string | null
          job_id: string | null
          job_title: string | null
          location: string | null
          posted_date: string | null
          rn: number | null
          source: string | null
          source_company_id: string | null
        }
        Relationships: []
      }
      recruiter_active_submissions: {
        Row: {
          company_name: string | null
          display_name: string | null
          job_title: string | null
          next_action_date: string | null
          stage_updated_at: string | null
          submission_id: string | null
          submission_stage: string | null
        }
        Relationships: []
      }
      terrer_hiring_now: {
        Row: {
          active_jobs: number | null
          company_name: string | null
        }
        Relationships: []
      }
      terrer_jobs_view: {
        Row: {
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          id: string | null
          job_title: string | null
          source_type: string | null
          source_url: string | null
          status: string | null
        }
        Relationships: []
      }
      v_match_shortlist: {
        Row: {
          candidate_id: string | null
          final_score: number | null
          job_id: string | null
          match_id: string | null
          match_status: string | null
        }
        Insert: {
          candidate_id?: string | null
          final_score?: number | null
          job_id?: string | null
          match_id?: string | null
          match_status?: string | null
        }
        Update: {
          candidate_id?: string | null
          final_score?: number | null
          job_id?: string | null
          match_id?: string | null
          match_status?: string | null
        }
        Relationships: []
      }
      v_outreach_due: {
        Row: {
          candidate_id: string | null
          channel: string | null
          company_id: string | null
          contact_person: string | null
          created_at: string | null
          job_id: string | null
          message_type: string | null
          next_action_date: string | null
          notes: string | null
          outreach_date: string | null
          outreach_id: string | null
          outreach_side: string | null
          owner: string | null
          response_status: string | null
        }
        Insert: {
          candidate_id?: string | null
          channel?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          job_id?: string | null
          message_type?: string | null
          next_action_date?: string | null
          notes?: string | null
          outreach_date?: string | null
          outreach_id?: string | null
          outreach_side?: string | null
          owner?: string | null
          response_status?: string | null
        }
        Update: {
          candidate_id?: string | null
          channel?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          job_id?: string | null
          message_type?: string | null
          next_action_date?: string | null
          notes?: string | null
          outreach_date?: string | null
          outreach_id?: string | null
          outreach_side?: string | null
          owner?: string | null
          response_status?: string | null
        }
        Relationships: []
      }
      vw_activity_log_enriched: {
        Row: {
          activity_channel: string | null
          activity_direction: string | null
          activity_id: string | null
          activity_type: string | null
          company_name: string | null
          created_at: string | null
          created_by: string | null
          display_name: string | null
          email: string | null
          entity_id: string | null
          entity_type: string | null
          full_name: string | null
          github_url: string | null
          job_title: string | null
          linkedin_url: string | null
          match_score: number | null
          message_summary: string | null
          next_action_at: string | null
          occurred_at: string | null
          owner_name: string | null
          phone: string | null
          subject_line: string | null
          submission_id: string | null
          submission_stage: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "recruiter_active_submissions"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "vw_job_shortlist"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "vw_live_work_queue"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "vw_recruiter_dashboard"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "vw_submissions_enriched"
            referencedColumns: ["submission_id"]
          },
        ]
      }
      vw_candidate_pipeline_summary: {
        Row: {
          candidate_id: string | null
          display_name: string | null
          full_name: string | null
          submission_count: number | null
          submission_stage: string | null
        }
        Relationships: []
      }
      vw_candidate_search: {
        Row: {
          candidate_id: string | null
          capabilities: string | null
          city: string | null
          country: string | null
          display_name: string | null
          full_name: string | null
          primary_role: string | null
          score: number | null
          score_reason: string | null
          scored_at: string | null
          source_handle: string | null
          source_name: string | null
          source_profile_url: string | null
          top_skills: string | null
        }
        Relationships: []
      }
      vw_candidate_search_clean: {
        Row: {
          candidate_id: string | null
          capabilities: string | null
          city: string | null
          country: string | null
          display_name: string | null
          full_name: string | null
          primary_role: string | null
          score: number | null
          score_reason: string | null
          source_handle: string | null
          source_name: string | null
          source_profile_url: string | null
          top_skills: string | null
        }
        Relationships: []
      }
      vw_company_pipeline_summary: {
        Row: {
          company_id: number | null
          company_name: string | null
          submission_count: number | null
          submission_stage: string | null
        }
        Relationships: []
      }
      vw_followup_queue: {
        Row: {
          activity_channel: string | null
          activity_id: string | null
          activity_type: string | null
          company_name: string | null
          contactability_status: string | null
          created_by: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          job_title: string | null
          match_score: number | null
          message_summary: string | null
          next_action_at: string | null
          occurred_at: string | null
          owner_name: string | null
          phone: string | null
          score_total: number | null
          shortlist_rank: number | null
          subject_line: string | null
          submission_id: string | null
          submission_stage: string | null
          tier_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "recruiter_active_submissions"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "vw_job_shortlist"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "vw_live_work_queue"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "vw_recruiter_dashboard"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "vw_submissions_enriched"
            referencedColumns: ["submission_id"]
          },
        ]
      }
      vw_job_shortlist: {
        Row: {
          candidate_id: string | null
          city: string | null
          company_id: number | null
          company_name: string | null
          contactability_status: string | null
          country: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          github_url: string | null
          job_id: string | null
          job_title: string | null
          linkedin_url: string | null
          match_score: number | null
          owner_name: string | null
          phone: string | null
          primary_role: string | null
          score_total: number | null
          shortlist_rank: number | null
          stage_updated_at: string | null
          submission_id: string | null
          submission_stage: string | null
          tier_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_pipeline_summary"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search_clean"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_latest_practical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_reporting"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_jobs_tier1_malaysia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_market_signals_realtime"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_market_signals_recent"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_jobs_tier1_malaysia: {
        Row: {
          company_id: number | null
          company_name: string | null
          external_job_url: string | null
          extracted_at: string | null
          freshness_status: string | null
          id: string | null
          is_market_signal_eligible: boolean | null
          job_description_html: string | null
          job_description_text: string | null
          job_id: string | null
          job_source_id: string | null
          job_title: string | null
          last_seen_at: string | null
          location: string | null
          market_cluster: string | null
          market_signal_exclusion_reason: string | null
          normalized_job_title: string | null
          operational_status: string | null
          posted_date: string | null
          qualifications: string | null
          responsibilities: string | null
          role_family: string | null
          seniority: string | null
          source: string | null
          source_company_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_job_source_id_fkey"
            columns: ["job_source_id"]
            isOneToOne: false
            referencedRelation: "job_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_live_work_queue: {
        Row: {
          candidate_id: string | null
          company_id: number | null
          created_at: string | null
          job_id: string | null
          next_action_date: string | null
          owner_name: string | null
          submission_id: string | null
          submission_stage: string | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          candidate_id?: string | null
          company_id?: number | null
          created_at?: string | null
          job_id?: string | null
          next_action_date?: string | null
          owner_name?: string | null
          submission_id?: string | null
          submission_stage?: string | null
          updated_at?: string | null
          urgency?: never
        }
        Update: {
          candidate_id?: string | null
          company_id?: number | null
          created_at?: string | null
          job_id?: string | null
          next_action_date?: string | null
          owner_name?: string | null
          submission_id?: string | null
          submission_stage?: string | null
          updated_at?: string | null
          urgency?: never
        }
        Relationships: [
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_pipeline_summary"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search_clean"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_latest_practical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_reporting"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_jobs_tier1_malaysia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_market_signals_realtime"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_market_signals_recent"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_market_signals: {
        Row: {
          companies: string[] | null
          company_count: number | null
          freshness_status: string | null
          locations: string[] | null
          market_cluster: string | null
          role_count: number | null
        }
        Relationships: []
      }
      vw_market_signals_active: {
        Row: {
          companies: string[] | null
          company_count: number | null
          locations: string[] | null
          market_cluster: string | null
          role_count: number | null
        }
        Relationships: []
      }
      vw_market_signals_realtime: {
        Row: {
          company_name: string | null
          external_job_url: string | null
          extracted_at: string | null
          freshness_status: string | null
          id: string | null
          job_id: string | null
          job_title: string | null
          location: string | null
          market_cluster: string | null
          posted_date: string | null
          signal_at: string | null
          signal_tier: string | null
          source: string | null
          source_company_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      vw_market_signals_recent: {
        Row: {
          company_name: string | null
          id: string | null
          job_id: string | null
          job_title: string | null
          location: string | null
          market_cluster: string | null
          signal_at: string | null
        }
        Insert: {
          company_name?: string | null
          id?: string | null
          job_id?: string | null
          job_title?: string | null
          location?: string | null
          market_cluster?: string | null
          signal_at?: never
        }
        Update: {
          company_name?: string | null
          id?: string | null
          job_id?: string | null
          job_title?: string | null
          location?: string | null
          market_cluster?: string | null
          signal_at?: never
        }
        Relationships: []
      }
      vw_outcomes_summary: {
        Row: {
          outcome_count: number | null
          submission_stage: string | null
        }
        Relationships: []
      }
      vw_pipeline_summary: {
        Row: {
          submission_count: number | null
          submission_stage: string | null
        }
        Relationships: []
      }
      vw_recruiter_dashboard: {
        Row: {
          company_name: string | null
          contactability_status: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          job_title: string | null
          match_score: number | null
          next_action_at: string | null
          owner_name: string | null
          phone: string | null
          score_total: number | null
          stage_updated_at: string | null
          submission_id: string | null
          submission_stage: string | null
          tier_label: string | null
        }
        Relationships: []
      }
      vw_submissions_enriched: {
        Row: {
          candidate_id: string | null
          candidate_source_type: string | null
          city: string | null
          company_id: number | null
          company_name: string | null
          contactability_status: string | null
          country: string | null
          created_at: string | null
          decision_reason: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          github_url: string | null
          job_id: string | null
          job_title: string | null
          linkedin_url: string | null
          match_score: number | null
          notes: string | null
          outcome: string | null
          owner_name: string | null
          phone: string | null
          primary_role: string | null
          score_total: number | null
          shortlist_rank: number | null
          stage_updated_at: string | null
          submission_id: string | null
          submission_stage: string | null
          submitted_to_client_at: string | null
          tier_label: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_pipeline_summary"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "vw_candidate_search_clean"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_latest_practical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_reporting"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_jobs_tier1_malaysia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_market_signals_realtime"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vw_market_signals_recent"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_tier1_source_diagnostics: {
        Row: {
          company_name: string | null
          dominant_failure_reason: string | null
          is_stale: boolean | null
          jobs_missing_jd: number | null
          jobs_with_jd: number | null
          latest_updated_at: string | null
          malaysia_jobs: number | null
          non_malaysia_jobs: number | null
          refined_health_status: string | null
          source: string | null
          total_jobs: number | null
        }
        Relationships: []
      }
      vw_tier1_source_health: {
        Row: {
          company_name: string | null
          health_status: string | null
          jd_coverage_pct: number | null
          jobs_with_jd: number | null
          latest_updated_at: string | null
          malaysia_coverage_pct: number | null
          malaysia_jobs: number | null
          source: string | null
          total_jobs: number | null
        }
        Relationships: []
      }
      vw_tier1_source_health_summary: {
        Row: {
          broken_sources: number | null
          healthy_small_sample_sources: number | null
          healthy_sources: number | null
          latest_pipeline_activity: string | null
          noisy_sources: number | null
          overall_jd_coverage_pct: number | null
          partial_sources: number | null
          total_jobs_with_jd: number | null
          total_malaysia_jobs: number | null
        }
        Relationships: []
      }
      vw_tier1_source_health_v2: {
        Row: {
          company_name: string | null
          health_status: string | null
          jd_coverage_pct: number | null
          jobs_with_jd: number | null
          latest_updated_at: string | null
          malaysia_coverage_pct: number | null
          malaysia_jobs: number | null
          refined_health_status: string | null
          source: string | null
          total_jobs: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_submission_with_activity: {
        Args: {
          p_candidate_id: string
          p_company_id: number
          p_job_id: string
          p_owner_name: string
        }
        Returns: string
      }
      is_current_user_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
