/*
  BD Relationship importer (V1).

  - Reads a CSV (see docs/bd_relationship_import_format.md)
  - Upserts companies by normalized_name
  - Upserts contacts by email where available (case-insensitive)
  - Links contacts to company_id
  - Dry-run by default; write only with --apply

  Usage:
    node scripts/importBdRelationships.mjs --file data/sample_bd_relationships.csv
    node scripts/importBdRelationships.mjs --file data/sample_bd_relationships.csv --apply
*/

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const fileArgIndex = args.findIndex((arg) => arg === '--file');
const csvPath = fileArgIndex >= 0
  ? args[fileArgIndex + 1]
  : args.find((arg) => arg && !arg.startsWith('--')) ?? null;
const APPLY = args.includes('--apply');

// Prefer the explicit operational env vars, but support Vite-style env vars
// for convenience in local shells.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!csvPath) {
  throw new Error('Missing --file <path-to-csv>');
}

if (!SUPABASE_URL) {
  throw new Error(
    'Missing required env var: SUPABASE_URL (or VITE_SUPABASE_URL). ' +
      'Tip: PowerShell does not automatically read .env. Set $env:SUPABASE_URL explicitly.'
  );
}

// Dry-run is read-only, but we still validate the key is present so the
// same command can be re-run with --apply without surprises.
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing required env var: SUPABASE_SERVICE_ROLE_KEY. ' +
      'Tip: set it as a temporary env var in your shell (do not commit it to .env).'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getSupabaseHost(url) {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    return '(invalid url)';
  }
}

function logEnvDiagnostics() {
  // Do NOT print the service role key. Only print presence + URL host.
  console.log('[importBdRelationships] env', {
    apply: APPLY,
    supabaseUrlSet: Boolean(process.env.SUPABASE_URL),
    viteSupabaseUrlSet: Boolean(process.env.VITE_SUPABASE_URL),
    supabaseUrlHost: getSupabaseHost(SUPABASE_URL),
    serviceRoleKeySet: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY),
  });
}

function formatError(err) {
  if (!err) return { name: 'UnknownError', message: 'Unknown error' };
  const e = err;
  return {
    name: e?.name,
    message: e?.message,
    causeName: e?.cause?.name,
    causeMessage: e?.cause?.message,
    // Keep stack for local debugging; it's often the only hint for fetch/network errors.
    stack: e?.stack,
  };
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeEmail(value) {
  const email = normalizeText(value).toLowerCase();
  return email || '';
}

function normalizeCompanyName(value) {
  const text = normalizeText(value).toLowerCase();
  return text
    .replace(/\bmalaysia\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Minimal CSV parser that supports quoted fields and commas inside quotes.
function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field);
      field = '';
      const isEmptyRow = row.every((cell) => !normalizeText(cell));
      if (!isEmptyRow) rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    const isEmptyRow = row.every((cell) => !normalizeText(cell));
    if (!isEmptyRow) rows.push(row);
  }

  return rows;
}

async function upsertCompany(company) {
  // NOTE: public.companies exists already in Supabase with an existing schema:
  // id (bigint), company_name, company_slug, website_url, hq_country, primary_city, company_status, source_type, notes.
  // There's no unique constraint on company_slug today, so we do a read-then-insert/update flow.

  const slug = company.company_slug;
  if (!slug) {
    throw new Error('company_slug is required to upsert a company.');
  }

  const { data: existingRows, error: selectError } = await supabase
    .from('companies')
    .select('id, company_name, company_slug')
    .eq('company_slug', slug)
    .limit(1);

  if (selectError) throw selectError;

  const existing = existingRows?.[0] ?? null;
  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('companies')
      .update(company)
      .eq('id', existing.id)
      .select('id, company_name, company_slug')
      .single();

    if (updateError) throw updateError;
    return updated;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('companies')
    .insert(company)
    .select('id, company_name, company_slug')
    .single();

  if (insertError) throw insertError;
  return inserted;
}

