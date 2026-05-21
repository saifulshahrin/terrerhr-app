import { useMemo } from 'react';
import {
  BarChart2,
  Briefcase,
  Camera,
  ClipboardCheck,
  ClipboardList,
  GitBranch,
  LayoutDashboard,
  LogOut,
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
  | 'bd-photo-intake'
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
        { label: 'BD Photo Intake', icon: Camera, targetPage: 'bd-photo-intake' },
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
        { label: 'BD Photo Intake', icon: Camera, targetPage: 'bd-photo-intake' },
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
        { label: 'BD Photo Intake', icon: Camera, targetPage: 'bd-photo-intake' },
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
  const { isDemoMode, canonicalRole, role, profile, setRole, logout } = useRole();
  const isStrictAdmin = !isDemoMode && canonicalRole === 'admin';
  const isViewAsActive = isStrictAdmin && role !== canonicalRole;

  const sections = useMemo(() => {
    if (!role) return [];
    return ROLE_NAV[role];
  }, [role]);

  if (!role) return null;

  return (
    <aside className="sticky top-0 flex h-screen w-72 flex-col border-r border-slate-800 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800/80 px-4 py-4">
        <div className="mb-4">
          <span className="text-base font-semibold tracking-tight text-white">Terrer OS</span>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            AI Driven Recruitment Engine
          </p>
          {isDemoMode ? (
            <span className="mt-2 inline-flex rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
              Demo Mode
            </span>
          ) : null}
          {isViewAsActive ? (
            <span className="mt-2 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
              Viewing as {ROLE_LABEL[role]}
            </span>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {profile?.full_name?.trim() || profile?.email?.trim() || ROLE_USER_NAME[role]}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${ROLE_DOT[role]}`} />
              <span className="text-xs font-medium text-slate-400">{ROLE_LABEL[role]}</span>
              <span className="text-slate-700">|</span>
              <span className="truncate text-xs text-slate-500">{profile?.email ?? 'Signed in'}</span>
            </div>
          </div>
          {isDemoMode || isStrictAdmin ? (
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-950/80 p-1">
              {(['recruiter', 'bd', 'admin'] as AppRole[]).map(option => {
                const isSelected = role === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setRole(option);
                      onNavigate('dashboard');
                    }}
                    className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      isSelected
                        ? 'bg-slate-100 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    {isDemoMode ? ROLE_LABEL[option] : `${ROLE_LABEL[option]} View`}
                  </button>
                );
              })}
            </div>
          ) : null}
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

      <div className="border-t border-slate-800/80 px-4 py-3 space-y-2">
        {!isDemoMode ? (
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-900"
          >
            <span className="flex items-center gap-2">
              <LogOut size={16} className="text-slate-400" />
              Logout
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {role}
            </span>
          </button>
        ) : (
          <p className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
            Demo mode role preview is active.
          </p>
        )}
        <p className="text-[11px] text-slate-600">v1.0.0</p>
      </div>
    </aside>
  );
}
