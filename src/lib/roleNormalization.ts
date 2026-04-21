export type Seniority =
  | 'Intern'
  | 'Junior'
  | 'Mid-level'
  | 'Senior'
  | 'Lead'
  | 'Manager'
  | 'Head / Director'
  | 'Executive'
  | 'Vice President'
  | 'Not specified';

export interface NormalizedRoleTitle {
  raw_job_title: string;
  normalized_job_title: string;
  role_family: string;
  seniority: Seniority;
}

interface RoleRule {
  normalized_job_title: string;
  role_family: string;
  patterns: RegExp[];
}

const ROLE_RULES: RoleRule[] = [
  {
    normalized_job_title: 'Software Engineer',
    role_family: 'Technology',
    patterns: [
      /\bsoftware (engineer|developer)\b/,
      /\bbackend (engineer|developer)\b/,
      /\bback end (engineer|developer)\b/,
      /\bapplication developer\b/,
      /\bfull stack (engineer|developer)\b/,
    ],
  },
  {
    normalized_job_title: 'Frontend Engineer',
    role_family: 'Technology',
    patterns: [
      /\bfrontend (engineer|developer)\b/,
      /\bfront end (engineer|developer)\b/,
      /\bui developer\b/,
      /\bweb developer\b/,
    ],
  },
  {
    normalized_job_title: 'Data Analyst',
    role_family: 'Data',
    patterns: [
      /\bdata analyst\b/,
      /\bbusiness intelligence analyst\b/,
      /\bbi analyst\b/,
      /\banalytics analyst\b/,
      /\bcommercial excellence\b/,
    ],
  },
  {
    normalized_job_title: 'Data Scientist',
    role_family: 'Data',
    patterns: [
      /\bdata scientist\b/,
      /\bmachine learning\b/,
      /\bml engineer\b/,
      /\bmodel validation\b/,
    ],
  },
  {
    normalized_job_title: 'Product Manager',
    role_family: 'Product',
    patterns: [
      /\bproduct manager\b/,
      /\bproduct owner\b/,
      /\bproduct development\b/,
    ],
  },
  {
    normalized_job_title: 'Technical Program Manager',
    role_family: 'Program / Technology',
    patterns: [
      /\btechnical program manager\b/,
      /\btechnology program manager\b/,
      /\bprogram manager\b/,
    ],
  },
  {
    normalized_job_title: 'Project Engineer',
    role_family: 'Engineering',
    patterns: [
      /\bproject engineer\b/,
      /\bprocess engineer\b/,
      /\bindustrial engineer\b/,
      /\bquality engineer\b/,
      /\bmanufacturing engineer\b/,
      /\btest equipment specialist\b/,
    ],
  },
  {
    normalized_job_title: 'Technical Support Analyst',
    role_family: 'Technology',
    patterns: [
      /\bit technical support\b/,
      /\btechnical support analyst\b/,
      /\bsupport engineer\b/,
    ],
  },
  {
    normalized_job_title: 'Enterprise Architect',
    role_family: 'Technology',
    patterns: [
      /\benterprise architect\b/,
      /\bsolution architect\b/,
      /\btechnology planning\b/,
    ],
  },
  {
    normalized_job_title: 'Legal Associate / Junior Lawyer',
    role_family: 'Legal',
    patterns: [
      /\blegal associate\b/,
      /\bjunior lawyer\b/,
      /\bassociate counsel\b/,
      /\blegal counsel\b/,
      /\bsecretarial\b/,
    ],
  },
  {
    normalized_job_title: 'Relationship Manager',
    role_family: 'Banking / Wealth',
    patterns: [
      /\brelationship manager\b/,
      /\bwealth relationship manager\b/,
      /\baccount manager\b/,
      /\binterventional account manager\b/,
    ],
  },
  {
    normalized_job_title: 'Personal Banker',
    role_family: 'Banking / Sales',
    patterns: [
      /\bpersonal banker\b/,
      /\bpersonal financial services\b/,
      /\bmortgage sales\b/,
      /\bmortgage-\d+\b/,
      /\bauto loan sales\b/,
      /\bequity sales\b/,
    ],
  },
  {
    normalized_job_title: 'Customer Service / Operations Executive',
    role_family: 'Operations / Customer Service',
    patterns: [
      /\bcustomer service\b/,
      /\bcustomer services\b/,
      /\boperations & customer service\b/,
      /\boperations & customer services\b/,
      /\bvirtual banking\b/,
      /\border management\b/,
      /\bclient services\b/,
      /\bbusiness operations\b/,
      /\bdaily banking\b/,
    ],
  },
  {
    normalized_job_title: 'Business Banking Executive',
    role_family: 'Banking / Sales',
    patterns: [
      /\bbusiness channel/,
      /\bbusiness channels/,
      /\bbusiness financing sales\b/,
      /\bbusiness wealth sales\b/,
      /\bbusiness & corporate banking\b/,
      /\bcorporate banking\b/,
      /\bsme client engagement\b/,
      /\bcommunity deposit/,
    ],
  },
  {
    normalized_job_title: 'Branch Manager',
    role_family: 'Banking / Branch Operations',
    patterns: [
      /\bbranch manager\b/,
      /\bregional relationship director\b/,
      /\bregional wealth management\b/,
    ],
  },
  {
    normalized_job_title: 'Customer Service / Operations Executive',
    role_family: 'Operations / Customer Service',
    patterns: [
      /\bcustomer service\b/,
      /\boperations & customer service\b/,
      /\boperations & customer services\b/,
      /\bvirtual banking\b/,
      /\border management\b/,
      /\bclient services\b/,
      /\bbusiness operations\b/,
      /\bdaily banking\b/,
    ],
  },
  {
    normalized_job_title: 'Compliance / Risk Analyst',
    role_family: 'Risk / Compliance',
    patterns: [
      /\bcompliance\b/,
      /\baml\b/,
      /\bfraud\b/,
      /\bfcc\b/,
      /\brisk management\b/,
      /\boperational risk\b/,
      /\bcredit processing\b/,
      /\bcredit division\b/,
      /\bcustomer due diligence\b/,
    ],
  },
  {
    normalized_job_title: 'Finance / Accounting Analyst',
    role_family: 'Finance',
    patterns: [
      /\bfinancial institutions\b/,
      /\basset & liability\b/,
      /\bfixed assets accountant\b/,
      /\bintercompany analyst\b/,
      /\baccount executive\b/,
    ],
  },
  {
    normalized_job_title: 'Supply Chain / Logistics Analyst',
    role_family: 'Supply Chain / Logistics',
    patterns: [
      /\bsupply chain\b/,
      /\blogistic\b/,
      /\bprocurement\b/,
      /\bvendor due diligence\b/,
      /\bexports\b/,
    ],
  },
  {
    normalized_job_title: 'Sales / Commercial Manager',
    role_family: 'Sales / Commercial',
    patterns: [
      /\bsales consultant\b/,
      /\bcommercial operations\b/,
      /\bpublic sector\b/,
      /\bsales management\b/,
      /\baccount executive\b/,
    ],
  },
];

