import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import BDDashboard from './pages/BDDashboard';
import BDRelationships from './pages/BDRelationships';
import Jobs from './pages/Jobs';
import ActiveJobs from './pages/ActiveJobs';
import HiringIntelligence from './pages/HiringIntelligence';
import Candidates from './pages/Candidates';
import Pipeline from './pages/Pipeline';
import TopMatches from './pages/TopMatches';
import JobIntake from './pages/JobIntake';
import BDQueue from './pages/BDQueue';
import LoginScreen from './pages/LoginScreen';
import { StoreProvider } from './store/StoreContext';
import { RoleProvider, useRole } from './store/RoleContext';

type Page =
  | 'dashboard'
  | 'jobs'
  | 'active-jobs'
  | 'hiring-intelligence'
  | 'candidates'
  | 'pipeline'
  | 'top-matches'
  | 'job-intake'
  | 'bd-queue'
  | 'bd-relationships';

interface SourcingContext {
  jobId?: string;
  role: string;
  skills: string[];
}

interface NavState {
  page: Page;
  jobId?: string;
  sourcingContext?: SourcingContext;
}

function AppShell() {
  const { role, setRole } = useRole();
  const [nav, setNav] = useState<NavState>({ page: 'dashboard' });

  if (!role) {
    return <LoginScreen onSelect={setRole} />;
  }

  function navigate(page: string, jobId?: string, sourcingContext?: SourcingContext) {
    setNav({ page: page as Page, jobId, sourcingContext });
  }

  function renderPage({ page, jobId, sourcingContext }: NavState) {
    switch (page) {
      case 'dashboard':   return role === 'bd' ? <BDDashboard onNavigate={navigate} /> : <Dashboard />;
      case 'jobs':        return <Jobs onViewTopMatches={(id) => navigate('top-matches', id)} />;
      case 'active-jobs': return <ActiveJobs onViewTopMatches={(id) => navigate('top-matches', id)} />;
      case 'hiring-intelligence': return <HiringIntelligence onViewTopMatches={(id) => navigate('top-matches', id)} />;
      case 'candidates':  return <Candidates sourcingContext={sourcingContext} />;
      case 'pipeline':    return <Pipeline />;
      case 'top-matches': return <TopMatches jobId={jobId} onNavigate={navigate} />;
      case 'job-intake':  return <JobIntake onNavigate={navigate} />;
      case 'bd-queue':    return <BDQueue />;
      case 'bd-relationships': return <BDRelationships onNavigate={navigate} />;
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
