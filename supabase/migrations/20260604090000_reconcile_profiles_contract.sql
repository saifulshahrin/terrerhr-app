-- Local reconstruction prerequisite for staff/recruiter/BD RLS policies.
--
-- Source of truth: docs/schema-evidence/live_schema_catalog_ddl.sql.

create table if not exists public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'recruiter',
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_role_check check (role = any (array['admin'::text, 'recruiter'::text, 'bd'::text]))
);

alter table public.profiles enable row level security;

create or replace function public.is_current_user_admin()
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.is_active, false) = true
  );
$function$;
