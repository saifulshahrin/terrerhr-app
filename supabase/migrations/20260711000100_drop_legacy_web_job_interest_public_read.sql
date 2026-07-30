-- Staging validation fix, 2026-07.
-- Remove legacy broad public read policy that bypasses self-only interest access.

begin;

drop policy if exists "allow read all for now" on public.web_job_interest;

commit;
