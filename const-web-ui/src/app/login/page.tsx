'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost, getErrorMessage } from '@/lib/api';
import {
  isAuthenticated,
  setCompanyId,
  setToken,
  setUser,
} from '@/lib/auth';
import type { LoginResult } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@target.local');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) router.replace('/dashboard');
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiPost<LoginResult>('/auth/login', {
        email,
        password,
      });
      setToken(result.access_token);
      setUser(result.user);
      const companyId =
        result.user.memberships[0]?.company_id ??
        process.env.NEXT_PUBLIC_COMPANY_ID ??
        '00000000-0000-4000-8000-000000000001';
      setCompanyId(companyId);
      router.replace('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(34,197,94,0.18),transparent_45%),radial-gradient(ellipse_at_85%_0%,rgba(22,163,74,0.12),transparent_40%),linear-gradient(165deg,#020617_0%,#0f172a_55%,#052e1a_100%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-[0_0_0_1px_rgba(34,197,94,0.35)]">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              <path d="M4 20V9l8-5 8 5v11" />
              <path d="M9 20v-6h6v6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-100">
            Target Enterprise
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Construction Platform{' '}
            <span className="font-mono text-slate-500">· v1.0</span>
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="te-label">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="te-input"
            />
          </label>
          <label className="block">
            <span className="te-label">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="te-input"
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="te-btn-primary w-full py-2.5"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
