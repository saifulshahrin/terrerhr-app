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
