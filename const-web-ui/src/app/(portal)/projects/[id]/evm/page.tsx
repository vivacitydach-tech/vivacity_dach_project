'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { ProjectNav } from '@/components/project-nav';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui-states';
import { useI18n } from '@/components/i18n-provider';
import { apiGet, apiPost, getErrorMessage } from '@/lib/api';
import { getCurrency } from '@/lib/auth';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import type { EvmAlert, EvmSnapshot } from '@/lib/types';

function IndexBar({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const n = value == null ? null : Number(value);
  const pct =
    n == null || !Number.isFinite(n) ? 0 : Math.min(120, Math.max(0, n * 100));
  const alert = n != null && n < 0.85;
  const color =
    n == null
      ? 'bg-slate-600'
      : alert
        ? 'bg-rose-500'
        : n < 1
          ? 'bg-amber-500'
          : 'bg-emerald-500';

  return (
    <div
      className={
        alert
          ? 'rounded-xl border border-rose-500/30 bg-rose-500/10 p-4'
          : 'rounded-xl border border-slate-800 bg-slate-950/50 p-4'
      }
    >
      <div className="mb-2 flex justify-between text-sm">
        <span
          className={`font-medium ${alert ? 'text-rose-300' : 'text-slate-300'}`}
        >
          {label}
        </span>
        <span
          className={`font-mono tabular-nums ${
            alert ? 'text-rose-300' : 'text-slate-100'
          }`}
        >
          {value == null ? '—' : formatNumber(value, 3)}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {alert ? (
        <p className="mt-2 text-xs text-rose-300/90">
          Below 0.85 threshold — review schedule/cost performance
        </p>
      ) : null}
    </div>
  );
}

function TrendBars({ snapshots }: { snapshots: EvmSnapshot[] }) {
  const recent = [...snapshots].slice(0, 8).reverse();
  if (recent.length === 0) return null;

  return (
    <div className="te-panel p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-300">
        SPI / CPI trend
      </h3>
      <div className="flex h-36 items-end gap-3">
        {recent.map((s) => {
          const spi = s.spi == null ? 0 : Number(s.spi);
          const cpi = s.cpi == null ? 0 : Number(s.cpi);
          const spiH = Math.min(100, Math.max(4, spi * 70));
          const cpiH = Math.min(100, Math.max(4, cpi * 70));
          return (
            <div
              key={s.id}
              className="flex flex-1 flex-col items-center justify-end gap-1"
            >
              <div className="flex h-28 w-full items-end justify-center gap-1">
                <div
                  className={`w-2.5 rounded-t ${
                    spi < 0.85 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ height: `${spiH}%` }}
                  title={`SPI ${s.spi ?? '—'}`}
                />
                <div
                  className={`w-2.5 rounded-t ${
                    cpi < 0.85 ? 'bg-rose-400' : 'bg-emerald-400/70'
                  }`}
                  style={{ height: `${cpiH}%` }}
                  title={`CPI ${s.cpi ?? '—'}`}
                />
              </div>
              <span className="font-mono text-[10px] text-slate-500">
                {formatDate(s.as_of_date).split(' ').slice(0, 2).join(' ')}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" /> SPI
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-400/70" />{' '}
          CPI
        </span>
      </div>
    </div>
  );
}

export default function EvmPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const currency = getCurrency();
  const qc = useQueryClient();
  const { t } = useI18n();
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['evm', id],
    queryFn: () => apiGet<EvmSnapshot[]>(`/projects/${id}/evm`),
  });

  const alertsQuery = useQuery({
    queryKey: ['evm-alerts', id],
    queryFn: () => apiGet<EvmAlert>(`/projects/${id}/evm/alerts`),
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiPost<EvmSnapshot>(`/projects/${id}/evm/refresh`),
    onSuccess: async () => {
      setRefreshError(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['evm', id] }),
        qc.invalidateQueries({ queryKey: ['evm-alerts', id] }),
      ]);
    },
    onError: (err) => setRefreshError(getErrorMessage(err)),
  });

  const latest = query.data?.[0];
  const spiAlert =
    alertsQuery.data?.alerts?.spi_alert ??
    alertsQuery.data?.spi_alert ??
    false;
  const cpiAlert =
    alertsQuery.data?.alerts?.cpi_alert ??
    alertsQuery.data?.cpi_alert ??
    false;
  const showAlertBanner = spiAlert || cpiAlert;

  return (
    <div>
      <PageHeader
        title={t('earnedValue')}
        subtitle="PV / EV / AC snapshots with SPI & CPI"
        actions={
          <button
            type="button"
            className="te-btn-primary"
            disabled={refreshMutation.isPending}
            onClick={() => refreshMutation.mutate()}
          >
            {refreshMutation.isPending ? 'Refreshing…' : t('refreshSnapshot')}
          </button>
        }
      />
      <ProjectNav projectId={id} />

      <p className="mb-4 text-sm text-slate-400">{t('evDerivedHint')}</p>

      {showAlertBanner ? (
        <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          Performance alert
          {spiAlert ? ' — SPI below threshold' : ''}
          {cpiAlert ? ' — CPI below threshold' : ''}. Review schedule and cost
          performance.
        </div>
      ) : null}

      {refreshError ? (
        <p className="mb-3 text-sm text-rose-400">{refreshError}</p>
      ) : null}

      {query.isLoading ? <LoadingState label="Loading EVM…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : null}
      {query.isSuccess && query.data.length === 0 ? (
        <EmptyState message="No EVM snapshots yet. Click Refresh snapshot." />
      ) : null}

      {query.isSuccess && latest ? (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <IndexBar label="SPI (latest)" value={latest.spi} />
          <IndexBar label="CPI (latest)" value={latest.cpi} />
        </div>
      ) : null}

      {query.isSuccess && query.data.length > 0 ? (
        <div className="mb-6">
          <TrendBars snapshots={query.data} />
        </div>
      ) : null}

      {query.isSuccess && query.data.length > 0 ? (
        <div className="te-panel overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">As of</th>
                <th className="px-4 py-3 font-medium text-right">PV</th>
                <th className="px-4 py-3 font-medium text-right">EV</th>
                <th className="px-4 py-3 font-medium text-right">AC</th>
                <th className="px-4 py-3 font-medium text-right">SPI</th>
                <th className="px-4 py-3 font-medium text-right">CPI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {query.data.map((s) => {
                const spiAlert = s.spi != null && Number(s.spi) < 0.85;
                const cpiAlert = s.cpi != null && Number(s.cpi) < 0.85;
                return (
                  <tr
                    key={s.id}
                    className={`hover:bg-slate-800/40 ${
                      spiAlert || cpiAlert ? 'bg-rose-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-200">
                      {formatDate(s.as_of_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      {formatMoney(s.pv, currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      {formatMoney(s.ev, currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      {formatMoney(s.ac, currency)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${
                        spiAlert ? 'font-semibold text-rose-400' : 'text-slate-100'
                      }`}
                    >
                      {s.spi == null ? '—' : formatNumber(s.spi, 3)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${
                        cpiAlert ? 'font-semibold text-rose-400' : 'text-slate-100'
                      }`}
                    >
                      {s.cpi == null ? '—' : formatNumber(s.cpi, 3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
