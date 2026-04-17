import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type AppRole = 'recruiter' | 'bd' | 'admin';

interface RoleContextValue {
  role: AppRole | null;
  setRole: (role: AppRole) => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

const STORAGE_KEY = 'terrer_role';

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<AppRole | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'recruiter' || stored === 'bd' || stored === 'admin') return stored;
    return null;
  });

  useEffect(() => {
    if (role) {
      localStorage.setItem(STORAGE_KEY, role);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [role]);

  function setRole(r: AppRole) {
    setRoleState(r);
  }

  function logout() {
    setRoleState(null);
  }

  return (
    <RoleContext.Provider value={{ role, setRole, logout }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
