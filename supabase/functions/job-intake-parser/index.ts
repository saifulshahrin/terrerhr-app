const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PARSED_JOB_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    company: { type: 'string' },
    location: { type: 'string' },
    type: { type: 'string' },
    salaryRange: { type: 'string' },
    experience: { type: 'string' },
    skills: {
      type: 'array',
      items: { type: 'string' },
    },
    niceToHave: {
      type: 'array',
      items: { type: 'string' },
    },
    startDate: { type: 'string' },
    reportingTo: { type: 'string' },
    summary: { type: 'string' },
  },
  required: [
    'title',
    'company',
    'location',
    'type',
    'salaryRange',
    'experience',
    'skills',
    'niceToHave',
    'startDate',
    'reportingTo',
    'summary',
  ],
} as const;

const GEMINI_SYSTEM_PROMPT = `You are Terrer's job intake parser.
Extract structured recruitment fields from raw job intake text.
Return JSON only.
Do not include markdown, explanations, scores, or extra keys.
Preserve recruiter-usable wording.
If a field is missing, return an empty string for string fields and [] for arrays.`;

function buildUserPrompt(input: string): string {
  return [
    'Parse the following raw job intake text into the required JSON schema.',
    'Use concise recruiter-friendly values.',
    'Do not invent salary or experience if missing.',
    'Extract 3 to 8 skills when possible.',
    'Raw input:',
    input,
  ].join('\n\n');
}

function extractGeminiText(data: any): string {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part?.text ?? '')
      .join('') ?? ''
  );
}

function normalizeGeminiModel(rawModel: string | undefined): string {
  const cleaned = (rawModel ?? '').trim().replace(/^models\//, '');

  if (!cleaned || cleaned === 'gemini-1.5-flash' || cleaned === 'gemini-2.0-flash') {
    return 'gemini-2.5-flash';
  }

  return cleaned;
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
    const { input } = await request.json();
    console.log('[job-intake-parser] Incoming request:', {
      method: request.method,
      hasInput: typeof input === 'string',
      inputLength: typeof input === 'string' ? input.length : 0,
    });

    if (typeof input !== 'string' || !input.trim()) {
      return new Response(JSON.stringify({ error: 'Input is required.' }), {
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

    console.log('[job-intake-parser] Gemini model used:', {
      configuredModel: configuredModel ?? null,
      resolvedModel: model,
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: GEMINI_SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: buildUserPrompt(input.trim()) }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: PARSED_JOB_SCHEMA,
            temperature: 0.2,
          },
        }),
      }
    );

    const data = await response.json();
    console.log('[job-intake-parser] Gemini API response:', data);

    if (!response.ok) {
      console.error('[job-intake-parser] Gemini error response:', {
        model,
        status: response.status,
        statusText: response.statusText,
        data,
      });
      return new Response(JSON.stringify({ error: 'Gemini parsing failed.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawJson = extractGeminiText(data);
    if (!rawJson) {
      throw new Error('Gemini returned an empty response body.');
    }

    let parsedJob: unknown;
    try {
      parsedJob = JSON.parse(rawJson);
    } catch (error) {
      console.error('[job-intake-parser] Failed to parse Gemini JSON text:', {
        model,
        rawJson,
        error,
      });
      throw new Error('Gemini returned invalid JSON.');
    }

    if (!parsedJob || typeof parsedJob !== 'object') {
      throw new Error('Gemini returned an invalid parsed job payload.');
    }

    return new Response(JSON.stringify({ parsedJob }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[job-intake-parser] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Failed to parse job intake input.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
