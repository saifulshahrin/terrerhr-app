import { useEffect, useRef, useState } from 'react';
import { X, Copy, Check, CheckCircle, AlertTriangle, FileText, User, Briefcase, MessageSquare, Send } from 'lucide-react';
import type { SubmissionOutput } from '../lib/submissionOutput';
import type { Candidate } from '../store/types';

interface Job {
  job_title: string;
  company_name: string;
  location: string;
}

interface Props {
  open: boolean;
  candidate: Candidate | null;
  job: Job | null;
  output: SubmissionOutput | null;
  onClose: () => void;
  onSend: (notes: string) => Promise<void>;
  sending?: boolean;
}

export default function SubmissionModal({ open, candidate, job, output, onClose, onSend, sending = false }: Props) {
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setNotes('');
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || !output || !candidate || !job) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output.submission_full_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard failures in the modal
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleSend = async () => {
    await onSend(notes.trim());
  };

  const dateStr = output.submission_generated_at
    ? new Date(output.submission_generated_at).toLocaleDateString('en-MY', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <FileText size={15} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Review & Send to BD Review</h2>
              <p className="text-xs text-gray-400">
                Finalize the recruiter submission before it moves to BD approval.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0 grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
            <User size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Candidate</p>
              <p className="text-sm font-semibold text-gray-900 leading-snug truncate">{candidate.name}</p>
              <p className="text-xs text-gray-500 truncate">{candidate.role}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
            <Briefcase size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Role</p>
              <p className="text-sm font-semibold text-gray-900 leading-snug truncate">{job.job_title}</p>
              <p className="text-xs text-gray-500 truncate">{job.company_name}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">AI Summary</p>
            <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
              {output.submission_summary}
            </p>
          </div>

          {output.submission_strengths.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Key Strengths</p>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 space-y-1.5">
                {output.submission_strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 leading-snug">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {output.submission_concerns.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Areas to Probe</p>
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 space-y-1.5">
                {output.submission_concerns.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 leading-snug">{c}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <MessageSquare size={13} className="text-gray-500" />
              <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Recruiter Notes</p>
              <span className="ml-auto text-[10px] text-gray-400 italic">Saved with the submission</span>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={`Add recruiter context for this submission...\n\nE.g. "Candidate is strong technically but may need salary alignment"\n"Spoke briefly - open to relocate"\n"Not perfect fit but best available in market right now"`}
              className="w-full px-4 py-3 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-0 leading-relaxed"
              rows={4}
            />
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Full Submission Text</p>
            <div className="relative">
              <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                {output.submission_full_text}
              </pre>
              <button
                onClick={handleCopy}
                className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition-colors ${
                  copied
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            {dateStr && <p className="text-[10px] text-gray-400 mt-1.5">Generated {dateStr}</p>}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">This brief is saved with the candidate submission.</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
                sending
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-default'
                  : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Send size={12} />
              {sending ? 'Sending...' : 'Send to BD Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
