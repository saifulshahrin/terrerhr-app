const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    extracted: {
      type: 'object',
      properties: {
        company_name: { type: 'string', nullable: true },
        company_status: { type: 'string', nullable: true },
        contact_full_name: { type: 'string', nullable: true },
        first_name: { type: 'string', nullable: true },
        last_name: { type: 'string', nullable: true },
        occupation_title: { type: 'string', nullable: true },
        email: { type: 'string', nullable: true },
        direct_phone: { type: 'string', nullable: true },
        mobile_phone: { type: 'string', nullable: true },
        address: { type: 'string', nullable: true },
        jobs_count: { type: 'number', nullable: true },
        submissions_count: { type: 'number', nullable: true },
        interviews_count: { type: 'number', nullable: true },
        placements_count: { type: 'number', nullable: true },
        legacy_system_id: { type: 'string', nullable: true },
        recruiter_name: { type: 'string', nullable: true },
        notes_signals: { type: 'string', nullable: true },
      },
      required: [
        'company_name',
        'company_status',
        'contact_full_name',
        'first_name',
        'last_name',
        'occupation_title',
        'email',
        'direct_phone',
        'mobile_phone',
        'address',
        'jobs_count',
        'submissions_count',
        'interviews_count',
        'placements_count',
        'legacy_system_id',
        'recruiter_name',
        'notes_signals',
      ],
    },
    field_confidence: {
      type: 'object',
      // Gemini responseSchema supports a limited JSON schema subset.
      // Do not use `additionalProperties` here.
      properties: {
        company_name: { type: 'number', nullable: true },
        company_status: { type: 'number', nullable: true },
        contact_full_name: { type: 'number', nullable: true },
        first_name: { type: 'number', nullable: true },
        last_name: { type: 'number', nullable: true },
        occupation_title: { type: 'number', nullable: true },
        email: { type: 'number', nullable: true },
        direct_phone: { type: 'number', nullable: true },
        mobile_phone: { type: 'number', nullable: true },
        address: { type: 'number', nullable: true },
        jobs_count: { type: 'number', nullable: true },
        submissions_count: { type: 'number', nullable: true },
        interviews_count: { type: 'number', nullable: true },
        placements_count: { type: 'number', nullable: true },
        legacy_system_id: { type: 'number', nullable: true },
        recruiter_name: { type: 'number', nullable: true },
        notes_signals: { type: 'number', nullable: true },
      },
      required: [
        'company_name',
        'company_status',
        'contact_full_name',
        'first_name',
        'last_name',
        'occupation_title',
        'email',
        'direct_phone',
        'mobile_phone',
        'address',
        'jobs_count',
        'submissions_count',
        'interviews_count',
        'placements_count',
        'legacy_system_id',
        'recruiter_name',
        'notes_signals',
      ],
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['extracted', 'field_confidence', 'warnings'],
} as const;

function extractGeminiText(data: any): string {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part?.text ?? '')
      .join('') ?? ''
  );
}

function normalizeGeminiModel(rawModel: string | undefined): string {
  const cleaned = (rawModel ?? '').trim().replace(/^models\//, '');
  if (!cleaned) return 'gemini-3.5-flash';
  return cleaned;
}

function buildSystemPrompt(filename: string, mimeType: string): string {
  return [
    'You are Terrer\'s BD relationship intake extraction engine.',
    'Input: a photo/screenshot of a legacy recruitment CRM record (Bullhorn-like), business card, or recruiter notes.',
    'Task: extract structured company/contact/relationship data for BD operations.',
    '',
    'STRICT RULES:',
    '- Return JSON only. No markdown. No prose. No extra keys beyond the response schema.',
    '- Never hallucinate or guess values. If a field is not clearly visible, set it to null.',
    '- Preserve phone numbers/emails exactly as shown (including country codes) when visible.',
    '- If counts are visible, return them as numbers; otherwise null.',
    '- Add brief `warnings` when the image is too blurry / partial / ambiguous.',
    '',
    `Context: file="${filename}", mime="${mimeType}".`,
    'These are Malaysia-first BD/recruiter records. Names and addresses may be Malaysian.',
  ].join('\n');
}

function buildUserPrompt(): string {
  return [
    'Extract the company/contact record from the image.',
    'If the image shows multiple records, extract the most prominent one.',
    'If multiple contacts are present, extract the primary contact.',
    '',
    'Output must match the provided JSON schema.',
  ].join('\n');
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { mime_type, image_base64, filename } = await request.json();

    if (typeof image_base64 !== 'string' || image_base64.length < 10) {
      return new Response(JSON.stringify({ error: 'image_base64 is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const configuredModel = Deno.env.get('GEMINI_MODEL');
    const model = normalizeGeminiModel(configuredModel);

    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY environment variable.');
    }

    const mimeType = typeof mime_type === 'string' && mime_type ? mime_type : 'image/jpeg';
    const fileName = typeof filename === 'string' && filename ? filename : 'upload.jpg';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildSystemPrompt(fileName, mimeType) }],
          },
          contents: [
            {
              role: 'user',
              parts: [
                { inline_data: { mime_type: mimeType, data: image_base64 } },
                { text: buildUserPrompt() },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: EXTRACTION_SCHEMA,
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[bd-photo-vision-extract] Gemini error response', {
        model,
        status: response.status,
        statusText: response.statusText,
        data,
      });
      return new Response(JSON.stringify({ error: 'Gemini Vision extraction failed.', raw: data }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawJson = extractGeminiText(data);
    if (!rawJson) {
      throw new Error('Gemini returned an empty JSON text payload.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch (error) {
      console.error('[bd-photo-vision-extract] Invalid JSON from Gemini', { rawJson, error });
      throw new Error('Gemini returned invalid JSON.');
    }

    return new Response(
      JSON.stringify({
        extracted: (parsed as any)?.extracted ?? null,
        field_confidence: (parsed as any)?.field_confidence ?? {},
        raw: {
          gemini: data,
          parsed,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[bd-photo-vision-extract] Unexpected error', error);
    return new Response(JSON.stringify({ error: 'Vision extraction failed.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
