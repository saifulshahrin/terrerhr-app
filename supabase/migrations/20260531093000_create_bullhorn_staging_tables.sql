/*
  # Bullhorn Staging Import Tables (safe, additive)

  Purpose:
  - Staging-only landing tables for Bullhorn screenshot extraction batches.
  - No writes to canonical tables (`companies`, `contacts`, `bd_contacts`).
  - Supports reviewer-first QA and deferred canonical merge.
*/

create extension if not exists pgcrypto;

create table if not exists public.staging_bullhorn_companies (
  id uuid primary key default gen_random_uuid(),
  source_batch text,
  source_image text,
  bullhorn_contact_id text,
  company_name text,
  company_status text,
  company_main_phone text,
  address text,
  parent_company_key text,
  extraction_confidence text,
  hallucination_risk text,
  reviewer_status text,
  merge_recommendation text,
  possible_duplicate_group text,
  classification_reason text,
  classification_confidence text,
  raw_row jsonb,
  import_status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.staging_bullhorn_contacts (
  id uuid primary key default gen_random_uuid(),
  source_batch text,
  source_image text,
  bullhorn_contact_id text,
  first_name text,
  last_name text,
  full_name text,
  company_name text,
  company_key text,
  direct_phone text,
  mobile_phone text,
  email_1 text,
  email_2 text,
  occupation_title text,
  status text,
  date_added text,
  notes text,
  screenshot_type text,
  extracted_text_evidence text,
  extraction_confidence text,
  uncertain_fields text,
  hallucination_risk text,
  reviewer_status text,
  reviewer_notes text,
  merge_recommendation text,
  possible_duplicate_group text,
  classification_reason text,
  classification_confidence text,
  extraction_version text,
  raw_row jsonb,
  import_status text default 'pending',
  created_at timestamptz default now()
);

-- Duplicate guard support for staging reruns.
create unique index if not exists staging_bullhorn_contacts_batch_image_uniq
  on public.staging_bullhorn_contacts (source_batch, source_image)
  where source_batch is not null and source_image is not null;

create unique index if not exists staging_bullhorn_companies_batch_image_uniq
  on public.staging_bullhorn_companies (source_batch, source_image)
  where source_batch is not null and source_image is not null;

-- Contact indexes
create index if not exists staging_bullhorn_contacts_company_key_idx
  on public.staging_bullhorn_contacts (company_key);
create index if not exists staging_bullhorn_contacts_possible_duplicate_group_idx
  on public.staging_bullhorn_contacts (possible_duplicate_group);
create index if not exists staging_bullhorn_contacts_email_1_idx
  on public.staging_bullhorn_contacts (email_1);
create index if not exists staging_bullhorn_contacts_email_2_idx
  on public.staging_bullhorn_contacts (email_2);
create index if not exists staging_bullhorn_contacts_bullhorn_contact_id_idx
  on public.staging_bullhorn_contacts (bullhorn_contact_id);
create index if not exists staging_bullhorn_contacts_import_status_idx
  on public.staging_bullhorn_contacts (import_status);

-- Company indexes
create index if not exists staging_bullhorn_companies_parent_company_key_idx
  on public.staging_bullhorn_companies (parent_company_key);
create index if not exists staging_bullhorn_companies_possible_duplicate_group_idx
  on public.staging_bullhorn_companies (possible_duplicate_group);
create index if not exists staging_bullhorn_companies_bullhorn_contact_id_idx
  on public.staging_bullhorn_companies (bullhorn_contact_id);
create index if not exists staging_bullhorn_companies_import_status_idx
  on public.staging_bullhorn_companies (import_status);
