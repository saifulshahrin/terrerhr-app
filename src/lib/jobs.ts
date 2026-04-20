import { supabase } from './supabase';

export interface CreateJobParams {
  title: string;
  company: string;
  location?: string;
  description?: string;
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

export async function createJob(params: CreateJobParams) {
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      job_title: params.title,
      company_name: params.company,
      location: params.location ?? null,
      source: 'manual_intake',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
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
