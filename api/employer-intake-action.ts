import { createClient } from '@supabase/supabase-js';

type EmployerIntakeActionBody = {
  employerJobIntakeId?: string;
  employer_job_intake_id?: string;
  actionType?: string;
  action_type?: string;
  employerNote?: string;
  employer_note?: string;
  candidateRef?: string | null;
  status?: string;
};

type EmployerIntakeActionRow = {
  id: string;
  employer_job_intake_id: string | null;
  action_type: string;
  employer_note: string | null;
  status: string | null;
  created_at: string | null;
};

function sendJson(res: any, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function readBody(req: any): Promise<EmployerIntakeActionBody> {
  if (typeof req?.body === 'string') {
    try {
      return Promise.resolve(JSON.parse(req.body) as EmployerIntakeActionBody);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  if (req?.body && typeof req.body === 'object') {
    return Promise.resolve(req.body as EmployerIntakeActionBody);
  }

  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk: any) => {
      raw += chunk.toString('utf8');
    });

    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw) as EmployerIntakeActionBody);
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server misconfiguration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { success: false, error: 'Method not allowed.' });
    return;
  }

  try {
    const body = await readBody(req);
    const employerJobIntakeId = normalizeText(body.employerJobIntakeId ?? body.employer_job_intake_id);
    const actionType = normalizeText(body.actionType ?? body.action_type);
    const employerNote = normalizeText(body.employerNote ?? body.employer_note);
    const status = normalizeText(body.status) ?? 'new';

    if (!employerJobIntakeId || !actionType) {
      sendJson(res, 400, {
        success: false,
        error: 'Employer action details are incomplete.',
      });
      return;
    }

    const supabase = createSupabaseAdminClient();

    // Candidate linkage is intentionally deferred until the live schema supports it.
    const insertPayload = {
      employer_job_intake_id: employerJobIntakeId,
      action_type: actionType,
      employer_note: employerNote,
      status,
    };

    const { data, error } = await supabase
      .from('employer_intake_actions')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('[employer-intake-action] failed', {
        code: error.code ?? null,
        message: error.message,
      });

      sendJson(res, 500, {
        success: false,
        error: 'We could not save this action right now.',
      });
      return;
    }

    sendJson(res, 200, {
      success: true,
      action: data as EmployerIntakeActionRow,
    });
  } catch (error: any) {
    console.error('[employer-intake-action] failed', {
      name: error?.name ?? 'Error',
      message: error?.message ?? 'Unknown error',
    });

    sendJson(res, 500, {
      success: false,
      error: 'We could not save this action right now.',
    });
  }
}
