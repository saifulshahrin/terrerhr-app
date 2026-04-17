import { LayoutDashboard, Briefcase, Users, GitBranch, Star, ClipboardList, ClipboardCheck, LogOut } from 'lucide-react';
import { useRole, type AppRole } from '../store/RoleContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: AppRole[];
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard, roles: ['recruiter', 'bd', 'admin'] },
  { id: 'jobs',       label: 'Jobs',       icon: Briefcase,       roles: ['recruiter', 'bd', 'admin'] },
  { id: 'candidates', label: 'Candidates', icon: Users,           roles: ['recruiter', 'admin'] },
  { id: 'pipeline',   label: 'Pipeline',   icon: GitBranch,       roles: ['recruiter', 'bd', 'admin'] },
  { id: 'top-matches',label: 'Top Matches',icon: Star,            roles: ['recruiter', 'admin'] },
  { id: 'bd-queue',   label: 'BD Queue',   icon: ClipboardCheck,  roles: ['bd', 'admin'] },
  { id: 'job-intake', label: 'Job Intake', icon: ClipboardList,   roles: ['recruiter', 'admin'] },
];

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

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { role, logout } = useRole();

  const visibleItems = ALL_NAV_ITEMS.filter(item =>
    role === null || item.roles.includes(role)
  );

  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <div className="h-16 flex flex-col justify-center px-6 border-b border-gray-700">
        <span className="text-lg font-semibold tracking-tight text-white">Terrer OS</span>
        <span className="text-[10px] text-gray-500 tracking-wide mt-0.5">AI Driven Recruitment Engine</span>
      </div>

      <nav className="flex-1 py-4">
        {visibleItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
              activePage === id
                ? 'bg-gray-700 text-white font-medium'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700">
        {role && (
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ROLE_DOT[role]}`} />
              <span className="text-xs text-gray-400 font-medium">{ROLE_LABEL[role]}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors px-1.5 py-1 rounded hover:bg-gray-800"
              title="Switch role"
            >
              <LogOut size={12} />
              Switch
            </button>
          </div>
        )}
        <div className="px-2 text-[11px] text-gray-600">v1.0.0</div>
      </div>
    </aside>
  );
}
