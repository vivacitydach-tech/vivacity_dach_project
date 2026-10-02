import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProjectNav, useProjectName } from '../components/Layout'
import { db } from '../lib/db'
import { flushQueue } from '../lib/sync'
import type { PendingOp } from '../lib/types'

export function QueuePage() {
  const { projectId = '' } = useParams()
  const name = useProjectName(projectId)
  const [ops, setOps] = useState<PendingOp[]>([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function refresh() {
    const rows = await db.pendingOps.orderBy('createdAt').reverse().toArray()
    setOps(rows)
  }

  useEffect(() => {
    void refresh()
    const t = window.setInterval(() => void refresh(), 2500)
    return () => window.clearInterval(t)
  }, [])

  async function syncNow() {
    setBusy(true)
    setResult(null)
    try {
      const r = await flushQueue()
      setResult(`Synced ${r.synced}, failed ${r.failed}`)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link to={`/projects/${projectId}`} className="text-sm font-medium text-emerald-700">
          ← {name}
        </Link>
        <h2 className="mt-2 text-xl font-bold text-emerald-950">Offline queue</h2>
        <p className="text-sm text-slate-600">
          Pending ops stored in Dexie with UUID idempotency keys. Replays use the same{' '}
          <code>Idempotency-Key</code>.
        </p>
      </div>

      <button
        type="button"
        className="te-btn te-btn-primary w-full"
        disabled={busy}
        onClick={() => void syncNow()}
      >
        {busy ? 'Syncing…' : 'Sync now'}
      </button>
      {result ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{result}</p>
      ) : null}

      <div className="space-y-3">
        {ops.map((op) => (
          <article key={op.id} className="te-card p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold capitalize text-emerald-950">{op.type}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  op.status === 'synced'
                    ? 'bg-emerald-100 text-emerald-800'
                    : op.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-800'
                }`}
              >
                {op.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {new Date(op.createdAt).toLocaleString()}
            </p>
            <p className="mt-2 break-all font-mono text-[11px] text-slate-600">
              key: {op.idempotencyKey}
            </p>
            {op.lastError ? (
              <p className="mt-2 text-xs text-red-600">{op.lastError}</p>
            ) : null}
            {op.serverId ? (
              <p className="mt-1 text-xs text-slate-500">server: {op.serverId}</p>
            ) : null}
          </article>
        ))}
        {ops.length === 0 ? (
          <p className="text-sm text-slate-500">Queue is empty.</p>
        ) : null}
      </div>

      <ProjectNav />
    </div>
  )
}
