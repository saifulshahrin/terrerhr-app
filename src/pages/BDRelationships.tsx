import { useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarClock,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
  StickyNote,
  Tag,
  UserRound,
  Users,
} from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

type Warmth = 'Hot' | 'Warm' | 'Cold';
type InteractionType = 'Call' | 'Email' | 'Meeting' | 'WhatsApp' | 'Note';

interface Interaction {
  type: InteractionType;
  date: string;
  summary: string;
}

interface LinkedOpportunity {
  role: string;
  company: string;
  stage: string;
}

interface RelationshipContact {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  owner: string;
  tags: string[];
  notes: string;
  lastInteraction: string;
  nextStep: string;
  followUpDue: string;
  warmth: Warmth;
  interactions: Interaction[];
  linkedOpportunities: LinkedOpportunity[];
}

const contacts: RelationshipContact[] = [
  {
    id: 'maya-tan',
    name: 'Maya Tan',
    title: 'Head of Talent Acquisition',
    company: 'Maybank',
    email: 'maya.tan@maybank.example',
    phone: '+60 12-234 1188',
    owner: 'Aisha Rahman',
    tags: ['TA', 'Decision maker', 'Digital banking'],
    notes:
      'Strong relationship. Maya is open to candidate-led outreach when Terrer can show ready supply for senior engineering and data roles.',
    lastInteraction: 'Email reply 2 days ago',
    nextStep: 'Send backend shortlist with 3 strongest profiles',
    followUpDue: 'Today',
    warmth: 'Hot',
    interactions: [
      {
        type: 'Email',
        date: 'Today',
        summary: 'Asked for a tighter backend shortlist with salary expectations.',
      },
      {
        type: 'Call',
        date: '2 days ago',
        summary: 'Discussed digital banking hiring and current platform engineering gaps.',
      },
      {
        type: 'WhatsApp',
        date: 'Last week',
        summary: 'Confirmed interest in profiles with payments or high-scale systems experience.',
      },
    ],
    linkedOpportunities: [
      { role: 'Senior Backend Engineer', company: 'Maybank', stage: 'Conversation' },
      { role: 'Data Analyst', company: 'Maybank', stage: 'Prospecting' },
    ],
  },
  {
    id: 'daniel-lim',
    name: 'Daniel Lim',
    title: 'Engineering Manager',
    company: 'Grab',
    email: 'daniel.lim@grab.example',
    phone: '+60 17-488 9021',
    owner: 'Jason Lee',
    tags: ['Hiring manager', 'Engineering', 'Product platform'],
    notes:
      'Technical buyer. Responds best to concise capability notes and GitHub-backed evidence. Avoid generic recruiter copy.',
    lastInteraction: 'Call 4 days ago',
    nextStep: 'Share product-platform candidate snapshot',
    followUpDue: 'Tomorrow',
    warmth: 'Warm',
    interactions: [
      {
        type: 'Call',
        date: '4 days ago',
        summary: 'Explored platform team needs and potential TPM / backend overlap.',
      },
      {
        type: 'Email',
        date: '1 week ago',
        summary: 'Sent initial market signal note around backend and product talent.',
      },
    ],
    linkedOpportunities: [
      { role: 'Product Manager', company: 'Grab', stage: 'Submission Ready' },
    ],
  },
  {
    id: 'nurul-hassan',
    name: 'Nurul Hassan',
    title: 'HR Business Partner',
    company: 'CIMB',
    email: 'nurul.hassan@cimb.example',
    phone: '+60 13-900 4321',
    owner: 'Aisha Rahman',
    tags: ['HR', 'Banking', 'Risk technology'],
    notes:
      'Early relationship. Needs stronger role clarity before outreach can move beyond general introduction.',
    lastInteraction: 'Meeting last week',
    nextStep: 'Ask for priority roles in risk technology',
    followUpDue: 'Friday',
    warmth: 'Warm',
    interactions: [
      {
        type: 'Meeting',
        date: 'Last week',
        summary: 'Introduced Terrer sourcing model and discussed tech hiring pressure.',
      },
      {
        type: 'Note',
        date: 'Last week',
        summary: 'Follow-up should stay focused on risk technology, not branch hiring.',
      },
    ],
    linkedOpportunities: [
      { role: 'Data Analyst', company: 'CIMB', stage: 'Intake' },
    ],
  },
  {
    id: 'rachel-ong',
    name: 'Rachel Ong',
    title: 'People Operations Lead',
    company: 'Axiata',
    email: 'rachel.ong@axiata.example',
    phone: '+60 18-221 7009',
    owner: 'Jason Lee',
    tags: ['HR', 'Digital transformation'],
    notes:
      'Low recent engagement. Relationship should be warmed with a relevant digital hiring signal before asking for a role intake.',
    lastInteraction: 'No reply for 12 days',
    nextStep: 'Reopen with frontend hiring signal',
    followUpDue: 'Overdue',
    warmth: 'Cold',
    interactions: [
      {
        type: 'Email',
        date: '12 days ago',
        summary: 'Sent intro around digital transformation roles; no response yet.',
      },
      {
        type: 'Note',
        date: '2 weeks ago',
        summary: 'Best angle is candidate supply for frontend and data roles.',
      },
    ],
    linkedOpportunities: [
      { role: 'Frontend Engineer', company: 'Axiata', stage: 'Prospecting' },
    ],
  },
];

