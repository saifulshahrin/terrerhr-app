import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Candidates from './pages/Candidates';
import Pipeline from './pages/Pipeline';
import TopMatches from './pages/TopMatches';
import JobIntake from './pages/JobIntake';
import BDQueue from './pages/BDQueue';
import LoginScreen from './pages/LoginScreen';
import { StoreProvider } from './store/StoreContext';
import { RoleProvider, useRole } from './store/RoleContext';

type Page = 'dashboard' | 'jobs' | 'candidates' | 'pipeline' | 'top-matches' | 'job-intake' | 'bd-queue';

interface NavState {
  page: Page;
  jobId?: string;
}

function AppShell() {
  const { role, setRole } = useRole();
  const [nav, setNav] = useState<NavState>({ page: 'dashboard' });

  if (!role) {
    return <LoginScreen onSelect={setRole} />;
  }

  function navigate(page: string, jobId?: string) {
    setNav({ page: page as Page, jobId });
  }

  function renderPage({ page, jobId }: NavState) {
    switch (page) {
      case 'dashboard':   return <Dashboard />;
      case 'jobs':        return <Jobs onViewTopMatches={(id) => navigate('top-matches', id)} />;
      case 'candidates':  return <Candidates />;
      case 'pipeline':    return <Pipeline />;
      case 'top-matches': return <TopMatches jobId={jobId} onNavigate={navigate} />;
      case 'job-intake':  return <JobIntake onNavigate={navigate} />;
      case 'bd-queue':    return <BDQueue />;
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activePage={nav.page} onNavigate={(p) => navigate(p)} />
      <main className="flex-1 p-8 overflow-auto">
        {renderPage(nav)}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <RoleProvider>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </RoleProvider>
  );
}