async function upsertContactByEmail(contact) {
  const email = normalizeEmail(contact.email);
  if (!email) throw new Error('upsertContactByEmail called with empty email');

  // We avoid upsert(onConflict:'email') because the unique constraint is on lower(email).
  const { data: existingRows, error: selectError } = await supabase
    .from('bd_contacts')
    .select('id, email')
    .ilike('email', email)
    .limit(1);

  if (selectError) throw selectError;

  const existing = existingRows?.[0] ?? null;
  if (existing) {
    const { data, error } = await supabase
      .from('bd_contacts')
      .update({ ...contact, email })
      .eq('id', existing.id)
      .select('id, email, company_id')
      .single();

    if (error) throw error;
    return data;
  }

  // If an earlier import inserted the same contact without an email,
  // update that row instead of inserting a duplicate email row.
  if (contact.company_id && contact.full_name) {
    const { data: byNameRows, error: byNameError } = await supabase
      .from('bd_contacts')
      .select('id')
      .eq('company_id', contact.company_id)
      .ilike('full_name', contact.full_name)
      .limit(1);

    if (byNameError) throw byNameError;
    const byName = byNameRows?.[0] ?? null;
    if (byName) {
      const { data, error } = await supabase
        .from('bd_contacts')
        .update({ ...contact, email })
        .eq('id', byName.id)
        .select('id, email, company_id')
        .single();

      if (error) throw error;
      return data;
    }
  }

  const { data, error } = await supabase
    .from('bd_contacts')
    .insert({ ...contact, email })
    .select('id, email, company_id')
    .single();

  if (error) throw error;
  return data;
}

async function upsertContactByCompanyAndName(contact) {
  // Best-effort idempotency for rows without email:
  // de-dupe on (company_id, full_name) within the BD relationship layer.
  const { data: existingRows, error: selectError } = await supabase
    .from('bd_contacts')
    .select('id, company_id, full_name')
    .eq('company_id', contact.company_id)
    .eq('full_name', contact.full_name)
    .limit(1);

  if (selectError) throw selectError;

  const existing = existingRows?.[0] ?? null;
  if (existing) {
    const { data, error } = await supabase
      .from('bd_contacts')
      .update(contact)
      .eq('id', existing.id)
      .select('id')
      .single();

    if (error) throw error;
    return { id: data?.id, mode: 'updated' };
  }

  const { data, error } = await supabase
    .from('bd_contacts')
    .insert(contact)
    .select('id')
    .single();

  if (error) throw error;
  return { id: data?.id, mode: 'inserted' };
}

async function preflight() {
  // This catches the common "TypeError: fetch failed" early, before we loop rows.
  try {
    const { error } = await supabase.from('companies').select('id').limit(1);
    if (error) {
      console.error('[importBdRelationships] preflight select failed', { error });
      return false;
    }
    console.log('[importBdRelationships] preflight ok (companies select)');
    return true;
  } catch (err) {
    console.error('[importBdRelationships] preflight exception', formatError(err));
    return false;
  }
}

