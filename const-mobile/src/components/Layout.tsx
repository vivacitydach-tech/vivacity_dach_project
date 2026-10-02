import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getSelectedProjectId, getUser, isAuthenticated, logout } from '../lib/auth'
import { db } from '../lib/db'
import { flushQueue, isOnline, pendingCount, startSyncListeners } from '../lib/sync'

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const [online, setOnline] = useState(isOnline())
  const [pending, setPending] = useState(0)
  const user = getUser()

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
    }
  }, [navigate, location.pathname])

  useEffect(() => {
    const refresh = async () => {
      setOnline(isOnline())
      setPending(await pendingCount())
    }
    const stop = startSyncListeners(() => {
      void refresh()
    })
    const onOnline = () => {
      setOnline(true)
      void flushQueue().then(refresh)
    }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    void refresh()
    return () => {
      stop()
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  function onLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-24 pt-4">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Target Enterprise
          </p>
          <h1 className="text-2xl font-bold text-emerald-950">Field</h1>
          {user ? (
            <p className="text-sm text-slate-600">{user.name}</p>
          ) : null}
        </div>
        <button type="button" className="te-btn te-btn-secondary text-sm" onClick={onLogout}>
          Log out
        </button>
      </header>

      {!online ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Offline — diary, snags, photos, and checklists are queued locally.
        </div>
      ) : null}

      {pending > 0 ? (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span>
            {pending} pending sync item{pending === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => void flushQueue().then(() => pendingCount().then(setPending))}
          >
            Sync now
          </button>
        </div>
      ) : null}

      <Outlet />
    </div>
  )
}

export function ProjectNav() {
  const { projectId } = useParams()
  const location = useLocation()
  const selected = projectId || getSelectedProjectId()
  if (!selected) return null

  const items = [
    { to: `/projects/${selected}`, label: 'Home', end: true },
    { to: `/projects/${selected}/diary`, label: 'Diary' },
    { to: `/projects/${selected}/snags`, label: 'Snags' },
    { to: `/projects/${selected}/camera`, label: 'Camera' },
    { to: `/projects/${selected}/checklists`, label: 'Lists' },
    { to: `/projects/${selected}/queue`, label: 'Queue' },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-emerald-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg justify-between px-2 py-2">
        {items.map((item) => {
          const active = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-lg px-2 py-2 text-xs font-semibold ${
                active ? 'bg-emerald-600 text-white' : 'text-emerald-800'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function useLivePending() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const refresh = () => {
      void pendingCount().then(setCount)
    }
    refresh()
    const interval = window.setInterval(refresh, 3000)
    return () => window.clearInterval(interval)
  }, [])
  return count
}

export function useProjectName(projectId: string | undefined) {
  const [name, setName] = useState('')
  useEffect(() => {
    if (!projectId) return
    void db.projects.get(projectId).then((p) => setName(p?.name ?? 'Project'))
  }, [projectId])
  return name
}
