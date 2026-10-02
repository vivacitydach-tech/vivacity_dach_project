'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(isAuthenticated() ? '/dashboard' : '/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
      <span className="mr-3 inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      Redirecting…
    </div>
  );
}
