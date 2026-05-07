/*
  This is an operational backfill script. It uses service-role access. Run carefully.

  Usage examples:
  - DRY_RUN=true node scripts/classifyJobsWithAI.mjs
  - DRY_RUN=false CONFIRM_WRITE=true BATCH_SIZE=25 node scripts/classifyJobsWithAI.mjs
*/

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const AI_PROVIDER = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();
const DRY_RUN = (process.env.DRY_RUN ?? 'true').toLowerCase() !== 'false';
const CONFIRM_WRITE = (process.env.CONFIRM_WRITE ?? '').toLowerCase() === 'true';
const parsedBatchSize = Number.parseInt(process.env.BATCH_SIZE ?? '25', 10);
const BATCH_SIZE = Number.isFinite(parsedBatchSize) && parsedBatchSize > 0
  ? Math.min(parsedBatchSize, 500)
  : 25;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

if (!SUPABASE_URL) {
  throw new Error('Missing required env var: SUPABASE_URL');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required env var: SUPABASE_SERVICE_ROLE_KEY');
}

if (!process.env.AI_PROVIDER) {
  throw new Error('Missing required env var: AI_PROVIDER (allowed: openai | gemini)');
}

if (!['openai', 'gemini'].includes(AI_PROVIDER)) {
  throw new Error(`Unsupported AI_PROVIDER: ${AI_PROVIDER}. Use "openai" or "gemini".`);
}

if (AI_PROVIDER === 'openai' && !OPENAI_API_KEY) {
  throw new Error('Missing required env var: OPENAI_API_KEY (AI_PROVIDER=openai)');
}

if (AI_PROVIDER === 'gemini' && !GEMINI_API_KEY) {
  throw new Error('Missing required env var: GEMINI_API_KEY (AI_PROVIDER=gemini)');
}

if (!DRY_RUN && !CONFIRM_WRITE) {
  throw new Error(
    'Write mode blocked. Set CONFIRM_WRITE=true when DRY_RUN=false to allow database updates.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SYSTEM_PROMPT = `
You are Terrer AI job normalizer for Malaysia-first recruiting operations.
Classify a single job title and return strict JSON only:
{
  "normalized_job_title": string,
  "role_family": string,
  "seniority": string
}

Rules:
- Keep normalized_job_title concise and professional.
- role_family should be practical for recruiter operations. Prefer:
  "Technology / IT", "Engineering", "Data / Analytics", "Product",
  "Finance / Accounting", "Banking / Wealth", "Banking / Sales",
  "Banking / Branch Operations", "Risk / Compliance", "HR / Admin",
  "Procurement / Vendor Management", "Design / Content",
  "Operations / Transformation", "Operations / Manufacturing",
  "Operations / Customer Service", "Sales / Commercial",
  "Sales / Business Development", "Supply Chain / Logistics",
  "Cybersecurity", "Legal", "Other / Unclassified"
- seniority should be one of:
  "Intern", "Junior", "Mid-level", "Senior", "Lead", "Manager",
  "Head / Director", "Vice President", "Executive", "Not specified"
- If uncertain, set role_family to "Other / Unclassified" and seniority to "Not specified".
- Return JSON only, no markdown.
`.trim();

function cleanJsonText(raw) {
  const text = raw.trim();
  if (text.startsWith('```')) {
    return text.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  }
  return text;
}

function normalizeClassification(result, fallbackTitle) {
  const normalizedJobTitle =
    typeof result?.normalized_job_title === 'string' && result.normalized_job_title.trim()
      ? result.normalized_job_title.trim()
      : fallbackTitle;

  const roleFamily =
    typeof result?.role_family === 'string' && result.role_family.trim()
      ? result.role_family.trim()
      : 'Other / Unclassified';

  const seniority =
    typeof result?.seniority === 'string' && result.seniority.trim()
      ? result.seniority.trim()
      : 'Not specified';

  return {
    normalized_job_title: normalizedJobTitle,
    role_family: roleFamily,
    seniority,
  };
}

