import { supabase } from './supabase';

export interface SubmitWebCandidateIntakePayload {
  fullName: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  preferredRole?: string;
  location?: string;
  resumeFile?: File | null;
  sourcePage?: string;
  sourceJobTitle?: string;
  sourceCompany?: string;
  consentToContact: boolean;
  consentToStoreProfile: boolean;
}

export interface SubmitWebCandidateIntakeResult {
  success: boolean;
  intakeId?: string;
  resumePath?: string | null;
  error?: string;
}

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim().toLowerCase();
  const sanitized = trimmed.replace(/[^a-z0-9.\-_]+/g, '-').replace(/-+/g, '-');
  return sanitized.replace(/^-|-$/g, '') || 'resume';
}

function normalizeOptional(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function submitWebCandidateIntake(
  payload: SubmitWebCandidateIntakePayload
): Promise<SubmitWebCandidateIntakeResult> {
  let resumePath: string | null = null;

  try {
    if (payload.resumeFile) {
      const sanitizedFileName = sanitizeFileName(payload.resumeFile.name);
      resumePath = `web-intakes/${Date.now()}-${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('candidate-resumes')
        .upload(resumePath, payload.resumeFile, {
          upsert: false,
          cacheControl: '3600',
        });

      if (uploadError) {
        throw uploadError;
      }
    }

    const { data, error } = await supabase
      .from('web_candidate_intakes')
      .insert({
        full_name: payload.fullName.trim(),
        email: payload.email.trim(),
        phone: normalizeOptional(payload.phone),
        linkedin_url: normalizeOptional(payload.linkedinUrl),
        preferred_role: normalizeOptional(payload.preferredRole),
        location: normalizeOptional(payload.location),
        resume_url: resumePath,
        resume_file_name: payload.resumeFile?.name ?? null,
        source_page: normalizeOptional(payload.sourcePage),
        source_job_title: normalizeOptional(payload.sourceJobTitle),
        source_company: normalizeOptional(payload.sourceCompany),
        consent_to_contact: payload.consentToContact,
        consent_to_store_profile: payload.consentToStoreProfile,
        intake_status: 'new',
      })
      .select('id')
      .single();

    if (error) {
      if (resumePath) {
        await supabase.storage.from('candidate-resumes').remove([resumePath]);
      }
      throw error;
    }

    return {
      success: true,
      intakeId: data?.id,
      resumePath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown intake error';
    return {
      success: false,
      resumePath,
      error: message,
    };
  }
}
