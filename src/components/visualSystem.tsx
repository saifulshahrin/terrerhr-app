import type { ReactNode } from 'react';

type Tone = 'slate' | 'blue' | 'teal' | 'emerald' | 'amber' | 'red' | 'violet';

const toneClasses: Record<Tone, string> = {
  slate: 'bg-slate-50 text-slate-700 ring-slate-200/70',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200/60',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200/60',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200/60',
  red: 'bg-red-50 text-red-700 ring-red-200/60',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200/60',
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-slate-200/70 pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="truncate text-[1.45rem] font-semibold leading-tight tracking-tight text-slate-950">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  meta,
  icon,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <span className="mt-0.5 text-slate-500">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p> : null}
        </div>
      </div>
      {meta ? <div className="shrink-0">{meta}</div> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = 'slate',
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ring-1 ring-inset ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Panel({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200/70 bg-white/85 shadow-[0_1px_2px_rgba(15,23,42,0.05)] ${
        padded ? 'p-4' : ''
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function MetricTile({
  label,
  value,
  detail,
  icon,
  tone = 'slate',
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/70 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
        {icon ? <span className={`rounded-lg p-1.5 ring-1 ${toneClasses[tone]}`}>{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-0.5 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}
