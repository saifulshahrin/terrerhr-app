import { useState } from 'react';
import { AlertTriangle, Lock, Mail, Shield } from 'lucide-react';
import { useAuth } from '../store/AuthContext';

export default function LoginScreen() {
  const { signInWithPassword, authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <span className="text-sm font-semibold">T</span>
            </div>
            <div className="text-left">
              <p className="text-base font-semibold tracking-tight text-slate-950">Terrer OS</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Internal App Layer
              </p>
            </div>
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">Sign in</h1>
          <p className="mt-2 text-sm text-slate-500">
            Use your Terrer account email and password. Access requires an active profile record.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/85 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-200/70 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Shield size={16} className="text-slate-500" />
              Secure Login
            </div>
            <p className="mt-1 text-xs text-slate-500">Supabase Auth email/password.</p>
          </div>

          <form
            className="space-y-4 px-5 py-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setFormError(null);

              const { error } = await signInWithPassword(email, password);
              if (error) setFormError(error);

              setSubmitting(false);
            }}
          >
            {formError ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle size={16} className="mt-0.5 text-amber-600" />
                <p className="leading-relaxed">{formError}</p>
              </div>
            ) : null}

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Email</span>
              <div className="relative mt-1">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Password</span>
              <div className="relative mt-1">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  type="password"
                  placeholder="********"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting || authLoading}
              className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          If you cannot sign in, ensure your `public.profiles` row exists and `is_active = true`.
        </p>
      </div>
    </div>
  );
}

