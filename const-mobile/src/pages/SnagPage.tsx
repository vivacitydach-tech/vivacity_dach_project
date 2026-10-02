import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProjectNav, useProjectName } from '../components/Layout'
import { getErrorMessage } from '../lib/api'
import { db } from '../lib/db'
import { enqueueSnag, isOnline, reconcileIssues } from '../lib/sync'
import type { LocalIssue } from '../lib/types'

export function SnagPage() {
  const { projectId = '' } = useParams()
  const name = useProjectName(projectId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [issues, setIssues] = useState<LocalIssue[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function refreshLocal() {
    const rows = await db.issues.where('projectId').equals(projectId).toArray()
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    setIssues(rows)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      await refreshLocal()
      if (isOnline()) {
        try {
          await reconcileIssues(projectId)
          if (!cancelled) await refreshLocal()
        } catch (err) {
          if (!cancelled) setError(getErrorMessage(err))
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [projectId])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await enqueueSnag({
        projectId,
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || undefined,
        priority,
      })
      setTitle('')
      setDescription('')
      setLocation('')
      setMessage('Snag queued (type: defect). Will sync with Idempotency-Key when online.')
      await refreshLocal()
    } catch (err) {
      setError(getErrorMessage(err))
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
        <h2 className="mt-2 text-xl font-bold text-emerald-950">Snags / defects</h2>
        <p className="text-sm text-slate-600">
          Creates issue type <code>defect</code>. Server status wins on reconcile.
        </p>
      </div>

      <form className="te-card space-y-3 p-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-emerald-900">Title</label>
          <input
            className="te-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={255}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-emerald-900">Description</label>
          <textarea
            className="te-input min-h-24"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-emerald-900">Priority</label>
            <select
              className="te-input"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as 'low' | 'medium' | 'high' | 'critical')
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-emerald-900">Location</label>
            <input
              className="te-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Grid / room"
            />
          </div>
        </div>
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
        ) : null}
        <button className="te-btn te-btn-primary w-full" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Report snag'}
        </button>
      </form>

      <div className="space-y-3">
        {issues.map((issue) => (
          <article key={issue.id} className="te-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-emerald-950">{issue.title}</p>
                <p className="mt-1 text-sm text-slate-700">{issue.description}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                {issue.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {issue.type} · {issue.priority} · {issue.syncStatus}
              {issue.location ? ` · ${issue.location}` : ''}
            </p>
          </article>
        ))}
        {issues.length === 0 ? (
          <p className="text-sm text-slate-500">No snags yet.</p>
        ) : null}
      </div>

      <ProjectNav />
    </div>
  )
}
