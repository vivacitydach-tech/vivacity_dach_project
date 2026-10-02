'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { ErrorState, LoadingState } from '@/components/ui-states';
import { apiGet, getErrorMessage } from '@/lib/api';
import { getCurrency } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import type { Project } from '@/lib/types';

const MODULES = [
  {
    path: 'boq',
    title: 'BOQ',
    desc: 'Hierarchical bill of quantities with rates and totals',
  },
  {
    path: 'schedule',
    title: 'Schedule / Gantt',
    desc: 'Activity timeline with percent-complete bars',
  },
  {
    path: 'issues',
    title: 'Issues',
    desc: 'Defects, RFIs, observations, and change requests',
  },
  {
    path: 'bcf',
    title: 'BCF',
    desc: 'OpenBIM BCF topics linked to defect and snag issues',
  },
  {
    path: 'change-orders',
    title: 'Change orders',
    desc: 'Scope deltas for cost and schedule',
  },
  {
    path: 'diaries',
    title: 'Diaries',
    desc: 'Site diary entries with weather and optional GPS',
  },
  {
    path: 'checklists',
    title: 'Checklists (Field)',
    desc: 'Field templates, item toggles, and signature completion',
  },
  {
    path: 'documents',
    title: 'Documents',
    desc: 'Field drawings, photos, and contract uploads',
  },
  {
    path: 'evm',
    title: 'EVM',
    desc: 'Earned value snapshots — PV, EV, AC, SPI, CPI',
  },
  {
    path: 'members',
    title: 'Members',
    desc: 'Project team roles and access',
  },
] as const;

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const currency = getCurrency();

  const query = useQuery({
    queryKey: ['project', id],
    queryFn: () => apiGet<Project>(`/projects/${id}`),
  });

  if (query.isLoading) return <LoadingState label="Loading project…" />;
  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error)}
        onRetry={() => query.refetch()}
      />
    );
  }

  const project = query.data!;

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={`Code ${project.code ?? '—'} · Updated ${formatDate(project.updated_at)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={project.status} />
            <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-0.5 font-mono text-xs text-slate-300">
              {currency}
            </span>
          </div>
        }
      />

      <div className="mb-6 te-panel p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="mt-1 capitalize text-slate-100">
              {project.status.replaceAll('_', ' ')}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Created</dt>
            <dd className="mt-1 text-slate-100">{formatDate(project.created_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Project ID</dt>
            <dd className="mt-1 truncate font-mono text-xs text-slate-300">
              {project.id}
            </dd>
          </div>
        </dl>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
        Modules
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <Link
            key={m.path}
            href={`/projects/${id}/${m.path}`}
            className="te-panel group block p-5 transition hover:border-emerald-500/30 hover:bg-slate-900/80"
          >
            <p className="text-lg font-semibold text-slate-100 group-hover:text-emerald-400">
              {m.title}
            </p>
            <p className="mt-2 text-sm text-slate-400">{m.desc}</p>
            <p className="mt-4 text-sm font-medium text-emerald-400">Open →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
