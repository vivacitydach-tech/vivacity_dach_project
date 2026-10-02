'use client';

import { useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { ProjectNav } from '@/components/project-nav';
import { PriorityBadge } from '@/components/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui-states';
import { apiGet, apiPatch, apiPost, getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  type Issue,
} from '@/lib/types';

export default function IssuesPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();

  const [type, setType] = useState<(typeof ISSUE_TYPES)[number]>('defect');
  const [title, setTitle] = useState('');
  const [priority, setPriority] =
    useState<(typeof ISSUE_PRIORITIES)[number]>('medium');
  const [costImpact, setCostImpact] = useState('');
  const [timeImpactDays, setTimeImpactDays] = useState('');
  const [bcfGuid, setBcfGuid] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['issues', id],
    queryFn: () => apiGet<Issue[]>(`/projects/${id}/issues`),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiPost<Issue>(`/projects/${id}/issues`, body),
    onSuccess: async () => {
      setTitle('');
      setCostImpact('');
      setTimeImpactDays('');
      setBcfGuid('');
      setFormError(null);
      await qc.invalidateQueries({ queryKey: ['issues', id] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const patchMutation = useMutation({
    mutationFn: ({
      issueId,
      body,
    }: {
      issueId: string;
      body: Record<string, unknown>;
    }) => apiPatch<Issue>(`/projects/${id}/issues/${issueId}`, body),
    onSuccess: async () => {
      setRowError(null);
      await qc.invalidateQueries({ queryKey: ['issues', id] });
    },
    onError: (err) => setRowError(getErrorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      type,
      title: title.trim(),
      priority,
    };
    if (costImpact !== '') body.cost_impact = Number(costImpact);
    if (timeImpactDays !== '') body.time_impact_days = Number(timeImpactDays);
    if (bcfGuid.trim()) body.bcf_guid = bcfGuid.trim();
    createMutation.mutate(body);
  }

  return (
    <div>
      <PageHeader title="Issues" subtitle="Defects, RFIs, and site observations" />
      <ProjectNav projectId={id} />

      <form
        onSubmit={onSubmit}
        className="te-panel mb-6 grid gap-3 p-5 md:grid-cols-4"
      >
        <label className="block">
          <span className="te-label">Type</span>
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as (typeof ISSUE_TYPES)[number])
            }
            className="te-input"
          >
            {ISSUE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="te-label">Title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="te-input"
            placeholder="Issue title"
          />
        </label>
        <label className="block">
          <span className="te-label">Priority</span>
          <select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as (typeof ISSUE_PRIORITIES)[number])
            }
            className="te-input"
          >
            {ISSUE_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="te-label">Cost impact</span>
          <input
            type="number"
            step="any"
            value={costImpact}
            onChange={(e) => setCostImpact(e.target.value)}
            className="te-input font-mono"
          />
        </label>
        <label className="block">
          <span className="te-label">Time impact (days)</span>
          <input
            type="number"
            step="any"
            value={timeImpactDays}
            onChange={(e) => setTimeImpactDays(e.target.value)}
            className="te-input font-mono"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="te-label">BCF GUID</span>
          <input
            value={bcfGuid}
            onChange={(e) => setBcfGuid(e.target.value)}
            className="te-input font-mono text-xs"
            placeholder="Optional BCF topic GUID"
          />
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
            {createMutation.isPending ? 'Creating…' : 'Create issue'}
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
        <EmptyState message="No issues yet." />
      ) : null}

      {rowError ? (
        <p className="mb-3 text-sm text-rose-400">{rowError}</p>
      ) : null}

      {query.isSuccess && query.data.length > 0 ? (
        <div className="te-panel overflow-hidden">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Cost impact</th>
                <th className="px-4 py-3 font-medium">Time impact</th>
                <th className="px-4 py-3 font-medium">BCF</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {query.data.map((issue) => (
                <tr key={issue.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <span className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-0.5 font-mono text-xs capitalize text-slate-300">
                      {issue.type.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-100">
                    {issue.title}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <PriorityBadge priority={issue.priority} />
                      <select
                        value={issue.priority}
                        disabled={patchMutation.isPending}
                        onChange={(e) =>
                          patchMutation.mutate({
                            issueId: issue.id,
                            body: { priority: e.target.value },
                          })
                        }
                        className="te-input py-1 text-xs"
                        aria-label="Priority"
                      >
                        {ISSUE_PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={issue.status}
                      disabled={patchMutation.isPending}
                      onChange={(e) =>
                        patchMutation.mutate({
                          issueId: issue.id,
                          body: { status: e.target.value },
                        })
                      }
                      className="te-input py-1.5 capitalize"
                      aria-label="Status"
                    >
                      {ISSUE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="any"
                      defaultValue={issue.cost_impact ?? ''}
                      disabled={patchMutation.isPending}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v === (issue.cost_impact ?? '')) return;
                        patchMutation.mutate({
                          issueId: issue.id,
                          body: {
                            cost_impact: v === '' ? null : Number(v),
                          },
                        });
                      }}
                      className="te-input w-24 py-1 font-mono text-xs"
                      aria-label="Cost impact"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="any"
                      defaultValue={issue.time_impact_days ?? ''}
                      disabled={patchMutation.isPending}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v === (issue.time_impact_days ?? '')) return;
                        patchMutation.mutate({
                          issueId: issue.id,
                          body: {
                            time_impact_days: v === '' ? null : Number(v),
                          },
                        });
                      }}
                      className="te-input w-20 py-1 font-mono text-xs"
                      aria-label="Time impact days"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      defaultValue={issue.bcf_guid ?? ''}
                      disabled={patchMutation.isPending}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v === (issue.bcf_guid ?? '')) return;
                        patchMutation.mutate({
                          issueId: issue.id,
                          body: { bcf_guid: v || null },
                        });
                      }}
                      className="te-input w-28 py-1 font-mono text-[10px]"
                      aria-label="BCF GUID"
                      placeholder="—"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(issue.created_at)}
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
