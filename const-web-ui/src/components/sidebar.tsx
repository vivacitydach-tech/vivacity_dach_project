'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';
import { getCompanyId, getUser, logout, setCompanyId } from '@/lib/auth';
import { useI18n } from '@/components/i18n-provider';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const user = getUser();
  const { t, locale, setLocale } = useI18n();
  const [companyId, setCompanyIdState] = useState(() => getCompanyId());

  const memberships = user?.memberships ?? [];
  const showCompanySwitcher = memberships.length > 1;

  const projectId =
    typeof params?.id === 'string' && pathname.startsWith('/projects/')
      ? params.id
      : null;

  const globalNav = [
    { href: '/dashboard', label: t('dashboard') },
    { href: '/projects', label: t('projects') },
    { href: '/members', label: t('members') },
  ];

  const settingsNav = [
    { href: '/settings/unit-rates', label: t('unitRates') },
    { href: '/settings/company', label: t('company') },
  ];

  const projectNav = projectId
    ? [
        { href: `/projects/${projectId}`, label: t('overview'), exact: true },
        { href: `/projects/${projectId}/boq`, label: t('boq') },
        { href: `/projects/${projectId}/schedule`, label: t('schedule') },
        { href: `/projects/${projectId}/issues`, label: t('issues') },
        { href: `/projects/${projectId}/bcf`, label: t('bcf') },
        {
          href: `/projects/${projectId}/change-orders`,
          label: t('changeOrders'),
        },
        { href: `/projects/${projectId}/diaries`, label: t('diaries') },
        {
          href: `/projects/${projectId}/checklists`,
          label: t('checklistsField'),
        },
        { href: `/projects/${projectId}/documents`, label: t('documents') },
        { href: `/projects/${projectId}/evm`, label: t('evm') },
        { href: `/projects/${projectId}/members`, label: t('members') },
      ]
    : [];

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    if (href === '/projects') {
      return pathname === '/projects';
    }
    if (href === '/members') {
      return pathname === '/members';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function onLogout() {
    logout();
    router.replace('/login');
  }

  function onCompanyChange(nextId: string) {
    setCompanyId(nextId);
    setCompanyIdState(nextId);
    router.refresh();
    window.location.reload();
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950">
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <div>
          <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Workspace
          </p>
          <div className="space-y-1">
            {globalNav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'block rounded-lg px-3 py-2 text-sm transition',
                    active
                      ? 'bg-emerald-500/10 font-semibold text-emerald-400'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">
            {t('settings')}
          </p>
          <div className="space-y-1">
            {settingsNav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'block rounded-lg px-3 py-2 text-sm transition',
                    active
                      ? 'bg-emerald-500/10 font-semibold text-emerald-400'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {projectNav.length > 0 ? (
          <div>
            <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Project
            </p>
            <div className="space-y-1">
              {projectNav.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      'block rounded-lg px-3 py-2 text-sm transition',
                      active
                        ? 'bg-emerald-500/10 font-semibold text-emerald-400'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </nav>

      <div className="border-t border-slate-800/80 px-4 py-4">
        {showCompanySwitcher ? (
          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-slate-400">
              {t('companySwitcher')}
            </span>
            <select
              value={companyId}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="te-input py-1.5 text-xs"
            >
              {memberships.map((m) => (
                <option key={m.company_id} value={m.company_id}>
                  {m.company_name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="mb-2 block text-xs text-slate-400">{t('language')}</label>
        <div className="mb-3 flex gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1">
          {(['en', 'de'] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={clsx(
                'flex-1 rounded-md px-2 py-1.5 font-mono text-xs uppercase transition',
                locale === code
                  ? 'bg-emerald-500/15 font-semibold text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              {code}
            </button>
          ))}
        </div>

        <p className="truncate text-sm font-medium text-slate-200">
          {user?.name ?? 'Signed in'}
        </p>
        <p className="truncate font-mono text-xs text-slate-500">{user?.email}</p>
        <button type="button" onClick={onLogout} className="te-btn-secondary mt-3 w-full">
          {t('logout')}
        </button>
      </div>
    </aside>
  );
}
