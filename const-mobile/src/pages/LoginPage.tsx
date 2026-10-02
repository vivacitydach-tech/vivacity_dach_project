import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest, getErrorMessage } from '../lib/api'
import { isAuthenticated, setToken, setUser } from '../lib/auth'
import type { LoginResult } from '../lib/types'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('site@target.local')
  const [password, setPassword] = useState('Password123!')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) navigate('/projects', { replace: true })
  }, [navigate])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await apiRequest<LoginResult>('/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: { email, password },
      })
      setToken(result.access_token)
      setUser(result.user)
      navigate('/projects', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-8">
      <div className="te-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Target Enterprise
        </p>
        <h1 className="mt-1 text-3xl font-bold text-emerald-950">Field</h1>
        <p className="mt-2 text-sm text-slate-600">
          Offline-first site diary, snag reporting, and photo capture.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-emerald-900">Email</label>
            <input
              className="te-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-emerald-900">Password</label>
            <input
              className="te-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
          <button className="te-btn te-btn-primary w-full" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          Seed: site@target.local / Password123!
        </p>
      </div>
    </div>
  )
}