async function run() {
  logEnvDiagnostics();

  const ok = await preflight();
  if (!ok) {
    console.error(
      '[importBdRelationships] aborting import: cannot reach Supabase. ' +
        'Double-check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in THIS terminal session.'
    );
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), csvPath);
  const raw = fs.readFileSync(resolved, 'utf8');
  const rows = parseCsv(raw);
  if (rows.length < 2) {
    console.log('[importBdRelationships] no data rows found.');
    return;
  }

  const header = rows[0].map((h) => normalizeText(h));
  const dataRows = rows.slice(1);

  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const required = ['company_name', 'contact_full_name'];
  for (const col of required) {
    if (!(col in idx)) throw new Error(`Missing required column: ${col}`);
  }

  console.log('[importBdRelationships] starting', {
    file: resolved,
    rows: dataRows.length,
    apply: APPLY,
  });

  let companiesUpserted = 0;
  let contactsUpserted = 0;
  let contactsInserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of dataRows) {
    const companyName = normalizeText(row[idx.company_name]);
    const fullName = normalizeText(row[idx.contact_full_name]);

    if (!companyName || !fullName) {
      skipped += 1;
      continue;
    }

    const companyPayload = {
      company_name: companyName,
      company_slug: normalizeCompanyName(companyName) || null,
      website_url: null,
      linkedin_url: null,
      hq_country:
        idx.company_country != null ? normalizeText(row[idx.company_country]) || 'Malaysia' : 'Malaysia',
      primary_city: idx.company_city != null ? normalizeText(row[idx.company_city]) || null : null,
      company_status: 'target',
      source_type: idx.source != null ? normalizeText(row[idx.source]) || 'legacy_bd_list' : 'legacy_bd_list',
      notes: (() => {
        const notes = idx.notes != null ? normalizeText(row[idx.notes]) : '';
        const companyPhone = idx.company_phone != null ? normalizeText(row[idx.company_phone]) : '';
        const companyAddress = idx.company_address != null ? normalizeText(row[idx.company_address]) : '';
        const companyState = idx.company_state != null ? normalizeText(row[idx.company_state]) : '';

        const extras = [];
        if (companyPhone) extras.push(`Phone: ${companyPhone}`);
        if (companyAddress) extras.push(`Address: ${companyAddress}`);
        if (companyState && !companyAddress) extras.push(`State: ${companyState}`);

        const merged = [notes, ...extras].filter(Boolean).join(' | ');
        return merged || null;
      })(),
    };

    const email = idx.contact_email != null ? normalizeEmail(row[idx.contact_email]) : '';
    const contactPayload = {
      full_name: fullName,
      first_name: idx.contact_first_name != null ? normalizeText(row[idx.contact_first_name]) || null : null,
      last_name: idx.contact_last_name != null ? normalizeText(row[idx.contact_last_name]) || null : null,
      email: email || null,
      phone: idx.contact_phone != null ? normalizeText(row[idx.contact_phone]) || null : null,
      mobile_phone:
        idx.contact_mobile_phone != null ? normalizeText(row[idx.contact_mobile_phone]) || null : null,
      job_title: idx.contact_job_title != null ? normalizeText(row[idx.contact_job_title]) || null : null,
      department:
        idx.contact_department != null ? normalizeText(row[idx.contact_department]) || null : null,
      relationship_status:
        idx.relationship_status != null
          ? normalizeText(row[idx.relationship_status]) || 'new'
          : 'new',
      source: idx.source != null ? normalizeText(row[idx.source]) || 'legacy_bd_list' : 'legacy_bd_list',
      notes: (() => {
        // Store contact-level notes, but also include address context if present.
        const notes = idx.notes != null ? normalizeText(row[idx.notes]) : '';
        const companyAddress = idx.company_address != null ? normalizeText(row[idx.company_address]) : '';
        const merged = [notes, companyAddress ? `Address: ${companyAddress}` : ''].filter(Boolean).join(' | ');
        return merged || null;
      })(),
    };

    try {
      if (!APPLY) {
        console.log('[dry-run] company', companyPayload.company_name, 'contact', contactPayload.full_name);
        continue;
      }

      const company = await upsertCompany(companyPayload);
      companiesUpserted += 1;

      const contactToWrite = { ...contactPayload, company_id: company.id };
      if (email) {
        await upsertContactByEmail(contactToWrite);
        contactsUpserted += 1;
      } else {
        const result = await upsertContactByCompanyAndName(contactToWrite);
        if (result.mode === 'inserted') contactsInserted += 1;
        else contactsUpserted += 1;
      }
    } catch (error) {
      failed += 1;
      console.error('[importBdRelationships] row failed', {
        companyName,
        fullName,
        supabaseUrlHost: getSupabaseHost(SUPABASE_URL),
        error: formatError(error),
      });
    }
  }

  console.log('[importBdRelationships] done', {
    companiesUpserted,
    contactsUpserted,
    contactsInserted,
    skipped,
    failed,
    apply: APPLY,
  });
}

run().catch((error) => {
  console.error('[importBdRelationships] fatal', error);
  process.exit(1);
});
