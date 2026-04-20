import type { TerrerAIReview } from './terrerAI';
import type { Candidate } from '../store/types';

export interface SubmissionOutput {
  submission_summary: string;
  submission_strengths: string[];
  submission_concerns: string[];
  submission_full_text: string;
  submission_generated_at: string;
}

interface JobContext {
  job_title: string;
  company_name: string;
  location: string;
}

function firstName(name: string): string {
  return name.split(' ').filter(Boolean)[0] || name;
}

function ensureSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function normalizeRecruiterText(value: string): string {
  return ensureSentence(
    value
      .replace(/[—–]/g, '-')
      .replace(/â€”/g, '-')
      .replace(/\b(score|confidence|recommendation)\b.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function normalizeConcern(value: string): string {
  return value
    .replace(/[—–]/g, '-')
    .replace(/â€”/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatYearsOfExperience(candidate: Candidate): string | null {
  const candidateWithExperience = candidate as Candidate & {
    years_experience?: unknown;
    yearsExperience?: unknown;
    experience?: unknown;
  };

  const raw =
    candidateWithExperience.years_experience ??
    candidateWithExperience.yearsExperience ??
    candidateWithExperience.experience;

  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return `${raw}+ years`;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed || null;
  }

  return null;
}

function getKeySkills(candidate: Candidate): string[] {
  return candidate.skills
    .map(skill => skill.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function buildSummary(candidate: Candidate, job: JobContext, review: TerrerAIReview | null): string {
  const recruiterName = firstName(candidate.name);
  const lines: string[] = [];

  if (review?.summary) {
    lines.push(normalizeRecruiterText(review.summary));
  } else {
    lines.push(
      ensureSentence(
        `${candidate.name} is being submitted for the ${job.job_title} role at ${job.company_name}, with a background in ${candidate.role.toLowerCase()}`
      )
    );
  }

  const strengthLines = (review?.strengths ?? [])
    .slice(0, 2)
    .map(normalizeRecruiterText)
    .filter(Boolean);

  if (strengthLines.length > 0) {
    lines.push(strengthLines.join(' '));
  } else {
    const fallback = [
      candidate.company && candidate.company !== 'Unknown Source'
        ? `${recruiterName} most recently comes from ${candidate.company}`
        : '',
      candidate.location && candidate.location !== 'Unknown Location'
        ? `and is based in ${candidate.location}`
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    if (fallback) {
      lines.push(ensureSentence(fallback));
    }
  }

  if ((review?.concerns ?? []).length > 0) {
    lines.push(
      ensureSentence(
        `Main points to validate in conversation: ${review!.concerns
          .slice(0, 2)
          .map(normalizeConcern)
          .join('; ')}`
      )
    );
  } else {
    lines.push('Profile appears relevant for further client consideration based on current information.');
  }

  return lines
    .filter(Boolean)
    .slice(0, 3)
    .join('\n');
}

export function generateSubmissionOutput(
  candidate: Candidate,
  job: JobContext,
  review: TerrerAIReview | null
): SubmissionOutput {
  const now = new Date().toISOString();
  const strengths = (review?.strengths ?? [])
    .map(normalizeRecruiterText)
    .filter(Boolean)
    .slice(0, 5);
  const concerns = (review?.concerns ?? [])
    .map(normalizeRecruiterText)
    .filter(Boolean)
    .slice(0, 4);
  const yearsOfExperience = formatYearsOfExperience(candidate);
  const keySkills = getKeySkills(candidate);
  const submission_summary = buildSummary(candidate, job, review);

  const fullTextLines: string[] = [
    'CANDIDATE BRIEF',
    '',
    `Role Applied For: ${job.job_title}`,
    `Company: ${job.company_name}`,
    job.location ? `Job Location: ${job.location}` : '',
    '',
    'CANDIDATE SNAPSHOT',
    `Candidate Name: ${candidate.name}`,
    `Current Role / Title: ${candidate.role}${candidate.company && candidate.company !== 'Unknown Source' ? ` at ${candidate.company}` : ''}`,
    yearsOfExperience ? `Years of Experience: ${yearsOfExperience}` : '',
    `Location: ${candidate.location || 'Not specified'}`,
    `Key Skills: ${keySkills.length > 0 ? keySkills.join(', ') : 'Not specified'}`,
    '',
    'SUMMARY',
    submission_summary,
  ].filter(Boolean);

  if (strengths.length > 0) {
    fullTextLines.push('', 'KEY HIGHLIGHTS');
    strengths.forEach(strength => fullTextLines.push(`- ${strength}`));
  }

  if (concerns.length > 0) {
    fullTextLines.push('', 'POINTS TO CLARIFY');
    concerns.forEach(concern => fullTextLines.push(`- ${concern}`));
  }

  return {
    submission_summary,
    submission_strengths: strengths,
    submission_concerns: concerns,
    submission_full_text: fullTextLines.join('\n'),
    submission_generated_at: now,
  };
}
