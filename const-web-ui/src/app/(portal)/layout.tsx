'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { TopHeader } from '@/components/top-header';
import { isAuthenticated } from '@/lib/auth';
import { useI18n } from '@/components/i18n-provider';

export default function PortalLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <span className="mr-3 inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        {t('checkingSession')}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <TopHeader />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
