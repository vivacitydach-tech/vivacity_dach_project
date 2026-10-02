'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { ProjectNav } from '@/components/project-nav';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui-states';
import { useI18n } from '@/components/i18n-provider';
import { apiGet, apiPatch, apiPost, getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  CHANGE_ORDER_STATUSES,
  type BoqNode,
  type ChangeOrder,
} from '@/lib/types';

type FlatBoq = { id: string; code: string; name: string; depth: number };

function flattenBoq(nodes: BoqNode[], depth = 0): FlatBoq[] {
  const rows: FlatBoq[] = [];
  for (const n of nodes) {
    rows.push({ id: n.id, code: n.code, name: n.name, depth });
    if (n.children?.length) {
      rows.push(...flattenBoq(n.children, depth + 1));
    }
  }
  return rows;
}

export default function ChangeOrdersPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const { t } = useI18n();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deltaCost, setDeltaCost] = useState('');
  const [deltaDays, setDeltaDays] = useState('');
  const [issueId, setIssueId] = useState('');
  const [boqItemId, setBoqItemId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['change-orders', id],
    queryFn: () => apiGet<ChangeOrder[]>(`/projects/${id}/change-orders`),
  });

  const boqQuery = useQuery({
    queryKey: ['boq', id],
    queryFn: () => apiGet<BoqNode[]>(`/projects/${id}/boq`),
  });

  const boqOptions = useMemo(
    () => (boqQuery.data ? flattenBoq(boqQuery.data) : []),
    [boqQuery.data],
  );

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiPost<ChangeOrder>(`/projects/${id}/change-orders`, body),
    onSuccess: async () => {
      setTitle('');
      setDescription('');
      setDeltaCost('');
      setDeltaDays('');
      setIssueId('');
      setBoqItemId('');
      setFormError(null);
      await qc.invalidateQueries({ queryKey: ['change-orders', id] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const patchMutation = useMutation({
    mutationFn: ({
      changeOrderId,
      status,
    }: {
      changeOrderId: string;
      status: string;
    }) =>
      apiPatch<ChangeOrder>(`/projects/${id}/change-orders/${changeOrderId}`, {
        status,
      }),
    onSuccess: async () => {
      setRowError(null);
      await qc.invalidateQueries({ queryKey: ['change-orders', id] });
    },
    onError: (err) => setRowError(getErrorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      title: title.trim(),
    };
    if (description.trim()) body.description = description.trim();
    if (deltaCost !== '') body.delta_cost = Number(deltaCost);
    if (deltaDays !== '') body.delta_days = Number(deltaDays);
    if (issueId.trim()) body.issue_id = issueId.trim();
    if (boqItemId) body.boq_item_id = boqItemId;
    createMutation.mutate(body);
  }

  return (
    <div>
      <PageHeader
        title={t('changeOrders')}
        subtitle="Cost and schedule deltas linked to project scope"
      />
      <ProjectNav projectId={id} />

      <form
        onSubmit={onSubmit}
        className="te-panel mb-6 grid gap-3 p-5 md:grid-cols-4"
      >
        <label className="block md:col-span-2">
          <span className="te-label">{t('title')}</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="te-input"
            placeholder="Change order title"
          />
        </label>
        <label className="block">
          <span className="te-label">{t('deltaCost')}</span>
          <input
            type="number"
            step="any"
            value={deltaCost}
            onChange={(e) => setDeltaCost(e.target.value)}
            className="te-input font-mono"
          />
        </label>
        <label className="block">
          <span className="te-label">{t('deltaDays')}</span>
          <input
            type="number"
            step="any"
            value={deltaDays}
            onChange={(e) => setDeltaDays(e.target.value)}
            className="te-input font-mono"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="te-label">{t('description')}</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="te-input"
            placeholder="Optional details"
          />
        </label>
        <label className="block">
          <span className="te-label">{t('issueId')}</span>
          <input
            value={issueId}
            onChange={(e) => setIssueId(e.target.value)}
            className="te-input font-mono text-xs"
            placeholder="Optional UUID"
          />
        </label>
        <label className="block">
          <span className="te-label">{t('boqItem')}</span>
          <select
            value={boqItemId}
            onChange={(e) => setBoqItemId(e.target.value)}
            className="te-input"
          >
            <option value="">— None —</option>
            {boqOptions.map((row) => (
              <option key={row.id} value={row.id}>
                {'—'.repeat(row.depth)} {row.code} {row.name}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-4">
          {formError ? (
            <p className="mb-2 text-sm text-rose-400">{formError}</p>
          ) : null}
          <button
            type="submit"
            disabled={createMutation.isPending || !title.trim()}
            className="te-btn-primary"
          >
            {createMutation.isPending ? 'Creating…' : t('create')}
          </button>
        </div>
      </form>

      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : null}
      {query.isSuccess && query.data.length === 0 ? (
        <EmptyState message="No change orders yet." />
      ) : null}

      {rowError ? (
        <p className="mb-3 text-sm text-rose-400">{rowError}</p>
      ) : null}

      {query.isSuccess && query.data.length > 0 ? (
        <div className="te-panel overflow-hidden">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">{t('title')}</th>
                <th className="px-4 py-3 font-medium">{t('status')}</th>
                <th className="px-4 py-3 font-medium">{t('boqItem')}</th>
                <th className="px-4 py-3 font-medium text-right">Δ Cost</th>
                <th className="px-4 py-3 font-medium text-right">Δ Days</th>
                <th className="px-4 py-3 font-medium">{t('created')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {query.data.map((co) => (
                <tr key={co.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-100">{co.title}</p>
                    {co.description ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {co.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <StatusBadge label={co.status} />
                      <select
                        value={co.status}
                        disabled={patchMutation.isPending}
                        onChange={(e) =>
                          patchMutation.mutate({
                            changeOrderId: co.id,
                            status: e.target.value,
                          })
                        }
                        className="te-input py-1.5 capitalize"
                        aria-label={t('status')}
                      >
                        {CHANGE_ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {co.boq_item_id ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">
                    {co.delta_cost}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">
                    {co.delta_days}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(co.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
