'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui-states';
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  getErrorMessage,
} from '@/lib/api';
import { getCurrency, setCountry, setCurrency } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import type { CurrencyCode, Project } from '@/lib/types';

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [currency, setCurrencyLocal] = useState<CurrencyCode>(getCurrency());
  const [country, setCountryLocal] = useState('DE');
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiGet<Project[]>('/projects'),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string }) =>
      apiPost<Project>('/projects', payload),
    onSuccess: async () => {
      setName('');
      setFormError(null);
      await qc.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const archiveMutation = useMutation({
    mutationFn: (projectId: string) =>
      apiPatch<Project>(`/projects/${projectId}`, { status: 'archived' }),
    onSuccess: async () => {
      setActionError(null);
      await qc.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (projectId: string) =>
      apiDelete<{ ok: boolean }>(`/projects/${projectId}`),
    onSuccess: async () => {
      setActionError(null);
      await qc.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setCurrency(currency);
    setCountry(country);
    createMutation.mutate({ name: name.trim() });
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Create and open company projects"
      />

      <form onSubmit={onSubmit} className="te-panel mb-8 grid gap-3 p-5 md:grid-cols-4">
        <label className="block md:col-span-2">
          <span className="te-label">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="te-input"
            placeholder="Project name"
          />
        </label>
        <label className="block">
          <span className="te-label">Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrencyLocal(e.target.value as CurrencyCode)}
            className="te-input"
          >
            <option value="EUR">EUR</option>
            <option value="PKR">PKR</option>
          </select>
        </label>
        <label className="block">
          <span className="te-label">Country</span>
          <select
            value={country}
            onChange={(e) => setCountryLocal(e.target.value)}
            className="te-input"
          >
            <option value="DE">Germany (DE)</option>
            <option value="PK">Pakistan (PK)</option>
            <option value="AE">UAE (AE)</option>
            <option value="US">USA (US)</option>
          </select>
        </label>
        <div className="md:col-span-4">
          <p className="mb-2 text-xs text-slate-500">
            Currency/country are stored for display formatting. Project create
            API currently accepts name only.
          </p>
          {formError ? (
            <p className="mb-2 text-sm text-rose-400">{formError}</p>
          ) : null}
          <button
            type="submit"
            disabled={createMutation.isPending || !name.trim()}
            className="te-btn-primary"
          >
            {createMutation.isPending ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>

      {projectsQuery.isLoading ? <LoadingState /> : null}
      {projectsQuery.isError ? (
        <ErrorState
          message={getErrorMessage(projectsQuery.error)}
          onRetry={() => projectsQuery.refetch()}
        />
      ) : null}

      {actionError ? (
        <p className="mb-3 text-sm text-rose-400">{actionError}</p>
      ) : null}

      {projectsQuery.isSuccess && projectsQuery.data.length === 0 ? (
        <EmptyState message="No projects yet. Create one above." />
      ) : null}

      {projectsQuery.isSuccess && projectsQuery.data.length > 0 ? (
        <div className="te-panel overflow-hidden">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Currency</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {projectsQuery.data.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium text-emerald-400 hover:text-emerald-300"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {p.code ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label={p.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {currency}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {p.status !== 'archived' ? (
                        <button
                          type="button"
                          className="te-btn-secondary px-2 py-1 text-xs"
                          disabled={archiveMutation.isPending}
                          onClick={() => archiveMutation.mutate(p.id)}
                        >
                          Archive
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/20"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete project "${p.name}"? This cannot be undone.`,
                            )
                          ) {
                            deleteMutation.mutate(p.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
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
