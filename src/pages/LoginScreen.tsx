import { useState } from 'react';
import { Users, ClipboardCheck, Shield } from 'lucide-react';
import type { AppRole } from '../store/RoleContext';

interface RoleOption {
  role: AppRole;
  label: string;
  description: string;
  access: string[];
  icon: React.ReactNode;
  accent: string;
  border: string;
  badge: string;
}

const ROLES: RoleOption[] = [
  {
    role: 'recruiter',
    label: 'Recruiter',
    description: 'Source, evaluate, and manage candidates through the pipeline.',
    access: ['Dashboard', 'Jobs', 'Candidates', 'Pipeline', 'Top Matches', 'Job Intake'],
    icon: <Users size={22} />,
    accent: 'text-blue-600',
    border: 'border-blue-500',
    badge: 'bg-blue-50 text-blue-700',
  },
  {
    role: 'bd',
    label: 'BD',
    description: 'Review recruiter submissions and approve candidates for client.',
    access: ['Dashboard', 'BD Queue', 'Jobs', 'Pipeline'],
    icon: <ClipboardCheck size={22} />,
    accent: 'text-teal-600',
    border: 'border-teal-500',
    badge: 'bg-teal-50 text-teal-700',
  },
  {
    role: 'admin',
    label: 'Admin',
    description: 'Full access to all pages and actions across the platform.',
    access: ['All pages', 'All actions'],
    icon: <Shield size={22} />,
    accent: 'text-gray-700',
    border: 'border-gray-700',
    badge: 'bg-gray-100 text-gray-700',
  },
];

interface Props {
  onSelect: (role: AppRole) => void;
}

export default function LoginScreen({ onSelect }: Props) {
  const [selected, setSelected] = useState<AppRole | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 tracking-tight">Terrer OS</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Who are you signing in as?</h1>
          <p className="text-sm text-gray-500">Select your role to continue. Role controls what you see and what actions you can take.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {ROLES.map(opt => {
            const isSelected = selected === opt.role;
            return (
              <button
                key={opt.role}
                onClick={() => setSelected(opt.role)}
                className={`w-full text-left rounded-xl border-2 bg-white p-5 transition-all duration-150 shadow-sm hover:shadow-md ${
                  isSelected ? `${opt.border} shadow-md` : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`mb-3 ${isSelected ? opt.accent : 'text-gray-400'} transition-colors`}>
                  {opt.icon}
                </div>
                <p className={`text-base font-semibold mb-1 ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{opt.description}</p>
                <div className="space-y-1">
                  {opt.access.map(a => (
                    <span key={a} className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full mr-1 mb-1 ${isSelected ? opt.badge : 'bg-gray-100 text-gray-500'}`}>
                      {a}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className="px-8 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue as {selected ? ROLES.find(r => r.role === selected)?.label : '—'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          This is a role-preview mode. Full authentication is not yet enabled.
        </p>
      </div>
    </div>
  );
}
