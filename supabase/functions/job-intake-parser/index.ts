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
    seniority: { type: 'string' },
    roleFamily: { type: 'string' },
    salaryRange: { type: 'string' },
    experience: { type: 'string' },
    skills: {
      type: 'array',
      items: { type: 'string' },
    },
    responsibilities: {
      type: 'array',
      items: { type: 'string' },
    },
    requirements: {
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
    'seniority',
    'roleFamily',
    'salaryRange',
    'experience',
    'skills',
    'responsibilities',
    'requirements',
    'niceToHave',
    'startDate',
    'reportingTo',
    'summary',
  ],
} as const;

const PARSED_CANDIDATE_SCHEMA = {
  type: 'object',
  properties: {
    full_name: { type: 'string' },
    current_role: { type: 'string' },
    key_skills: {
      type: 'array',
      items: { type: 'string' },
    },
    location: { type: 'string' },
    summary: { type: 'string' },
  },
  required: ['full_name', 'current_role', 'key_skills', 'location', 'summary'],
} as const;

const PARSED_ADMIN_RESUME_SCHEMA = {
  type: 'object',
  properties: {
    full_name: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    current_role: { type: 'string' },
    target_role: { type: 'string' },
    years_experience: { type: 'number' },
    location: { type: 'string' },
    key_skills: {
      type: 'array',
      items: { type: 'string' },
    },
    education: { type: 'string' },
    summary: { type: 'string' },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: [
    'full_name',
    'email',
    'phone',
    'current_role',
    'target_role',
    'years_experience',
    'location',
    'key_skills',
    'education',
    'summary',
    'confidence',
    'warnings',
  ],
} as const;

const GEMINI_SYSTEM_PROMPT = `You are Terrer's job intake parser for messy recruiter-style job descriptions.
Your job is to turn raw hiring text, copied emails, recruiter notes, unstructured JDs, chat-style notes, and partial briefs into structured recruiter-usable JSON.
Return JSON only.
Do not include markdown, explanations, scores, commentary, or extra keys.
Infer carefully when the signal is strong enough, especially for:
- title
- company
- location
- employment type
- seniority
- role family
- key skills
- responsibilities
- requirements
- salary range
Do not hallucinate employer names or compensation.
If a field is missing, return an empty string for string fields and [] for arrays.
Prefer concise, recruiter-friendly wording.
Normalize obvious shorthand where useful, but keep meaning faithful to the source.`;

const CANDIDATE_REFINEMENT_SYSTEM_PROMPT = `You are Terrer's candidate intake refinement assistant.
Extract candidate details from raw resume or profile text.
Return strict JSON only.
Do not include markdown, explanations, scores, or extra keys.
Do not hallucinate or guess.
If unsure, return an empty string for string fields and [] for arrays.
Only include clearly supported facts from the input.`;

const ADMIN_RESUME_REFINEMENT_SYSTEM_PROMPT = `You are an experienced Malaysian recruiter and resume parser.
Extract structured candidate information from the resume.

Rules:
- Identify candidate contact details only.
- Ignore references/lecturers/supervisors.
- Ignore reference emails and phones.
- Preserve Malaysian names: BIN, BINTI, ABD.
- Extract most recent role from work experience.
- Infer target role from education + work history.
- Extract recruiter-useful skills.
- Estimate experience conservatively.
- Normalize malformed Gmail if obvious.
- Return ONLY valid JSON.
- Never return explanatory text.

Return this exact schema with all keys present:
{
  "full_name": "",
  "email": "",
  "phone": "",
  "current_role": "",
  "target_role": "",
  "years_experience": 0,
  "location": "",
  "key_skills": [],
  "education": "",
  "summary": "",
  "confidence": "high|medium|low",
  "warnings": []
}
`;

function buildUserPrompt(input: string): string {
  return [
    'Parse the following raw job intake text into the required JSON schema.',
    'The input may be messy, incomplete, duplicated, casually written, or copied from recruiter messages.',
    'Use concise recruiter-friendly values.',
    'Infer employment type, seniority, and role family when strongly implied.',
    'Extract 3 to 8 concrete skills when possible.',
    'Extract up to 6 responsibilities and up to 6 requirements when present.',
    'If title is unclear, choose the best recruiter-usable title only when the text strongly supports it.',
    'Do not invent salary, company, or experience if missing.',
    'Raw input:',
    input,
  ].join('\n\n');
}

function buildCandidatePrompt(input: string): string {
  return [
    'Extract candidate details from the following raw resume or profile text.',
    'Return only the requested JSON fields.',
    'Do not infer unsupported credentials or missing details.',
    'Use up to 8 concrete skills when clearly present.',
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

function extractJsonFromText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('```')) return trimmed;

  const lines = trimmed.split('\n');
  if (lines.length < 3) return trimmed;
  if (!lines[0].startsWith('```')) return trimmed;
  if (!lines[lines.length - 1].startsWith('```')) return trimmed;

  return lines.slice(1, -1).join('\n').trim();
}

function normalizeGeminiModel(rawModel: string | undefined): string {
  const cleaned = (rawModel ?? '').trim().replace(/^models\//, '');

  if (!cleaned || cleaned === 'gemini-1.5-flash' || cleaned === 'gemini-2.0-flash') {
    return 'gemini-2.5-flash';
  }

  return cleaned;
}

function buildAdminResumePrompt(input: string): string {
  return [
    'Extract structured candidate details from the resume text below.',
    'Return JSON only, with the exact keys from the required schema.',
    'If uncertain, leave strings empty, arrays empty, and use 0 for years_experience.',
    'Never return markdown or explanations.',
    'Raw resume text:',
    input,
  ].join('\n\n');
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function looksLikeUsefulTitle(value: string): boolean {
  const normalized = value.toLowerCase();
  if (!normalized || normalized === 'not specified') return false;

  return [
    'engineer',
    'developer',
    'manager',
    'analyst',
    'designer',
    'specialist',
    'lead',
    'architect',
    'consultant',
    'executive',
    'associate',
    'scientist',
    'administrator',
    'officer',
    'coordinator',
  ].some(keyword => normalized.includes(keyword));
}

function getJobConfidence(parsedJob: Record<string, unknown>): 'high' | 'medium' | 'low' {
  const title = normalizeText(parsedJob.title);
  const skills = normalizeArray(parsedJob.skills);
  const requirements = normalizeArray(parsedJob.requirements);
  const responsibilities = normalizeArray(parsedJob.responsibilities);

  const usefulTitle = looksLikeUsefulTitle(title);
  const usefulSkills = skills.length > 0;
  const usefulRequirements = requirements.length > 0;
  const usefulResponsibilities = responsibilities.length > 0;

  if (!usefulTitle && !usefulSkills && !usefulRequirements) {
    return 'low';
  }

  if (usefulTitle && (usefulSkills || usefulRequirements || usefulResponsibilities)) {
    return 'high';
  }

  return 'medium';
}

function debugFailureResponse(
  parserMode: string | null,
  failureReason: string,
  aiAttempted: boolean,
  status = 200
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      parser_mode_received: parserMode,
      ai_attempted: aiAttempted,
      ai_success: false,
      failure_reason: failureReason,
      candidate: null,
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

function extractGeminiErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const errorObj = (data as { error?: unknown }).error;
  if (!errorObj || typeof errorObj !== 'object') return null;
  const message = (errorObj as { message?: unknown }).message;
  if (typeof message !== 'string') return null;
  const sanitized = message.replace(/\s+/g, ' ').trim();
  return sanitized ? sanitized.slice(0, 220) : null;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed',
      parser_mode_received: null,
      ai_attempted: false,
      ai_success: false,
      failure_reason: 'method_not_allowed',
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let normalizedMode: string | null = null;
  try {
    const { input, mode } = await request.json();
    normalizedMode = typeof mode === 'string' ? mode : 'job';
    console.log('[job-intake-parser] Incoming request:', {
      method: request.method,
      hasInput: typeof input === 'string',
      inputLength: typeof input === 'string' ? input.length : 0,
      mode: normalizedMode,
    });

    if (typeof input !== 'string' || !input.trim()) {
      if (normalizedMode === 'candidate_resume_admin') {
        return debugFailureResponse(normalizedMode, 'missing_input', false, 200);
      }
      return new Response(
        JSON.stringify({
          error: 'Input is required.',
          parser_mode_received: normalizedMode,
          ai_attempted: false,
          ai_success: false,
          failure_reason: 'missing_input',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const configuredModel = Deno.env.get('GEMINI_MODEL');
    const model = normalizeGeminiModel(configuredModel);

    if (!apiKey) {
      if (normalizedMode === 'candidate_resume_admin') {
        return debugFailureResponse(normalizedMode, 'Missing GEMINI_API_KEY', false, 200);
      }
      return new Response(
        JSON.stringify({
          error: 'Missing GEMINI_API_KEY environment variable.',
          parser_mode_received: normalizedMode,
          ai_attempted: false,
          ai_success: false,
          failure_reason: 'missing_gemini_api_key',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[job-intake-parser] Gemini model used:', {
      configuredModel: configuredModel ?? null,
      resolvedModel: model,
    });

    const isAdminResumeMode = normalizedMode === 'candidate_resume_admin';
    const generationConfig: Record<string, unknown> = {
      responseMimeType: 'application/json',
      temperature: 0.2,
    };

    // Keep admin resume mode on the same stable Gemini request shape as other modes.
    // Avoid nullable-union response schema constructs that can trigger Gemini 400s.
    if (!isAdminResumeMode) {
      generationConfig.responseSchema =
        normalizedMode === 'candidate' ? PARSED_CANDIDATE_SCHEMA : PARSED_JOB_SCHEMA;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text:
                normalizedMode === 'candidate'
                  ? CANDIDATE_REFINEMENT_SYSTEM_PROMPT
                  : normalizedMode === 'candidate_resume_admin'
                  ? ADMIN_RESUME_REFINEMENT_SYSTEM_PROMPT
                  : GEMINI_SYSTEM_PROMPT,
            }],
          },
          contents: [
            {
              role: 'user',
              parts: [{
                text:
                  normalizedMode === 'candidate'
                    ? buildCandidatePrompt(input.trim())
                    : normalizedMode === 'candidate_resume_admin'
                    ? buildAdminResumePrompt(input.trim())
                    : buildUserPrompt(input.trim()),
              }],
            },
          ],
          generationConfig,
        }),
      }
    );

    const data = await response.json();
    if (normalizedMode === 'candidate_resume_admin') {
      const rawText = extractGeminiText(data);
      console.log('[job-intake-parser][candidate_resume_admin] lengths:', {
        extractedTextLength: input.trim().length,
        geminiResponseLength: rawText.length,
      });
    } else {
      console.log('[job-intake-parser] Gemini API response:', data);
    }

    if (!response.ok) {
      console.error('[job-intake-parser] Gemini error response:', {
        model,
        status: response.status,
        statusText: response.statusText,
        data,
      });
      if (normalizedMode === 'candidate_resume_admin') {
        const geminiMessage = extractGeminiErrorMessage(data);
        const reason = geminiMessage
          ? `gemini_http_${response.status}: ${geminiMessage}`
          : `gemini_http_${response.status}`;
        return debugFailureResponse(normalizedMode, reason, true, 200);
      }
      return new Response(
        JSON.stringify({
          error: 'Gemini parsing failed.',
          parser_mode_received: normalizedMode,
          ai_attempted: true,
          ai_success: false,
          failure_reason: `gemini_http_${response.status}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const rawJson = extractJsonFromText(extractGeminiText(data));
    if (!rawJson) {
      if (normalizedMode === 'candidate_resume_admin') {
        return debugFailureResponse(normalizedMode, 'empty_gemini_response', true, 200);
      }
      throw new Error('Gemini returned an empty response body.');
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(rawJson);
    } catch (error) {
      console.error('[job-intake-parser] Failed to parse Gemini JSON text:', {
        model,
        error,
      });
      if (normalizedMode === 'candidate_resume_admin') {
        return debugFailureResponse(normalizedMode, 'invalid_gemini_json', true, 200);
      }
      throw new Error('Gemini returned invalid JSON.');
    }

    if (!parsedPayload || typeof parsedPayload !== 'object') {
      if (normalizedMode === 'candidate_resume_admin') {
        return debugFailureResponse(normalizedMode, 'invalid_parsed_payload', true, 200);
      }
      throw new Error('Gemini returned an invalid parsed payload.');
    }

    if (normalizedMode === 'candidate') {
      return new Response(JSON.stringify({
        parsedCandidate: parsedPayload,
        parser_mode_received: normalizedMode,
        ai_attempted: true,
        ai_success: true,
        failure_reason: null,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (normalizedMode === 'candidate_resume_admin') {
      try {
        return new Response(
          JSON.stringify({
            success: true,
            parsedAdminResume: parsedPayload,
            parser_mode_received: normalizedMode,
            ai_attempted: true,
            ai_success: true,
            failure_reason: null,
            candidate: parsedPayload,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('[job-intake-parser] candidate_resume_admin response error:', error);
        return debugFailureResponse(normalizedMode, 'candidate_resume_admin_response_error', true, 200);
      }
    }

    const confidence = getJobConfidence(parsedPayload as Record<string, unknown>);
    console.log('[job-intake-parser] Parsed job confidence:', { confidence });

    if (confidence === 'low') {
      return new Response(JSON.stringify({
        error: 'Gemini returned low-confidence job extraction.',
        parsedJob: parsedPayload,
        parserSource: 'ai',
        aiSuccess: false,
        confidence,
        parser_mode_received: normalizedMode,
        ai_attempted: true,
        ai_success: false,
        failure_reason: 'low_confidence',
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      parsedJob: parsedPayload,
      parserSource: 'ai',
      aiSuccess: true,
      confidence,
      parser_mode_received: normalizedMode,
      ai_attempted: true,
      ai_success: true,
      failure_reason: null,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[job-intake-parser] Unexpected error:', error);
    if (normalizedMode === 'candidate_resume_admin') {
      return debugFailureResponse('candidate_resume_admin', error instanceof Error ? error.message : 'unexpected_error', true, 200);
    }
    return new Response(JSON.stringify({
      error: 'Failed to parse job intake input.',
      parser_mode_received: null,
      ai_attempted: true,
      ai_success: false,
      failure_reason: error instanceof Error ? error.message : 'unexpected_error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
