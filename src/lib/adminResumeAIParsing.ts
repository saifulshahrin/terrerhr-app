import { supabase } from './supabase';

export type ResumeAIConfidence = 'high' | 'medium' | 'low';

export interface AdminResumeAIExtraction {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  current_role: string | null;
  target_role: string | null;
  years_experience: number | null;
  location: string | null;
  key_skills: string[];
  education: string | null;
  notice_period: string | null;
  summary: string | null;
  confidence: ResumeAIConfidence;
  warnings: string[];
}

export interface AdminResumeAIParseDebug {
  parser_mode_received: string | null;
  ai_attempted: boolean;
  ai_success: boolean;
  failure_reason: string | null;
}

export interface AdminResumeAIParseResult {
  extraction: AdminResumeAIExtraction | null;
  debug: AdminResumeAIParseDebug;
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(num) ? num : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => asString(item)).filter((item): item is string => Boolean(item));
}

function asConfidence(value: unknown): ResumeAIConfidence {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'low';
}

function normalizeAIExtraction(value: unknown): AdminResumeAIExtraction {
  const obj = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    full_name: asString(obj.full_name),
    email: asString(obj.email),
    phone: asString(obj.phone),
    current_role: asString(obj.current_role),
    target_role: asString(obj.target_role),
    years_experience: asNumber(obj.years_experience),
    location: asString(obj.location),
    key_skills: asStringArray(obj.key_skills),
    education: asString(obj.education),
    notice_period: asString(obj.notice_period),
    summary: asString(obj.summary),
    confidence: asConfidence(obj.confidence),
    warnings: asStringArray(obj.warnings),
  };
}

export async function parseAdminResumeWithAI(rawText: string): Promise<AdminResumeAIParseResult> {
  if (!rawText.trim()) {
    return {
      extraction: null,
      debug: {
        parser_mode_received: 'candidate_resume_admin',
        ai_attempted: false,
        ai_success: false,
        failure_reason: 'empty_input',
      },
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('job-intake-parser', {
      body: {
        mode: 'candidate_resume_admin',
        input: rawText.trim(),
      },
    });

    if (error) {
      let detailedReason: string | null = null;
      try {
        const maybeContext = (error as { context?: Response }).context;
        if (maybeContext && typeof maybeContext.json === 'function') {
          const body = (await maybeContext.json()) as { failure_reason?: string; error?: string } | null;
          detailedReason = body?.failure_reason ?? body?.error ?? null;
        }
      } catch {
        // keep fallback below
      }
      return {
        extraction: null,
        debug: {
          parser_mode_received: 'candidate_resume_admin',
          ai_attempted: true,
          ai_success: false,
          failure_reason: detailedReason ?? error.message ?? 'invoke_error',
        },
      };
    }

    const typedData = (data ?? {}) as {
      parsedAdminResume?: unknown;
      parser_mode_received?: string | null;
      ai_attempted?: boolean;
      ai_success?: boolean;
      failure_reason?: string | null;
    };

    const payload = typedData.parsedAdminResume;
    return {
      extraction: payload ? normalizeAIExtraction(payload) : null,
      debug: {
        parser_mode_received: typedData.parser_mode_received ?? null,
        ai_attempted: Boolean(typedData.ai_attempted ?? true),
        ai_success: Boolean((typedData.ai_success ?? false) && payload),
        failure_reason: typedData.failure_reason ?? (payload ? null : 'no_payload'),
      },
    };
  } catch (error) {
    console.warn('[adminResumeAIParsing] AI parsing unavailable:', error);
    return {
      extraction: null,
      debug: {
        parser_mode_received: 'candidate_resume_admin',
        ai_attempted: true,
        ai_success: false,
        failure_reason: error instanceof Error ? error.message : 'unexpected_error',
      },
    };
  }
}
