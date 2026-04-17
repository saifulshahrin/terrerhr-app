import { useStore } from '../store/StoreContext';
import type { SubmissionStage, Submission } from '../store/types';
import { CalendarClock } from 'lucide-react';

const PIPELINE_STAGES: { key: SubmissionStage; name: string; color: string; headerColor: string }[] = [
  { key: 'new',                 name: 'New',           color: 'border-gray-300',   headerColor: 'bg-gray-100' },
  { key: 'shortlisted',         name: 'Shortlisted',   color: 'border-blue-300',   headerColor: 'bg-blue-50' },
  { key: 'ready_for_bd_review', name: 'BD Review',     color: 'border-violet-300', headerColor: 'bg-violet-50' },
  { key: 'submitted_to_client', name: 'Submitted',     color: 'border-yellow-300', headerColor: 'bg-yellow-50' },
  { key: 'interview',           name: 'Interview',     color: 'border-orange-300', headerColor: 'bg-orange-50' },
  { key: 'offer',               name: 'Offer',         color: 'border-green-300',  headerColor: 'bg-green-50' },
];

const CANDIDATE_JOB_MAP: Record<string, string> = {
  'alice-johnson':  'Senior Frontend Engineer',
  'bob-martinez':   'Product Manager',
  'carol-chen':     'UX Designer',
  'david-kim':      'Data Analyst',
  'emily-ross':     'Backend Engineer',
  'frank-liu':      'DevOps Engineer',
  'grace-tang':     'Product Manager',
  'lena-voss':      'Senior Frontend Engineer',
  'mia-ortega':     'UX Designer',
  'priya-nair':     'Data Analyst',
  'james-ford':     'DevOps Engineer',
  'tom-harrington': 'Product Manager',
};

const scoreColor = (s: number) =>
  s >= 90 ? 'text-green-600' : s >= 80 ? 'text-blue-600' : 'text-yellow-600';

const initials = (name: string) =>
  name.split(' ').map(n => n[0]).join('');

function getDateUrgency(dateStr: string | null): 'overdue' | 'today' | 'upcoming' | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const diff = d.getTime() - today.getTime();
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  return 'upcoming';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function urgencyScore(sub: Submission): number {
  if (!sub.next_action_date) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(sub.next_action_date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() - today.getTime();
}

export default function Pipeline() {
  const { candidates, submissions } = useStore();

  const total = candidates.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Pipeline</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {total} total candidates across all stages
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageSubs = submissions
            .filter(s => s.submission_stage === stage.key)
            .sort((a, b) => urgencyScore(a) - urgencyScore(b));

          const stageCards = candidates.filter(c =>
            stageSubs.some(s => s.candidate_id === c.id)
          ).sort((a, b) => {
            const subA = stageSubs.find(s => s.candidate_id === a.id)!;
            const subB = stageSubs.find(s => s.candidate_id === b.id)!;
            return urgencyScore(subA) - urgencyScore(subB);
          });

          const newCandidates = candidates.filter(c =>
            !submissions.some(s => s.candidate_id === c.id) && stage.key === 'new'
          );

          const allCards = stage.key === 'new'
            ? [...stageCards, ...newCandidates]
            : stageCards;

          return (
            <div key={stage.key} className={`flex-shrink-0 w-56 rounded-lg border ${stage.color} overflow-hidden`}>
              <div className={`${stage.headerColor} px-4 py-3 flex items-center justify-between`}>
                <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{stage.name}</h2>
                <span className="text-xs bg-white border border-gray-200 text-gray-500 rounded-full px-2 py-0.5 font-medium">
                  {allCards.length}
                </span>
              </div>
              <div className="p-3 space-y-2 bg-white min-h-32">
                {allCards.map((card) => {
                  const sub = stageSubs.find(s => s.candidate_id === card.id);
                  const jobTitle = sub
                    ? (CANDIDATE_JOB_MAP[card.id] ?? card.role)
                    : card.role;
                  const urgency = sub ? getDateUrgency(sub.next_action_date) : null;

                  return (
                    <div key={card.id} className="bg-white border border-gray-200 rounded-md px-3 py-2.5 shadow-sm hover:shadow transition-shadow cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {initials(card.name)}
                        </div>
                        <p className="text-xs font-medium text-gray-800 truncate">{card.name}</p>
                      </div>
                      <div className="flex items-center justify-between pl-8">
                        <p className="text-xs text-gray-500 truncate">{jobTitle}</p>
                        <p className={`text-xs font-semibold flex-shrink-0 ml-1 ${scoreColor(card.score)}`}>{card.score}</p>
                      </div>
                      {sub?.next_action_date && (
                        <div className={`mt-2 pl-8 flex items-center gap-1 ${
                          urgency === 'overdue' ? 'text-red-500' :
                          urgency === 'today'   ? 'text-orange-500' :
                                                  'text-gray-400'
                        }`}>
                          <CalendarClock size={10} className="flex-shrink-0" />
                          <span className="text-[10px] font-medium leading-none">
                            {urgency === 'overdue' ? 'Overdue · ' : urgency === 'today' ? 'Today · ' : ''}
                            {formatDate(sub.next_action_date)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {allCards.length === 0 && (
                  <p className="text-xs text-gray-300 text-center py-4">No candidates</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
