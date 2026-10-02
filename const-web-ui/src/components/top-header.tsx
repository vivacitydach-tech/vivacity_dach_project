'use client';

import Link from 'next/link';
import { useI18n } from '@/components/i18n-provider';

function BuildingMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-[0_0_0_1px_rgba(34,197,94,0.35)]">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
      >
        <path d="M4 20V9l8-5 8 5v11" />
        <path d="M9 20v-6h6v6" />
        <path d="M9 10h.01M15 10h.01M12 10h.01" />
      </svg>
    </div>
  );
}

export function TopHeader() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <BuildingMark />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-wide text-slate-100">
              {t('brand')}
            </p>
            <p className="truncate text-xs text-slate-400">
              {t('portal')}{' '}
              <span className="font-mono text-slate-500">· {t('platformVersion')}</span>
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-md border border-slate-800 bg-slate-900/80 px-2 py-1 font-mono text-[11px] text-slate-400 sm:inline">
            TE · CONSTRUCTION
          </span>
          <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-[11px] text-emerald-400">
            {t('platformVersion')}
          </span>
        </div>
      </div>
    </header>
  );
}
