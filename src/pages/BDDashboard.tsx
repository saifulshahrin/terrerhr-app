import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  PhoneCall,
  Send,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

type Priority = 'High' | 'Medium' | 'Low';
type OpportunityStage = 'Prospecting' | 'Conversation' | 'Intake' | 'Submission Ready';

interface TargetCompany {
  company: string;
  hiringSignal: string;
  roleFocus: string;
  readyCandidates: number;
  urgency: Priority;
}

interface Opportunity {
  company: string;
  role: string;
  stage: OpportunityStage;
  lastAction: string;
  nextMove: string;
}

interface RiskDeal {
  company: string;
  role: string;
  risk: string;
  staleFor: string;
}

interface ReadyCandidateSignal {
  company: string;
  role: string;
  candidates: number;
  signal: string;
}

const targetCompanies: TargetCompany[] = [
  {
    company: 'Maybank',
    hiringSignal: 'Multiple digital banking roles active',
    roleFocus: 'Software Engineer, Data Analyst',
    readyCandidates: 14,
    urgency: 'High',
  },
  {
    company: 'Grab',
    hiringSignal: 'Recurring backend and product demand',
    roleFocus: 'Backend Engineer, Product Manager',
    readyCandidates: 11,
    urgency: 'High',
  },
  {
    company: 'CIMB',
    hiringSignal: 'Open technology and risk hiring signals',
    roleFocus: 'Data, Risk Tech, Platform',
    readyCandidates: 8,
    urgency: 'Medium',
  },
  {
    company: 'Axiata',
    hiringSignal: 'Telecom digital transformation hiring',
    roleFocus: 'Frontend, Data, TPM',
    readyCandidates: 6,
    urgency: 'Medium',
  },
];

const activeOpportunities: Opportunity[] = [
  {
    company: 'Maybank',
    role: 'Senior Backend Engineer',
    stage: 'Conversation',
    lastAction: 'Intro sent 2 days ago',
    nextMove: 'Follow up with candidate shortlist',
  },
  {
    company: 'Grab',
    role: 'Product Manager',
    stage: 'Submission Ready',
    lastAction: 'Ready candidates identified',
    nextMove: 'Send capability note',
  },
  {
    company: 'CIMB',
    role: 'Data Analyst',
    stage: 'Intake',
    lastAction: 'Role scope discussed',
    nextMove: 'Request requirements confirmation',
  },
];

const dealsAtRisk: RiskDeal[] = [
  {
    company: 'Public Bank',
    role: 'Frontend Engineer',
    risk: 'No response after candidate fit note',
    staleFor: '5 days idle',
  },
  {
    company: 'Shopee',
    role: 'Data Engineer',
    risk: 'Hiring signal is active but no BD owner assigned',
    staleFor: '3 days idle',
  },
];

const readyCandidateSignals: ReadyCandidateSignal[] = [
  {
    company: 'Maybank',
    role: 'Backend Engineer',
    candidates: 7,
    signal: 'Strong GitHub-heavy backend pool ready for outreach.',
  },
  {
    company: 'Grab',
    role: 'Product / TPM',
    candidates: 4,
    signal: 'Candidate supply can support a capability-led intro.',
  },
  {
    company: 'Axiata',
    role: 'Frontend Engineer',
    candidates: 5,
    signal: 'Ready profiles match active digital hiring signals.',
  },
];

const urgencyStyle: Record<Priority, string> = {
  High: 'bg-red-50 text-red-700 border-red-200',
  Medium: 'bg-orange-50 text-orange-700 border-orange-200',
  Low: 'bg-gray-100 text-gray-600 border-gray-200',
};

const stageStyle: Record<OpportunityStage, string> = {
  Prospecting: 'bg-gray-100 text-gray-600',
  Conversation: 'bg-blue-50 text-blue-700',
  Intake: 'bg-violet-50 text-violet-700',
  'Submission Ready': 'bg-emerald-50 text-emerald-700',
};

