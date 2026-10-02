'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui-states';
import { apiGet, apiPost, getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useI18n } from '@/components/i18n-provider';
import { MEMBER_ROLES, type Member } from '@/lib/types';

export default function MembersPage() {
  const qc = useQueryClient();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] =
    useState<(typeof MEMBER_ROLES)[number]>('project_manager');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['members'],
    queryFn: () => apiGet<Member[]>('/members'),
  });

  const inviteMutation = useMutation({
    mutationFn: (body: {
      email: string;
      name: string;
      role: string;
      password?: string;
    }) => apiPost<Member>('/members', body),
    onSuccess: async () => {
      setEmail('');
      setName('');
      setPassword('');
      setFormError(null);
      await qc.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body: {
      email: string;
      name: string;
      role: string;
      password?: string;
    } = {
      email: email.trim(),
      name: name.trim(),
      role,
    };
    if (password.trim()) body.password = password;
    inviteMutation.mutate(body);
  }

  return (
    <div>
      <PageHeader
        title={t('members')}
        subtitle="Invite users to the company workspace"
      />

      <form
        onSubmit={onSubmit}
        className="te-panel mb-6 grid gap-3 p-5 md:grid-cols-4"
      >
        <label className="block md:col-span-2">
          <span className="te-label">{t('email')}</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="te-input"
            placeholder="user@company.com"
          />
        </label>
        <label className="block">
          <span className="te-label">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="te-input"
            placeholder="Full name"
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
        <label className="block md:col-span-2">
          <span className="te-label">{t('password')} (optional)</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="te-input"
            placeholder="Defaults if omitted"
          />
        </label>
        <div className="flex items-end md:col-span-2">
          {formError ? (
            <p className="mb-2 w-full text-sm text-rose-400">{formError}</p>
          ) : null}
          <button
            type="submit"
            disabled={
              inviteMutation.isPending || !email.trim() || !name.trim()
            }
            className="te-btn-primary"
          >
            {inviteMutation.isPending ? 'Inviting…' : t('inviteMember')}
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
        <EmptyState message="No company members yet." />
      ) : null}

      {query.isSuccess && query.data.length > 0 ? (
        <div className="te-panel overflow-hidden">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">{t('email')}</th>
                <th className="px-4 py-3 font-medium">{t('role')}</th>
                <th className="px-4 py-3 font-medium">Joined</th>
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
