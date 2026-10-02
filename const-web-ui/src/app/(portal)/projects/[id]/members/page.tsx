'use client';

import { useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { ProjectNav } from '@/components/project-nav';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui-states';
import { apiGet, apiPost, getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useI18n } from '@/components/i18n-provider';
import { MEMBER_ROLES, type Member } from '@/lib/types';

export default function ProjectMembersPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [role, setRole] =
    useState<(typeof MEMBER_ROLES)[number]>('site_manager');
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['project-members', id],
    queryFn: () => apiGet<Member[]>(`/projects/${id}/members`),
  });

  const addMutation = useMutation({
    mutationFn: (body: { email: string; role: string }) =>
      apiPost<Member>(`/projects/${id}/members`, body),
    onSuccess: async () => {
      setEmail('');
      setFormError(null);
      await qc.invalidateQueries({ queryKey: ['project-members', id] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    addMutation.mutate({ email: email.trim(), role });
  }

  return (
    <div>
      <PageHeader
        title={t('projectMembers')}
        subtitle="Add company users to this project"
      />
      <ProjectNav projectId={id} />

      <form
        onSubmit={onSubmit}
        className="te-panel mb-6 grid gap-3 p-5 md:grid-cols-3"
      >
        <label className="block md:col-span-2">
          <span className="te-label">{t('email')}</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="te-input"
            placeholder="Must already be a company member"
          />
        </label>
        <label className="block">
          <span className="te-label">{t('role')}</span>
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as (typeof MEMBER_ROLES)[number])
            }
            className="te-input"
          >
            {MEMBER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-3">
          {formError ? (
            <p className="mb-2 text-sm text-rose-400">{formError}</p>
          ) : null}
          <button
            type="submit"
            disabled={addMutation.isPending || !email.trim()}
            className="te-btn-primary"
          >
            {addMutation.isPending ? 'Adding…' : 'Add to project'}
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
        <EmptyState message="No project members yet." />
      ) : null}

      {query.isSuccess && query.data.length > 0 ? (
        <div className="te-panel overflow-hidden">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">{t('email')}</th>
                <th className="px-4 py-3 font-medium">{t('role')}</th>
                <th className="px-4 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {query.data.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-100">
                    {m.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {m.email}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label={m.role} />
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(m.created_at)}
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
