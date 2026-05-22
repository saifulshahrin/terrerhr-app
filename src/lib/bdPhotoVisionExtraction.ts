import { supabase } from './supabase';

export type BdPhotoExtractionSource = 'mock' | 'gemini_vision';

export interface BdPhotoVisionExtracted {
  company_name: string | null;
  company_status: string | null;
  contact_full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  occupation_title: string | null;
  email: string | null;
  direct_phone: string | null;
  mobile_phone: string | null;
  address: string | null;
  jobs_count: number | null;
  submissions_count: number | null;
  interviews_count: number | null;
  placements_count: number | null;
  legacy_system_id: string | null;
  recruiter_name: string | null;
  notes_signals: string | null;
}

export interface BdPhotoVisionResult {
  source: BdPhotoExtractionSource;
  extracted: BdPhotoVisionExtracted;
  field_confidence: Partial<Record<keyof BdPhotoVisionExtracted, number | null>>;
  raw: unknown;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function coerceExtracted(obj: any): BdPhotoVisionExtracted {
  return {
    company_name: normalizeString(obj?.company_name),
    company_status: normalizeString(obj?.company_status),
    contact_full_name: normalizeString(obj?.contact_full_name),
    first_name: normalizeString(obj?.first_name),
    last_name: normalizeString(obj?.last_name),
    occupation_title: normalizeString(obj?.occupation_title),
    email: normalizeString(obj?.email),
    direct_phone: normalizeString(obj?.direct_phone),
    mobile_phone: normalizeString(obj?.mobile_phone),
    address: normalizeString(obj?.address),
    jobs_count: normalizeNumber(obj?.jobs_count),
    submissions_count: normalizeNumber(obj?.submissions_count),
    interviews_count: normalizeNumber(obj?.interviews_count),
    placements_count: normalizeNumber(obj?.placements_count),
    legacy_system_id: normalizeString(obj?.legacy_system_id),
    recruiter_name: normalizeString(obj?.recruiter_name),
    notes_signals: normalizeString(obj?.notes_signals),
  };
}

function coerceConfidence(obj: any): Partial<Record<keyof BdPhotoVisionExtracted, number | null>> {
  const out: Partial<Record<keyof BdPhotoVisionExtracted, number | null>> = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const key of Object.keys(obj)) {
    const v = (obj as any)[key];
    const n = typeof v === 'number' ? v : Number(v);
    (out as any)[key] = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
  }
  return out;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function extractBdFromPhotoWithGeminiVision(file: File): Promise<BdPhotoVisionResult> {
  const mimeType = file.type || 'image/jpeg';
  const imageBase64 = await fileToBase64(file);

  // Preferred: call a Supabase Edge Function proxy so we do not expose Gemini API keys in the browser.
  // The function should be deployed as `bd-photo-vision-extract` with secret `GEMINI_API_KEY` set.
  try {
    const { data, error } = await supabase.functions.invoke('bd-photo-vision-extract', {
      body: {
        mime_type: mimeType,
        image_base64: imageBase64,
        filename: file.name,
      },
    });

    if (error) throw error;
    const extracted = coerceExtracted((data as any)?.extracted);
    const field_confidence = coerceConfidence((data as any)?.field_confidence);

    return {
      source: 'gemini_vision',
      extracted,
      field_confidence,
      raw: (data as any)?.raw ?? data,
    };
  } catch (err) {
    // Optional fallback: direct browser call if user provided a Vite env var.
    // WARNING: This exposes the API key to anyone with devtools access.
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) {
      throw err instanceof Error ? err : new Error('Vision extraction failed');
    }

    const model = ((import.meta as any).env?.VITE_GEMINI_VISION_MODEL as string | undefined) ?? 'gemini-3.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const prompt = [
      'You are extracting structured BD relationship data from a photo or screenshot of a legacy recruiting CRM record (Bullhorn-like), business card, or recruiter notes.',
      'Return JSON ONLY (no markdown, no prose). Missing/unknown fields MUST be null. Do not guess or hallucinate.',
      'Extract only what is visible in the image.',
      '',
      'Return this exact JSON shape:',
      '{',
      '  "extracted": {',
      '    "company_name": string|null,',
      '    "company_status": string|null,',
      '    "contact_full_name": string|null,',
      '    "first_name": string|null,',
      '    "last_name": string|null,',
      '    "occupation_title": string|null,',
      '    "email": string|null,',
      '    "direct_phone": string|null,',
      '    "mobile_phone": string|null,',
      '    "address": string|null,',
      '    "jobs_count": number|null,',
      '    "submissions_count": number|null,',
      '    "interviews_count": number|null,',
      '    "placements_count": number|null,',
      '    "legacy_system_id": string|null,',
      '    "recruiter_name": string|null,',
      '    "notes_signals": string|null',
      '  },',
      '  "field_confidence": { "<field>": number|null },',
      '  "warnings": string[]',
      '}',
    ].join('\n');

    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        response_mime_type: 'application/json',
      },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Gemini Vision failed (${res.status}): ${text.slice(0, 400)}`);
    }

    const raw = await res.json();
    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = safeJsonParse(text) as any;

    const extracted = coerceExtracted(parsed?.extracted);
    const field_confidence = coerceConfidence(parsed?.field_confidence);

    return {
      source: 'gemini_vision',
      extracted,
      field_confidence,
      raw,
    };
  }
}

