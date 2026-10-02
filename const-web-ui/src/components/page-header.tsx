import type { ReactNode } from 'react';

export function KpiCard({
  label,
  value,
  hint,
  alert,
}: {
  label: string;
  value: string;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`te-panel p-5 ${
        alert ? 'border-rose-500/40 ring-1 ring-rose-500/20' : ''
      }`}
    >
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p
        className={`mt-2 font-mono text-3xl font-semibold tracking-tight ${
          alert ? 'text-rose-400' : 'text-slate-100'
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
