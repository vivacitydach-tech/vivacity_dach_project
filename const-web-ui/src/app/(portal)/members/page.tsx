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
  const [trade, setTrade] = useState('General Construction');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [formError, setFormError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

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
      setShowInviteModal(false);
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

  const members = query.data || [];
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <PageHeader
          title={t('members')}
          subtitle="Manage workspace users, subcontractor teams, and role-based permissions"
        />
        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="te-btn-primary flex items-center gap-2 self-start"
        >
          <span>➕</span>
          <span>{t('inviteMember')}</span>
        </button>
      </div>

      {/* Stats KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="te-panel p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Total Members</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{members.length}</p>
        </div>
        <div className="te-panel p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Project Managers</p>
          <p className="text-2xl font-bold text-sky-400 mt-1">
            {members.filter((m) => m.role === 'project_manager').length}
          </p>
        </div>
        <div className="te-panel p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Engineers & QS</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {members.filter((m) => m.role === 'site_engineer' || m.role === 'quantity_surveyor').length}
          </p>
        </div>
        <div className="te-panel p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Subcontractors</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {members.filter((m) => m.role === 'subcontractor' || m.role === 'viewer').length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="te-panel mb-6 p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="🔍 Search members by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="te-input text-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="te-input text-sm py-1.5"
          >
            <option value="all">All Roles</option>
            {MEMBER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="te-panel w-full max-w-lg p-6 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">Invite New Team Member / Subcontractor</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <label className="te-label">{t('email')}</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="te-input"
                  placeholder="contractor@partner.com"
                />
              </div>

              <div>
                <label className="te-label">Full Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="te-input"
                  placeholder="e.g. John Doe / ElectroTech Ltd"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="te-label">{t('role')}</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as (typeof MEMBER_ROLES)[number])}
                    className="te-input"
                  >
                    {MEMBER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="te-label">Trade / Specialty</label>
                  <select
                    value={trade}
                    onChange={(e) => setTrade(e.target.value)}
                    className="te-input"
                  >
                    <option value="General Construction">General Construction</option>
                    <option value="Structural & Concrete">Structural & Concrete</option>
                    <option value="MEP & HVAC">MEP & HVAC</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Facade & Glazing">Facade & Glazing</option>
                    <option value="Interior Fitout">Interior Fitout</option>
                    <option value="Architect / Consultant">Architect / Consultant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="te-label">{t('password')} (optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="te-input"
                  placeholder="Leave empty for auto-generated invite link"
                />
              </div>

              {formError && (
                <div className="rounded bg-rose-500/10 p-3 text-sm text-rose-400 border border-rose-500/20">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="te-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending || !email.trim() || !name.trim()}
                  className="te-btn-primary"
                >
                  {inviteMutation.isPending ? 'Sending Invite...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : null}
      {query.isSuccess && members.length === 0 ? (
        <EmptyState message="No company members yet. Click 'Invite Member' to add your team." />
      ) : null}

      {query.isSuccess && members.length > 0 && (
        <div className="te-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Member</th>
                  <th className="px-5 py-3.5 font-semibold">{t('email')}</th>
                  <th className="px-5 py-3.5 font-semibold">{t('role')}</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-bold text-white shadow">
                          {getInitials(m.name || m.email)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-100">{m.name}</p>
                          <p className="text-xs text-slate-400">ID: {m.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-300">
                      {m.email}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge label={m.role} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {formatDate(m.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