const warmthStyle: Record<Warmth, string> = {
  Hot: 'bg-red-50 text-red-700 border-red-200',
  Warm: 'bg-orange-50 text-orange-700 border-orange-200',
  Cold: 'bg-gray-100 text-gray-600 border-gray-200',
};

const interactionIcon: Record<InteractionType, React.ReactNode> = {
  Call: <Phone size={13} />,
  Email: <Mail size={13} />,
  Meeting: <Users size={13} />,
  WhatsApp: <MessageCircle size={13} />,
  Note: <StickyNote size={13} />,
};

export default function BDRelationships({ onNavigate }: Props) {
  const [selectedContactId, setSelectedContactId] = useState(contacts[0].id);
  const selectedContact = contacts.find(contact => contact.id === selectedContactId) ?? contacts[0];

  const companyCount = new Set(contacts.map(contact => contact.company)).size;
  const activeRelationships = contacts.filter(contact => contact.warmth !== 'Cold').length;
  const followUpsDue = contacts.filter(contact =>
    ['Today', 'Overdue'].includes(contact.followUpDue)
  ).length;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">
            Relationship Memory
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950 mt-2">
            BD Relationships
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Track the real people behind hiring conversations, preserve context, and keep every follow-up moving.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <HeaderAction icon={<Plus size={14} />} label="Add New Contact" />
          <HeaderAction icon={<MessageSquare size={14} />} label="Log Interaction" />
          <HeaderAction icon={<Briefcase size={14} />} label="Link Contact to Opportunity" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Companies" value={companyCount} icon={<Building2 size={16} />} tone="teal" />
        <KpiCard label="Contacts" value={contacts.length} icon={<UserRound size={16} />} tone="blue" />
        <KpiCard label="Active Relationships" value={activeRelationships} icon={<Users size={16} />} tone="emerald" />
        <KpiCard label="Follow-ups Due" value={followUpsDue} icon={<CalendarClock size={16} />} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,0.9fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-950">Contacts / Relationships</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Prioritized relationship memory for BD conversations and next actions.
            </p>
          </div>

          <div className="hidden xl:grid grid-cols-[1.1fr_0.9fr_0.9fr_1.25fr_0.8fr_0.85fr_0.7fr_0.55fr] gap-3 border-b border-gray-100 bg-gray-50 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <span>Contact</span>
            <span>Company</span>
            <span>Role</span>
            <span>Next Step</span>
            <span>Follow-up Due</span>
            <span>Last Interaction</span>
            <span>Warmth</span>
            <span>Action</span>
          </div>

          <div className="divide-y divide-gray-100">
            {contacts.map(contact => {
              const selected = contact.id === selectedContact.id;
              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContactId(contact.id)}
                  className={`w-full px-5 py-4 text-left transition-colors ${
                    selected ? 'bg-teal-50/70' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="grid grid-cols-1 gap-3 text-sm xl:grid-cols-[1.1fr_0.9fr_0.9fr_1.25fr_0.8fr_0.85fr_0.7fr_0.55fr] xl:items-center">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-950 truncate">{contact.name}</p>
                      <p className="text-xs text-gray-400 truncate">{contact.email}</p>
                    </div>
                    <p className="text-gray-600">{contact.company}</p>
                    <p className="text-gray-600">{contact.title}</p>
                    <p className="font-semibold text-gray-950 leading-snug">{contact.nextStep}</p>
                    <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                      contact.followUpDue === 'Overdue'
                        ? 'bg-red-100 text-red-700'
                        : contact.followUpDue === 'Today'
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {contact.followUpDue}
                    </span>
                    <p className="text-xs text-gray-400">{contact.lastInteraction}</p>
                    <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${warmthStyle[contact.warmth]}`}>
                      {contact.warmth}
                    </span>
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white">
                      View
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-gray-950">{selectedContact.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {selectedContact.title} · {selectedContact.company}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${warmthStyle[selectedContact.warmth]}`}>
                  {selectedContact.warmth}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-600">
                <DetailLine label="Owner" value={selectedContact.owner} strong />
                <DetailLine label="Email" value={selectedContact.email} />
                <DetailLine label="Phone" value={selectedContact.phone} />
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {selectedContact.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600"
                  >
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                  Next Action
                </p>
                <p className="text-sm font-semibold text-gray-950 mt-1">{selectedContact.nextStep}</p>
                <p className="text-xs text-teal-700 mt-2">
                  Follow-up due: <span className="font-semibold">{selectedContact.followUpDue}</span>
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Relationship Notes
                </p>
                <p className="text-sm leading-relaxed text-gray-600">{selectedContact.notes}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Linked Opportunities
                </p>
                <div className="space-y-2">
                  {selectedContact.linkedOpportunities.map(opportunity => (
                    <div
                      key={`${opportunity.company}-${opportunity.role}-${opportunity.stage}`}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                    >
                      <p className="text-sm font-semibold text-gray-900">{opportunity.role}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{opportunity.company}</span>
                        <span>·</span>
                        <span>{opportunity.stage}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-950">Interaction History</h2>
            <div className="mt-4 space-y-4">
              {selectedContact.interactions.map((interaction, index) => (
                <div key={`${interaction.type}-${interaction.date}-${index}`} className="flex gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    {interactionIcon[interaction.type]}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{interaction.type}</p>
                      <span className="text-xs text-gray-400">{interaction.date}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{interaction.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-950 mb-4">Quick Relationship Actions</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <QuickAction label="Log Call" />
              <QuickAction label="Log Email" />
              <QuickAction label="Add Note" />
              <QuickAction label="Set Next Follow-up" />
              <QuickAction label="Open Company" onClick={() => onNavigate('jobs')} />
              <QuickAction label="Open Opportunity" onClick={() => onNavigate('pipeline')} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function HeaderAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50">
      {icon}
      {label}
    </button>
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
  tone: 'teal' | 'blue' | 'emerald' | 'amber';
}) {
  const toneClass = {
    teal: 'bg-teal-50 text-teal-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
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

function DetailLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className={`text-right ${strong ? 'font-semibold text-gray-950' : 'text-gray-600'}`}>
        {value}
      </span>
    </div>
  );
}

function QuickAction({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between rounded-xl border border-gray-200 px-3.5 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
    >
      {label}
      <ArrowRight size={14} className="text-gray-400" />
    </button>
  );
}