async function classifyWithOpenAI(jobTitle) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Classify this job title: ${jobTitle}`,
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'job_classification',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              normalized_job_title: { type: 'string' },
              role_family: { type: 'string' },
              seniority: { type: 'string' },
            },
            required: ['normalized_job_title', 'role_family', 'seniority'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const raw = data?.output_text;
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('OpenAI API returned empty output_text.');
  }

  return JSON.parse(cleanJsonText(raw));
}

function extractGeminiText(data) {
  return (
    data?.candidates?.[0]?.content?.parts?.find((part) => typeof part?.text === 'string')?.text ?? ''
  );
}

async function classifyWithGemini(jobTitle) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'user', parts: [{ text: `Classify this job title: ${jobTitle}` }] },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const raw = extractGeminiText(data);
  if (!raw.trim()) {
    throw new Error('Gemini API returned empty response text.');
  }

  return JSON.parse(cleanJsonText(raw));
}

async function classifyJobTitle(jobTitle) {
  if (AI_PROVIDER === 'gemini') {
    return classifyWithGemini(jobTitle);
  }
  return classifyWithOpenAI(jobTitle);
}

async function run() {
  console.log('[classifyJobsWithAI] starting run', {
    aiProvider: AI_PROVIDER,
    model: AI_PROVIDER === 'gemini' ? GEMINI_MODEL : OPENAI_MODEL,
    batchSize: BATCH_SIZE,
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
  });

  const { data: jobs, error: selectError } = await supabase
    .from('jobs')
    .select('id, job_title')
    .is('normalized_job_title', null)
    .order('updated_at', { ascending: false })
    .limit(BATCH_SIZE);

  if (selectError) {
    throw selectError;
  }

  if (!jobs?.length) {
    console.log('[classifyJobsWithAI] no jobs found with normalized_job_title IS NULL.');
    return;
  }

  console.log(`[classifyJobsWithAI] selected rows: ${jobs.length}`);

  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const job of jobs) {
    const rawTitle = typeof job.job_title === 'string' ? job.job_title.trim() : '';
    if (!rawTitle) {
      console.warn(`[SKIP] ${job.id} has empty job_title`);
      skippedCount += 1;
      continue;
    }

    console.log(`[JOB] id=${job.id} title="${rawTitle}"`);

    try {
      const aiResult = await classifyJobTitle(rawTitle);
      const payload = normalizeClassification(aiResult, rawTitle);

      console.log('[PROPOSED]', {
        id: job.id,
        normalized_job_title: payload.normalized_job_title,
        role_family: payload.role_family,
        seniority: payload.seniority,
      });

      if (DRY_RUN) {
        console.log(`[DRY-RUN] would update ${job.id}`);
        skippedCount += 1;
        continue;
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from('jobs')
        .update({
          normalized_job_title: payload.normalized_job_title,
          role_family: payload.role_family,
          seniority: payload.seniority,
        })
        .eq('id', job.id)
        .is('normalized_job_title', null)
        .select('id');

      if (updateError) {
        throw updateError;
      }

      if (!updatedRows?.length) {
        console.log(`[NOOP] ${job.id} not updated (likely already processed concurrently).`);
        skippedCount += 1;
        continue;
      }

      updatedCount += 1;
      console.log(
        `[OK] ${job.id} => ${payload.normalized_job_title} | ${payload.role_family} | ${payload.seniority}`
      );
    } catch (error) {
      failedCount += 1;
      console.error(`[FAIL] ${job.id}:`, error);
    }
  }

  console.log(
    `[classifyJobsWithAI] done. selected=${jobs.length}, updated=${updatedCount}, skipped=${skippedCount}, failed=${failedCount}, dryRun=${DRY_RUN}`
  );
}

run().catch((error) => {
  console.error('Job classification pipeline failed:', error);
  process.exit(1);
});
