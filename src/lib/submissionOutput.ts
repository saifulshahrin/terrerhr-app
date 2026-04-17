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

export function generateSubmissionOutput(
  candidate: Candidate,
  job: JobContext,
  review: TerrerAIReview | null
): SubmissionOutput {
  const now = new Date().toISOString();

  const strengths: string[] = review?.strengths?.slice(0, 5) ?? [];
  const concerns: string[] = review?.concerns?.slice(0, 4) ?? [];

  const strengthHighlight =
    strengths.length > 0
      ? strengths
          .slice(0, 2)
          .map(s => {
            const lower = s.toLowerCase();
            if (lower.includes('title') || lower.includes('role')) return 'strong role alignment';
            if (lower.includes('skill')) return 'relevant technical skills';
            if (lower.includes('location')) return 'location suitability';
            if (lower.includes('score') || lower.includes('profile')) return 'a strong overall profile';
            if (lower.includes('overlap') || lower.includes('requirement')) return 'solid requirement coverage';
            return s.split('—')[0].trim().toLowerCase();
          })
          .join(' and ')
      : 'relevant experience and skills';

  const recommendation = review?.recommendation ?? 'Potential Fit';

  let summaryOpener: string;
  if (recommendation === 'Strong Fit') {
    summaryOpener = `We are pleased to recommend ${candidate.name} for the ${job.job_title} role at ${job.company_name}.`;
  } else if (recommendation === 'Potential Fit') {
    summaryOpener = `We would like to present ${candidate.name} as a candidate for the ${job.job_title} role at ${job.company_name}.`;
  } else {
    summaryOpener = `We are submitting ${candidate.name} for your consideration for the ${job.job_title} role at ${job.company_name}.`;
  }

  const submission_summary =
    `${summaryOpener} ` +
    `The candidate demonstrates ${strengthHighlight}` +
    (candidate.location ? ` and is currently based in ${candidate.location}` : '') +
    `. With a background as ${candidate.role}` +
    (candidate.company ? ` at ${candidate.company}` : '') +
    `, ${candidate.name.split(' ')[0]} brings practical experience relevant to this position.` +
    (recommendation === 'Strong Fit'
      ? ' We recommend advancing this candidate to the interview stage.'
      : ' We recommend a screening call to further assess suitability.');

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dateObj = new Date();
  const formattedDate = `${dateObj.getDate()} ${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  const fullTextLines: string[] = [
    `CANDIDATE SUBMISSION`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Candidate:    ${candidate.name}`,
    `Current Role: ${candidate.role}${candidate.company ? ` at ${candidate.company}` : ''}`,
    `Location:     ${candidate.location || 'Not specified'}`,
    `Match Score:  ${candidate.score}/100`,
    ``,
    `Applying For: ${job.job_title}`,
    `Company:      ${job.company_name}`,
    `Job Location: ${job.location || 'Not specified'}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `RECRUITER SUMMARY`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    submission_summary,
    ``,
  ];

  if (review) {
    fullTextLines.push(
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `AI ASSESSMENT  (${review.recommendation.toUpperCase()} — ${review.confidence ?? 'N/A'} confidence)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      review.summary,
      ``,
    );
  }

  if (strengths.length > 0) {
    fullTextLines.push(
      `KEY STRENGTHS`,
      `─────────────────────────────────────────────────────`,
    );
    strengths.forEach(s => fullTextLines.push(`  • ${s}`));
    fullTextLines.push('');
  }

  if (concerns.length > 0) {
    fullTextLines.push(
      `AREAS TO PROBE / CONCERNS`,
      `─────────────────────────────────────────────────────`,
    );
    concerns.forEach(c => fullTextLines.push(`  • ${c}`));
    fullTextLines.push('');
  }

  fullTextLines.push(
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Submitted by: Terrer Recruit`,
    `Date: ${formattedDate}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  );

  return {
    submission_summary,
    submission_strengths: strengths,
    submission_concerns: concerns,
    submission_full_text: fullTextLines.join('\n'),
    submission_generated_at: now,
  };
}
