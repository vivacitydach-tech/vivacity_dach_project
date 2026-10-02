'use client';

import Link from 'next/link';
import { useQueries, useQuery } from '@tanstack/react-query';
import { PageHeader, KpiCard } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { ErrorState, LoadingState } from '@/components/ui-states';
import { useI18n } from '@/components/i18n-provider';
import { apiGet, getErrorMessage } from '@/lib/api';
import { getCurrency } from '@/lib/auth';
import { formatNumber } from '@/lib/format';
import type { BoqNode, EvmSnapshot, Project } from '@/lib/types';

function buildModuleMap(firstProjectId: string | null) {
  const p = firstProjectId ? `/projects/${firstProjectId}` : '/projects';
  return [
    {
      title: 'Estimating & BOQ',
      desc: 'Hierarchical bill of quantities with high-precision decimal calculations, unit rate libraries, and change orders.',
      href: firstProjectId ? `${p}/boq` : '/projects',
      hint: 'Also: /settings/unit-rates',
    },
    {
      title: 'EVM & Cost Control',
      desc: 'Automated Planned Value (PV), Earned Value (EV), Actual Cost (AC), and real-time SPI/CPI trend metrics.',
      href: firstProjectId ? `${p}/evm` : '/projects',
    },
    {
      title: 'Project Management & Gantt',
      desc: 'Interactive Gantt schedules, baseline tracking, activity dependencies, and progress reporting.',
      href: firstProjectId ? `${p}/schedule` : '/projects',
    },
    {
      title: 'Issues & BIM/BCF',
      desc: 'Defects, RFIs, change requests, and snags integrated with OpenProject BIM and Open BIM BCF standards.',
      href: firstProjectId ? `${p}/bcf` : '/projects',
    },
    {
      title: 'Field Operations & PWA',
      desc: 'Site diaries, geolocated photo uploads, checklists, digital signatures, and offline synchronization queues.',
      href: firstProjectId ? `${p}/diaries` : '/projects',
    },
    {
      title: 'Tenancy & Localization',
      desc: 'Strict multi-company tenant isolation, English/German (DE/EN) language packs, and EUR/PKR currency formats.',
      href: '/settings/company',
    },
  ] as const;
}

function countBoqLeaves(nodes: BoqNode[]): number {
  let n = 0;
  for (const node of nodes) {
    if (!node.children?.length) n += 1;
    else n += countBoqLeaves(node.children);
  }
  return n;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const currency = getCurrency();

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiGet<Project[]>('/projects'),
  });

  const projects = projectsQuery.data ?? [];
  const firstProjectId = projects[0]?.id ?? null;
  const moduleMap = buildModuleMap(firstProjectId);

  const evmQueries = useQueries({
    queries: projects.slice(0, 5).map((p) => ({
      queryKey: ['evm', p.id],
      queryFn: () => apiGet<EvmSnapshot[]>(`/projects/${p.id}/evm`),
      enabled: projectsQuery.isSuccess,
    })),
  });

  const boqQueries = useQueries({
    queries: projects.slice(0, 5).map((p) => ({
      queryKey: ['boq', p.id],
      queryFn: () => apiGet<BoqNode[]>(`/projects/${p.id}/boq`),
      enabled: projectsQuery.isSuccess,
    })),
  });

  const latest = evmQueries
    .flatMap((q) => q.data ?? [])
    .sort(
      (a, b) =>
        new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime(),
    )[0];

  const evmLoading = evmQueries.some((q) => q.isLoading);
  const evmError = evmQueries.find((q) => q.isError)?.error;

  const boqPending = boqQueries.reduce((sum, q) => {
    if (!q.data) return sum;
    return sum + countBoqLeaves(q.data);
  }, 0);
  const boqLoading = boqQueries.some((q) => q.isLoading);

  const spiAlert = latest?.spi != null && Number(latest.spi) < 0.85;
  const cpiAlert = latest?.cpi != null && Number(latest.cpi) < 0.85;

  return (
    <div>
      <PageHeader
        title={t('portfolioControl')}
        subtitle={t('portfolioSubtitle')}
      />

      {projectsQuery.isLoading ? <LoadingState label="Loading projects…" /> : null}
      {projectsQuery.isError ? (
        <ErrorState
          message={getErrorMessage(projectsQuery.error)}
          onRetry={() => projectsQuery.refetch()}
        />
      ) : null}

      {projectsQuery.isSuccess ? (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Projects"
              value={String(projects.length)}
              hint="Active company portfolio"
            />
            <KpiCard
              label="Latest SPI"
              value={
                evmLoading
                  ? '…'
                  : latest?.spi != null
                    ? formatNumber(latest.spi, 3)
                    : '—'
              }
              hint={
                latest
                  ? `As of ${new Date(latest.as_of_date).toLocaleDateString()}`
                  : 'No EVM snapshots yet'
              }
              alert={spiAlert}
            />
            <KpiCard
              label="Latest CPI"
              value={
                evmLoading
                  ? '…'
                  : latest?.cpi != null
                    ? formatNumber(latest.cpi, 3)
                    : '—'
              }
              hint={
                evmError
                  ? getErrorMessage(evmError)
                  : 'Schedule & cost performance'
              }
              alert={cpiAlert}
            />
            <KpiCard
              label="BOQ items"
              value={boqLoading ? '…' : String(boqPending)}
              hint="Leaf lines across sampled projects"
            />
          </div>

          <section className="mb-8">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Projects
              </h2>
              <Link
                href="/projects"
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                View all →
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="te-panel px-4 py-8 text-center text-slate-400">
                No projects yet. Create one from Projects.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {projects.slice(0, 6).map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="te-panel group block p-4 transition hover:border-emerald-500/30 hover:bg-slate-900/80"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-100 group-hover:text-emerald-300">
                        {p.name}
                      </p>
                      <StatusBadge label={p.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono">{p.code ?? p.id.slice(0, 8)}</span>
                      <span className="font-mono text-slate-400">{currency}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Module map
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {moduleMap.map((m) => (
                <Link
                  key={m.title}
                  href={m.href}
                  className="te-panel block p-4 transition hover:border-slate-700"
                >
                  <p className="font-medium text-slate-100">{m.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{m.desc}</p>
                  {'hint' in m && m.hint ? (
                    <p className="mt-2 font-mono text-[11px] text-emerald-500/80">
                      {m.hint}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
