alter table public.web_job_interest enable row level security;

drop policy if exists "allow read all for now" on public.web_job_interest;

create policy "allow read all for now"
on public.web_job_interest
for select
using (true);
