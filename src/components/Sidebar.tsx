import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart2,
  Briefcase,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  GitBranch,
  LayoutDashboard,
  Settings,
  Shield,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { useRole, type AppRole } from '../store/RoleContext';

type AppPage =
  | 'dashboard'
  | 'jobs'
  | 'active-jobs'
  | 'hiring-intelligence'
  | 'candidates'
  | 'pipeline'
  | 'top-matches'
  | 'job-intake'
  | 'bd-queue'
  | 'bd-relationships'
  | 'bd-tasks'
  | 'interested-candidates'
  | 'autonomous-recruiter';

interface NavItem {
  label: string;
  icon: React.ElementType;
  targetPage?: AppPage;
  comingSoon?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const ROLE_LABEL: Record<AppRole, string> = {
  recruiter: 'Recruiter',
  bd: 'BD',
  admin: 'Admin',
};

const ROLE_DOT: Record<AppRole, string> = {
  recruiter: 'bg-blue-400',
  bd: 'bg-teal-400',
  admin: 'bg-gray-400',
};

const ROLE_USER_NAME: Record<AppRole, string> = {
  recruiter: 'Terrer Recruiter',
  bd: 'Terrer BD',
  admin: 'Terrer Admin',
};

const ROLE_NAV: Record<AppRole, NavSection[]> = {
  bd: [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, targetPage: 'dashboard' },
        { label: 'BD Relationships', icon: Users, targetPage: 'bd-relationships' },
        { label: 'Opportunities (Coming Soon)', icon: Briefcase, comingSoon: true },
        { label: 'BD Playbook', icon: Sparkles, comingSoon: true },
        { label: 'Tasks & Follow-ups', icon: ClipboardList, targetPage: 'bd-tasks' },
      ],
    },
    {
      label: 'Pipeline',
      items: [
        { label: 'Active Jobs', icon: ClipboardList, targetPage: 'active-jobs' },
        { label: 'Deals at Risk', icon: BarChart2, comingSoon: true },
        { label: 'Submissions', icon: ClipboardCheck, targetPage: 'bd-queue' },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { label: 'Hiring Intelligence', icon: BarChart2, targetPage: 'hiring-intelligence' },
        { label: 'Candidates', icon: Users, targetPage: 'candidates' },
      ],
    },
    {
      label: 'Settings',
      items: [
        { label: 'Settings', icon: Settings, comingSoon: true },
        { label: 'Activity Log', icon: ClipboardList, comingSoon: true },
      ],
    },
  ],
  recruiter: [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, targetPage: 'dashboard' },
        { label: 'Jobs', icon: Briefcase, targetPage: 'jobs' },
        { label: 'Candidates', icon: Users, targetPage: 'candidates' },
        { label: 'Pipeline', icon: GitBranch, targetPage: 'pipeline' },
        { label: 'Top Matches / AI Review', icon: Star, targetPage: 'top-matches' },
        { label: 'Job Intake', icon: ClipboardList, targetPage: 'job-intake' },
        { label: 'Autonomous Recruiter', icon: Sparkles, targetPage: 'autonomous-recruiter' },
      ],
    },
    {
      label: 'Tools',
      items: [
        { label: 'Submission Output', icon: ClipboardCheck, targetPage: 'pipeline' },
        { label: 'Activity Log', icon: ClipboardList, comingSoon: true },
      ],
    },
    {
      label: 'Settings',
      items: [
        { label: 'Settings', icon: Settings, comingSoon: true },
      ],
    },
  ],
  admin: [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, targetPage: 'dashboard' },
        { label: 'Jobs', icon: Briefcase, targetPage: 'jobs' },
        { label: 'Candidates', icon: Users, targetPage: 'candidates' },
        { label: 'Pipeline', icon: GitBranch, targetPage: 'pipeline' },
        { label: 'Top Matches / AI Review', icon: Star, targetPage: 'top-matches' },
        { label: 'Job Intake', icon: ClipboardList, targetPage: 'job-intake' },
        { label: 'Autonomous Recruiter', icon: Sparkles, targetPage: 'autonomous-recruiter' },
      ],
    },
    {
      label: 'Business',
      items: [
        { label: 'BD Relationships', icon: Users, targetPage: 'bd-relationships' },
        { label: 'Opportunities', icon: Briefcase, targetPage: 'active-jobs' },
        { label: 'Submissions', icon: ClipboardCheck, targetPage: 'bd-queue' },
      ],
    },
    {
      label: 'System',
      items: [
        { label: 'Users', icon: Shield, comingSoon: true },
        { label: 'Settings', icon: Settings, comingSoon: true },
        { label: 'Activity Log', icon: ClipboardList, comingSoon: true },
      ],
    },
  ],
};

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { role, setRole } = useRole();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const sections = useMemo(() => {
    if (!role) return [];
    return ROLE_NAV[role];
  }, [role]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setRoleSwitcherOpen(false);
      }
    }

    if (roleSwitcherOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [roleSwitcherOpen]);

  if (!role) return null;

  const handleRoleSwitch = (nextRole: AppRole) => {
    setRole(nextRole);
    setRoleSwitcherOpen(false);
    onNavigate('dashboard');
  };

  return (
    <aside className="sticky top-0 flex h-screen w-72 flex-col border-r border-slate-800 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800/80 px-4 py-4">
        <div className="mb-4">
          <span className="text-base font-semibold tracking-tight text-white">Terrer OS</span>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            AI Driven Recruitment Engine
          </p>
        </div>

        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setRoleSwitcherOpen(open => !open)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-left transition-colors hover:border-slate-700 hover:bg-slate-900"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{ROLE_USER_NAME[role]}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${ROLE_DOT[role]}`} />
                <span className="text-xs font-medium text-slate-400">{ROLE_LABEL[role]}</span>
              </div>
            </div>
            <ChevronDown
              size={16}
              className={`flex-shrink-0 text-slate-500 transition-transform ${roleSwitcherOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {roleSwitcherOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-2xl shadow-black/30">
              {(['recruiter', 'bd', 'admin'] as AppRole[]).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleRoleSwitch(option)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    role === option
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{ROLE_LABEL[option]}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${ROLE_DOT[option]}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4">
        <div className="space-y-5">
          {sections.map(section => (
            <div key={section.label}>
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {section.label}
              </p>
              <div className="mt-2 space-y-1">
                {section.items.map(({ label, icon: Icon, targetPage, comingSoon }) => {
                  const isActive = Boolean(targetPage && activePage === targetPage);
                  const isDisabled = !targetPage || comingSoon;

                  return (
                    <button
                      key={`${section.label}-${label}`}
                      type="button"
                      onClick={() => {
                        if (targetPage) onNavigate(targetPage);
                      }}
                      disabled={isDisabled}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-slate-800 text-white shadow-sm'
                          : isDisabled
                          ? 'text-slate-600 cursor-not-allowed'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={16} />
                        <span>{label}</span>
                      </span>
                      {comingSoon && (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-800">
                          Soon
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-800/80 px-4 py-3">
        <p className="text-[11px] text-slate-600">v1.0.0</p>
      </div>
    </aside>
  );
}
