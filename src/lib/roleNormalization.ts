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
    role_family: 'Technology / IT',
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
    role_family: 'Technology / IT',
    patterns: [
      /\bfrontend (engineer|developer)\b/,
      /\bfront end (engineer|developer)\b/,
      /\bui developer\b/,
      /\bweb developer\b/,
    ],
  },
  {
    normalized_job_title: 'Data Analyst',
    role_family: 'Data / Analytics',
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
    role_family: 'Data / Analytics',
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
    role_family: 'Technology / IT',
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
    role_family: 'Technology / IT',
    patterns: [
      /\bit technical support\b/,
      /\btechnical support analyst\b/,
      /\bsupport engineer\b/,
    ],
  },
  {
    normalized_job_title: 'Enterprise Architect',
    role_family: 'Technology / IT',
    patterns: [
      /\benterprise architect\b/,
      /\bsolution architect\b/,
      /\btechnology planning\b/,
    ],
  },
  {
    normalized_job_title: 'IT / Systems Specialist',
    role_family: 'Technology / IT',
    patterns: [
      /\bcloud\b/,
      /\bplatform\b/,
      /\bpower platform\b/,
      /\bhrit\b/,
      /\bservice now\b/,
      /\bservicenow\b/,
      /\binformation technology\b/,
      /\bit finance\b/,
      /\binvestment it\b/,
      /\bapplication transformation\b/,
      /\benterprise platform\b/,
      /\bconfiguration management database\b/,
      /\bcmdb\b/,
      /\brpa\b/,
      /\bautomation\b/,
      /\btechnology centre\b/,
      /\btechnology audit\b/,
      /\bit management\b/,
      /\bit support\b/,
      /\bcloud services\b/,
      /\bcloud automation\b/,
      /\bcloud operations\b/,
      /\bdata platform engineer\b/,
      /\btechnology solutions\b/,
      /\binformation security strategy\b/,
      /\binformation security\b/,
      /\bcyber incident response\b/,
    ],
  },
  {
    normalized_job_title: 'Cybersecurity Specialist',
    role_family: 'Cybersecurity',
    patterns: [
      /\bcyber\b/,
      /\bcybersecurity\b/,
      /\binformation security\b/,
      /\bdigital security\b/,
      /\bvulnerability\b/,
      /\bincident response\b/,
      /\bsecurity operations\b/,
      /\bsecurity strategy\b/,
      /\bthreat\b/,
      /\bsecurity centre\b/,
      /\bsecurity center\b/,
      /\bsecurity management\b/,
    ],
  },
  {
    normalized_job_title: 'Finance / Accounting Analyst',
    role_family: 'Finance / Accounting',
    patterns: [
      /\bfinance\b/,
      /\bfinancial\b/,
      /\baccounting\b/,
      /\baccountant\b/,
      /\bcost accounting\b/,
      /\bintercompany\b/,
      /\brecord to report\b/,
      /\br2r\b/,
      /\bfp&a\b/,
      /\bfinancial planning\b/,
      /\btreasury\b/,
      /\bgl\b/,
      /\bgeneral ledger\b/,
      /\bit finance\b/,
    ],
  },
  {
    normalized_job_title: 'HR / Admin Executive',
    role_family: 'HR / Admin',
    patterns: [
      /\bhr\b/,
      /\bhuman resources\b/,
      /\bhrit\b/,
      /\btalent acquisition\b/,
      /\brecruitment\b/,
      /\badmin\b/,
      /\badministrative\b/,
      /\badministrator\b/,
      /\boffice\b/,
      /\bpeople\b/,
      /\bpayroll\b/,
    ],
  },
  {
    normalized_job_title: 'Procurement / Vendor Manager',
    role_family: 'Procurement / Vendor Management',
    patterns: [
      /\bprocurement\b/,
      /\bsourcing governance\b/,
      /\bsourcing\b/,
      /\bvendor management\b/,
      /\bvendor\b/,
      /\bsupply chain\b/,
      /\border management\b/,
      /\bcategory management\b/,
      /\bpurchasing\b/,
    ],
  },
  {
    normalized_job_title: 'Content / Design Specialist',
    role_family: 'Design / Content',
    patterns: [
      /\bcontent\b/,
      /\bdesign\b/,
      /\bdesigner\b/,
      /\bgraphic\b/,
      /\bui\b/,
      /\bux\b/,
      /\bcreative\b/,
      /\bcopy\b/,
    ],
  },
  {
    normalized_job_title: 'Operations / Transformation Specialist',
    role_family: 'Operations / Transformation',
    patterns: [
      /\boperations\b/,
      /\boperation\b/,
      /\bprocess transformation\b/,
      /\bprocess engineer\b/,
      /\btransformation automation\b/,
      /\btransformation\b/,
      /\bservice hub\b/,
      /\bworkflow\b/,
      /\brso\b/,
      /\brecord to report\b/,
      /\bbusiness operations\b/,
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
      /\binterventional account manager\b/,
      /\bkey account manager\b/,
      /\brelationship management\b/,
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
  {
    normalized_job_title: 'Operator',
    role_family: 'Operations / Manufacturing',
    patterns: [
      /\boperator\b/,
      /\bproduction operator\b/,
      /\bmanufacturing operator\b/,
      /\bplant operator\b/,
      /\bmachine operator\b/,
      /\bboilerman\b/,
    ],
  },
  {
    normalized_job_title: 'Technician',
    role_family: 'Operations / Manufacturing',
    patterns: [
      /\btechnician\b/,
      /\bmaintenance technician\b/,
      /\bfield technician\b/,
      /\bservice technician\b/,
    ],
  },
  {
    normalized_job_title: 'Supervisor',
    role_family: 'Operations / Manufacturing',
    patterns: [
      /\bsupervisor\b/,
      /\bshift leader\b/,
      /\bline leader\b/,
      /\bproduction supervisor\b/,
      /\bwarehouse supervisor\b/,
    ],
  },
  {
    normalized_job_title: 'Engineer',
    role_family: 'Engineering',
    patterns: [
      /\bengineer\b/,
      /\bengineering\b/,
      /\bprocess engineering manager\b/,
      /\bmaintenance engineer\b/,
      /\bquality engineer\b/,
      /\bmechanical engineer\b/,
      /\belectrical engineer\b/,
      /\bindustrial engineer\b/,
      /\bproject engineer\b/,
      /\btest engineer\b/,
      /\bmanufacturing engineer\b/,
      /\bautomation engineer\b/,
    ],
  },
  {
    normalized_job_title: 'Accountant / Finance Analyst',
    role_family: 'Finance / Accounting',
    patterns: [
      /\baccountant\b/,
      /\baccounting\b/,
      /\bcost accounting\b/,
      /\bfinance analyst\b/,
      /\bfinancial analyst\b/,
      /\bfinancial planning\b/,
      /\bbusiness planning & analysis\b/,
      /\bintercompany analyst\b/,
      /\bfp&a\b/,
      /\baccounts payable\b/,
      /\baccounts receivable\b/,
      /\bgeneral ledger\b/,
      /\btreasury\b/,
    ],
  },
  {
    normalized_job_title: 'Banking / Financial Services Specialist',
    role_family: 'Banking / Financial Services',
    patterns: [
      /\bbanking\b/,
      /\bbank\b/,
      /\bfinancial services\b/,
      /\brelationship manager\b/,
      /\bbranch manager\b/,
      /\bpersonal banker\b/,
      /\bwealth\b/,
      /\bteller\b/,
      /\binterbroke\b/,
      /\bbroker\b/,
    ],
  },
  {
    normalized_job_title: 'Business Development / Sales Executive',
    role_family: 'Sales / Business Development',
    patterns: [
      /\bsales executive\b/,
      /\bsales manager\b/,
      /\bsales consultant\b/,
      /\bbusiness development\b/,
      /\bbusiness development executive\b/,
      /\bbd executive\b/,
      /\baccount manager\b/,
      /\bkey account\b/,
      /\baccount executive\b/,
      /\bbusiness account\b/,
      /\baccount executive\b/,
      /\bfield sales\b/,
      /\bcommercial\b/,
    ],
  },
  {
    normalized_job_title: 'HR / Admin Executive',
    role_family: 'HR / Admin',
    patterns: [
      /\bhuman resources\b/,
      /\bhr\b/,
      /\brecruiter\b/,
      /\btalent acquisition\b/,
      /\badmin\b/,
      /\badministrative\b/,
      /\badministrator\b/,
      /\boffice manager\b/,
      /\bpayroll\b/,
      /\bpeople operations\b/,
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
  if (/\b(supervisor|supervisory|shift leader|line leader)\b/.test(text)) return 'Lead';
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
