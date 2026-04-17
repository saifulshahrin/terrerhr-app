import { useEffect, useState } from 'react';
import { MapPin, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Job {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  onViewTopMatches: (jobId: string) => void;
}

const statusStyle: Record<string, string> = {
  Open: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-500',
  'On Hold': 'bg-yellow-100 text-yellow-700',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default function Jobs({ onViewTopMatches }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setJobs(data as Job[]);
      }
      setLoading(false);
    }
    loadJobs();
  }, []);

  const openCount = jobs.filter(j => j.status === 'Open').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{openCount} open positions</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
          + New Job
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400">No jobs yet. Use Job Intake to add one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Job Title', 'Company', 'Location', 'Status', 'Posted', ''].map((h, i) => (
                  <th key={i} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3.5 font-medium text-gray-800 whitespace-nowrap">{job.job_title}</td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{job.company_name}</td>
                  <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-gray-400" />
                      {job.location || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap text-xs">{timeAgo(job.created_at)}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right">
                    <button
                      onClick={() => onViewTopMatches(job.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <BarChart2 size={12} />
                      View Top Matches
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