function normalizeText(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9+&/\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function deriveSeniorityFromTitle(title: string): Seniority {
  const text = normalizeText(title);

  if (/\b(intern|internship|trainee)\b/.test(text)) return 'Intern';
  if (/\b(junior|jr|entry level|entry)\b/.test(text)) return 'Junior';
  if (/\b(vice president|vp)\b/.test(text)) return 'Vice President';
  if (/\b(head|director)\b/.test(text)) return 'Head / Director';
  if (/\b(lead|team lead|principal|staff)\b/.test(text)) return 'Lead';
  if (/\b(senior|sr)\b/.test(text)) return 'Senior';
  if (/\b(manager|mgr)\b/.test(text)) return 'Manager';
  if (/\b(associate|analyst|specialist|consultant|officer|engineer)\b/.test(text)) return 'Mid-level';
  if (/\b(executive)\b/.test(text)) return 'Executive';

  return 'Not specified';
}

export function normalizeRoleTitle(rawTitle: string | null | undefined): NormalizedRoleTitle {
  const raw_job_title = rawTitle?.trim() || 'Unknown Role';
  const normalized = normalizeText(raw_job_title);
  const matchedRule = ROLE_RULES.find(rule =>
    rule.patterns.some(pattern => pattern.test(normalized))
  );

  return {
    raw_job_title,
    normalized_job_title: matchedRule?.normalized_job_title ?? raw_job_title,
    role_family: matchedRule?.role_family ?? 'Other / Unclassified',
    seniority: deriveSeniorityFromTitle(raw_job_title),
  };
}

export function normalizeJobTitles<T extends { job_title?: string | null }>(
  jobs: T[]
): Array<T & NormalizedRoleTitle> {
  return jobs.map(job => ({
    ...job,
    ...normalizeRoleTitle(job.job_title),
  }));
}