export default function BDDashboard({ onNavigate }: Props) {
  const companiesToTarget = targetCompanies.length;
  const activeOpportunityCount = activeOpportunities.length;
  const dealsAtRiskCount = dealsAtRisk.length;
  const candidatesReady = readyCandidateSignals.reduce((sum, item) => sum + item.candidates, 0);

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">
            Business Development
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950 mt-2">
            BD Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Target the right companies, move active opportunities forward, and use ready candidate supply to strengthen outreach today.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50">
            <Building2 size={14} />
            Add New Lead
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50">
            <MessageSquare size={14} />
            Log Conversation
          </button>
          <button
            onClick={() => onNavigate('job-intake')}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
          >
            <ClipboardList size={14} />
            Create Job Intake
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Companies to Target" value={companiesToTarget} icon={<Target size={16} />} tone="teal" />
        <KpiCard label="Active Opportunities" value={activeOpportunityCount} icon={<Briefcase size={16} />} tone="blue" />
        <KpiCard label="Deals at Risk" value={dealsAtRiskCount} icon={<AlertTriangle size={16} />} tone="red" />
        <KpiCard label="Candidates Ready" value={candidatesReady} icon={<Users size={16} />} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <SectionHeader
            icon={<Target size={16} className="text-teal-600" />}
            title="Companies to Target Today"
            subtitle="Prioritized by hiring signal, role focus, and ready candidate supply."
          />
          <div className="overflow-hidden">
            <div className="grid grid-cols-[1.1fr_1.4fr_1.1fr_0.8fr_0.8fr_0.8fr] gap-3 border-y border-gray-100 bg-gray-50 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <span>Company</span>
              <span>Hiring Signal</span>
              <span>Role Focus</span>
              <span>Ready</span>
              <span>Urgency</span>
              <span>Action</span>
            </div>
            <div className="divide-y divide-gray-100">
              {targetCompanies.map(target => (
                <div
                  key={target.company}
                  className="grid grid-cols-1 gap-3 px-5 py-4 text-sm transition-colors hover:bg-gray-50 lg:grid-cols-[1.1fr_1.4fr_1.1fr_0.8fr_0.8fr_0.8fr] lg:items-center"
                >
                  <p className="font-semibold text-gray-950">{target.company}</p>
                  <p className="text-gray-600">{target.hiringSignal}</p>
                  <p className="text-gray-600">{target.roleFocus}</p>
                  <p className="font-semibold text-gray-900">{target.readyCandidates}</p>
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${urgencyStyle[target.urgency]}`}>
                    {target.urgency}
                  </span>
                  <button className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-800">
                    Start outreach
                    <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-red-200 bg-red-50/40 shadow-sm">
          <SectionHeader
            icon={<AlertTriangle size={16} className="text-red-600" />}
            title="Deals at Risk"
            subtitle="Stalled opportunities that need BD intervention."
          />
          <div className="space-y-3 px-5 pb-5">
            {dealsAtRisk.map(deal => (
              <div key={`${deal.company}-${deal.role}`} className="rounded-xl border border-red-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-950">{deal.company}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{deal.role}</p>
                  </div>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                    {deal.staleFor}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{deal.risk}</p>
                <button className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-800">
                  Rescue deal
                  <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <SectionHeader
            icon={<TrendingUp size={16} className="text-blue-600" />}
            title="Active Opportunities"
            subtitle="Live BD motions that need a clear next move."
          />
          <div className="divide-y divide-gray-100">
            {activeOpportunities.map(opportunity => (
              <div key={`${opportunity.company}-${opportunity.role}`} className="px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-950">{opportunity.company}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${stageStyle[opportunity.stage]}`}>
                        {opportunity.stage}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{opportunity.role}</p>
                    <p className="mt-1 text-xs text-gray-400">{opportunity.lastAction}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                      Log update
                    </button>
                    <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                      {opportunity.nextMove}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <SectionHeader
            icon={<Send size={16} className="text-emerald-600" />}
            title="Candidates Ready to Send"
            subtitle="Use candidate supply as the reason to reopen or start a company conversation."
          />
          <div className="grid grid-cols-1 gap-3 px-5 pb-5">
            {readyCandidateSignals.map(signal => (
              <div key={`${signal.company}-${signal.role}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-950">{signal.company}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{signal.role}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {signal.candidates} ready
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{signal.signal}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} className="text-teal-600" />
            <h2 className="text-sm font-semibold text-gray-950">Quick Hiring Insights</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <InsightCard title="Lead with supply" text="Tech and data roles have the strongest ready-candidate overlap for BD outreach." />
            <InsightCard title="Use active signals" text="Prioritize companies with multiple open roles before slower single-role leads." />
            <InsightCard title="Recover stalled deals" text="Deals idle for more than three days should get a candidate-backed follow-up." />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PhoneCall size={16} className="text-gray-700" />
            <h2 className="text-sm font-semibold text-gray-950">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            <QuickAction label="Open BD Queue" onClick={() => onNavigate('bd-queue')} />
            <QuickAction label="Review Hiring Intelligence" onClick={() => onNavigate('jobs')} />
            <QuickAction label="Create Job Intake" onClick={() => onNavigate('job-intake')} />
            <QuickAction label="Check Pipeline" onClick={() => onNavigate('pipeline')} />
          </div>
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'teal' | 'blue' | 'red' | 'emerald';
}) {
  const toneClass = {
    teal: 'bg-teal-50 text-teal-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }[tone];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <span className={`rounded-lg p-2 ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight text-gray-950">{value}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <span className="mt-0.5">{icon}</span>
      <div>
        <h2 className="text-sm font-semibold text-gray-950">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function InsightCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{text}</p>
    </div>
  );
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3.5 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
    >
      {label}
      <ArrowRight size={14} className="text-gray-400" />
    </button>
  );
}
