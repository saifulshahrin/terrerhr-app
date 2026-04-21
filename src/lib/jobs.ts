import { supabase } from './supabase';

export interface CreateJobParams {
  title: string;
  company: string;
  location?: string;
  description?: string;
  rawInput: string;
  type?: string;
  salaryRange?: string;
  experience?: string;
  skills?: string[];
  niceToHave?: string[];
  startDate?: string;
  reportingTo?: string;
  summary?: string;
  createdBy?: string;
}

export interface JobListRow {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CreatedJobRow {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  source: string;
  updated_at: string;
}

interface CreatedJobIntakeRow {
  job_id: string;
}

function deriveWorkMode(location?: string, rawInput?: string): string {
  const text = `${location ?? ''} ${rawInput ?? ''}`.toLowerCase();

  if (text.includes('hybrid')) return 'Hybrid';
  if (text.includes('remote')) return 'Remote';
  if (text.includes('on-site') || text.includes('onsite') || text.includes('on site')) {
    return 'On-site';
  }

  return 'Not specified';
}

function deriveSeniority(title?: string, experience?: string, rawInput?: string): string {
  const text = `${title ?? ''} ${experience ?? ''} ${rawInput ?? ''}`.toLowerCase();

  if (/(principal|staff|head|director|vp|vice president|lead|senior)/.test(text)) {
    return 'Senior';
  }
  if (/(junior|intern|entry)/.test(text)) {
    return 'Junior';
  }
  if (/(mid|3\s*-\s*5|3 to 5|4\+?\s*years|5\+?\s*years)/.test(text)) {
    return 'Mid-level';
  }

  return 'Not specified';
}

function buildIntakeNotes(params: CreateJobParams): string | null {
  const lines = [
    params.type ? `Type: ${params.type}` : null,
    params.salaryRange ? `Salary Range: ${params.salaryRange}` : null,
    params.experience ? `Experience: ${params.experience}` : null,
    params.startDate ? `Start Date: ${params.startDate}` : null,
    params.reportingTo ? `Reporting To: ${params.reportingTo}` : null,
    params.summary ? `Summary: ${params.summary}` : null,
    params.niceToHave && params.niceToHave.length > 0
      ? `Nice to Have: ${params.niceToHave.join(', ')}`
      : null,
  ].filter(Boolean);

  return lines.length > 0 ? lines.join('\n') : null;
}

export async function createJob(params: CreateJobParams) {
  console.log('[jobs.createJob] start', {
    canonicalTable: 'public.jobs',
    intakeTable: 'public.jobs_intake',
    title: params.title,
    company: params.company,
    location: params.location ?? null,
    source: 'manual_intake',
    createdBy: params.createdBy ?? 'terrer_app',
  });

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      job_title: params.title,
      company_name: params.company,
      location: params.location ?? null,
      source: 'manual_intake',
      updated_at: new Date().toISOString(),
    })
    .select('id, job_title, company_name, location, source, updated_at')
    .single();

  if (error) throw error;

  const job = data as CreatedJobRow;

  console.log('[jobs.createJob] jobs insert succeeded', {
    canonicalTable: 'public.jobs',
    jobId: job.id,
    jobTitle: job.job_title,
  });

  const intakePayload = {
    job_id: job.id,
    job_title: params.title,
    company_name: params.company,
    location: params.location ?? '',
    work_mode: deriveWorkMode(params.location, params.rawInput),
    seniority: deriveSeniority(params.title, params.experience, params.rawInput),
    skills: params.skills ?? [],
    raw_input: params.rawInput,
    created_by: params.createdBy ?? 'terrer_app',
    status: 'active',
    others_notes: buildIntakeNotes(params),
  };

  console.log('[jobs.createJob] jobs_intake insert request', {
    intakeTable: 'public.jobs_intake',
    jobId: intakePayload.job_id,
    workMode: intakePayload.work_mode,
    seniority: intakePayload.seniority,
    skillsCount: intakePayload.skills.length,
  });

  const { data: intakeData, error: intakeError } = await supabase
    .from('jobs_intake')
    .insert(intakePayload)
    .select('job_id')
    .single();

  if (intakeError) {
    console.error('[jobs.createJob] jobs_intake insert failed', {
      intakeTable: 'public.jobs_intake',
      jobId: job.id,
      intakeError,
    });
    throw intakeError;
  }

  const intake = intakeData as CreatedJobIntakeRow;

  console.log('[jobs.createJob] jobs_intake insert succeeded', {
    intakeTable: 'public.jobs_intake',
    jobId: intake.job_id,
  });

  return { job, intake };
}
export async function getJobById(jobId: string) {
  const normalizedJobId = typeof jobId === 'string' ? jobId.trim() : '';

  console.log('[jobs.getJobById] input', {
    jobId,
    type: typeof jobId,
    normalizedJobId,
  });

  console.log('[jobs.getJobById] query', { normalizedJobId });
  const { data, error } = await supabase
    .from('jobs')
    .select('id, job_title, company_name, location')
    .eq('id', normalizedJobId)
    .maybeSingle();

  console.log('[jobs.getJobById] result', {
    normalizedJobId,
    data,
    error,
  });

  if (error) throw error;
  return data;
}
export async function fetchAllJobsBasic() {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, job_title, company_name, location');

  if (error) throw error;
  return data;
}

export async function fetchAllJobs(): Promise<JobListRow[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as JobListRow[];
}
