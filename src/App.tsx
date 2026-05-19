import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import BDDashboard from './pages/BDDashboard';
import BDRelationships from './pages/BDRelationships';
import BDTasksFollowUps from './pages/BDTasksFollowUps';
import Jobs from './pages/Jobs';
import ActiveJobs from './pages/ActiveJobs';
import HiringIntelligence from './pages/HiringIntelligence';
import Candidates from './pages/Candidates';
import Pipeline from './pages/Pipeline';
import TopMatches from './pages/TopMatches';
import JobIntake from './pages/JobIntake';
import BDQueue from './pages/BDQueue';
import InterestedCandidates from './pages/InterestedCandidates';
import AutonomousRecruiterRuns from './pages/AutonomousRecruiterRuns';
import LoginScreen from './pages/LoginScreen';
import CandidateProfile from './pages/CandidateProfile';
import { StoreProvider } from './store/StoreContext';
import { AuthProvider, useAuth } from './store/AuthContext';

type Page =
  | 'dashboard'
  | 'jobs'
  | 'active-jobs'
  | 'hiring-intelligence'
  | 'candidates'
  | 'pipeline'
  | 'top-matches'
  | 'candidate-profile'
  | 'job-intake'
  | 'bd-queue'
  | 'bd-relationships'
  | 'bd-tasks'
  | 'interested-candidates'
  | 'autonomous-recruiter';

interface SourcingContext {
  jobId?: string;
  role: string;
  skills: string[];
}

interface NavState {
  page: Page;
  jobId?: string;
  candidateId?: string;
  sourcingContext?: SourcingContext;
}

function AppShell() {
  const { access, blockedReason, role, profile, signOut } = useAuth();
  const [nav, setNav] = useState<NavState>({ page: 'dashboard' });

  if (access === 'loading') {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/70 bg-white/85 p-6 text-center shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
          <p className="text-sm font-semibold text-slate-950">Loading session...</p>
          <p className="mt-1 text-xs text-slate-500">Verifying access and profile.</p>
        </div>
      </div>
    );
  }

  if (access === 'unauthenticated') {
    return <LoginScreen />;
  }

  if (access === 'blocked') {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200/70 bg-white/85 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-200/70 px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Access Blocked</p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Your account is not enabled</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {blockedReason ?? 'Your account profile could not be verified.'}
            </p>
          </div>
          <div className="px-6 py-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Signed in as</p>
              <p className="mt-1">{profile?.email ?? 'Unknown user'}</p>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function navigate(page: string, jobId?: string, sourcingContext?: SourcingContext, candidateId?: string) {
    setNav({ page: page as Page, jobId, sourcingContext, candidateId });
  }

  function renderPage({ page, jobId, candidateId, sourcingContext }: NavState) {
    switch (page) {
      case 'dashboard':   return role === 'bd' ? <BDDashboard onNavigate={navigate} /> : <Dashboard onNavigate={navigate} />;
      case 'jobs':        return <Jobs onViewTopMatches={(id) => navigate('top-matches', id)} onNewJobIntake={() => navigate('job-intake')} />;
      case 'active-jobs': return <ActiveJobs onViewTopMatches={(id) => navigate('top-matches', id)} />;
      case 'hiring-intelligence': return <HiringIntelligence onViewTopMatches={(id) => navigate('top-matches', id)} />;
      case 'candidates':  return <Candidates sourcingContext={sourcingContext} />;
      case 'pipeline':    return <Pipeline />;
      case 'top-matches': return <TopMatches jobId={jobId} onNavigate={navigate} />;
      case 'candidate-profile': return <CandidateProfile candidateId={candidateId} jobId={jobId} onNavigate={navigate} />;
      case 'job-intake':  return <JobIntake onNavigate={navigate} />;
      case 'bd-queue':    return <BDQueue />;
      case 'bd-relationships': return <BDRelationships onNavigate={navigate} />;
      case 'bd-tasks': return <BDTasksFollowUps onNavigate={navigate} />;
      case 'interested-candidates': return <InterestedCandidates />;
      case 'autonomous-recruiter': return <AutonomousRecruiterRuns />;
    }
  }

  return (
    <StoreProvider>
      <div className="flex min-h-screen bg-slate-100 text-slate-900">
        <Sidebar activePage={nav.page} onNavigate={(p) => navigate(p)} />
        <main className="min-w-0 flex-1 overflow-auto px-5 py-5 lg:px-7 lg:py-6">
          {renderPage(nav)}
        </main>
      </div>
    </StoreProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
