'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useI18n } from '@/components/i18n-provider';

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const base = `/projects/${projectId}`;

  const links = [
    { suffix: '', label: t('overview') },
    { suffix: '/boq', label: t('boq') },
    { suffix: '/schedule', label: t('schedule') },
    { suffix: '/issues', label: t('issues') },
    { suffix: '/bcf', label: t('bcf') },
    { suffix: '/change-orders', label: t('changeOrders') },
    { suffix: '/diaries', label: t('diaries') },
    { suffix: '/checklists', label: t('checklistsField') },
    { suffix: '/documents', label: t('documents') },
    { suffix: '/evm', label: t('evm') },
    { suffix: '/members', label: t('members') },
    { suffix: '/chat', label: '💬 Site Chat' },
  ] as const;

  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
      {links.map((link) => {
        const href = `${base}${link.suffix}`;
        const active =
          link.suffix === ''
            ? pathname === base
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition',
              active
                ? 'bg-emerald-500/10 font-semibold text-emerald-400'
                : 'border border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:text-slate-100',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
