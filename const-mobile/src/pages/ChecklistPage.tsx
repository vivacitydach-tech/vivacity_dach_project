import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProjectNav, useProjectName } from '../components/Layout'
import { SignaturePad } from '../components/SignaturePad'
import { getErrorMessage } from '../lib/api'
import { db } from '../lib/db'
import {
  enqueueChecklistCreate,
  enqueueChecklistPatch,
  enqueueChecklistSignature,
  isOnline,
  reconcileChecklists,
} from '../lib/sync'
import type { LocalChecklist } from '../lib/types'

const TEMPLATES: { key: string; title: string; items: string[] }[] = [
  {
    key: 'daily_safety',
    title: 'Daily safety check',
    items: [
      'PPE worn by all on site',
      'Access routes clear',
      'Housekeeping acceptable',
      'First-aid kit available',
      'Toolbox talk completed',
    ],
  },
  {
    key: 'quality_walk',
    title: 'Quality walk',
    items: [
      'Work matches drawings',
      'Materials stored correctly',
      'No visible defects',
      'Protections in place',
      'Snags logged if found',
    ],
  },
  {
    key: 'handover',
    title: 'Area handover',
    items: [
      'Area clean and tidy',
      'Services isolated as required',
      'Keys / access confirmed',
      'Outstanding works listed',
      'Client notified',
    ],
  },
]

export function ChecklistPage() {
  const { projectId = '' } = useParams()
  const name = useProjectName(projectId)
  const [lists, setLists] = useState<LocalChecklist[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const active = lists.find((l) => l.id === activeId) ?? null

  async function refreshLocal() {
    const rows = await db.checklists.where('projectId').equals(projectId).toArray()
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    setLists(rows)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      await refreshLocal()
      if (isOnline()) {
        try {
          await reconcileChecklists(projectId)
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

  async function createFromTemplate(template: (typeof TEMPLATES)[number]) {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const created = await enqueueChecklistCreate({
        projectId,
        templateKey: template.key,
        title: template.title,
        items: template.items,
      })
      setMessage(
        navigator.onLine
          ? 'Checklist created / sync started.'
          : 'Checklist queued offline.',
      )
      await refreshLocal()
      setActiveId(created.id)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function toggleItem(checklist: LocalChecklist, itemId: string, checked: boolean) {
    setError(null)
    try {
      await db.checklists.update(checklist.id, {
        items: checklist.items.map((i) =>
          i.id === itemId ? { ...i, checked } : i,
        ),
        syncStatus: checklist.serverId ? 'pending' : checklist.syncStatus,
      })
      await refreshLocal()

      // Remote PATCH only when server item IDs exist; pending creates keep local checks
      // and re-apply them by label after create sync.
      if (checklist.serverId) {
        await enqueueChecklistPatch({
          projectId,
          checklistId: checklist.serverId,
          items: [{ id: itemId, checked }],
        })
      }
      await refreshLocal()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function completeWithSignature() {
    if (!active || !signature) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const checklistId = active.serverId ?? active.id
      await enqueueChecklistSignature({
        projectId,
        checklistId,
        imageData: signature,
        complete: true,
      })
      setSignature(null)
      setMessage('Signature queued; checklist marked complete.')
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
        <h2 className="mt-2 text-xl font-bold text-emerald-950">Checklists</h2>
        <p className="text-sm text-slate-600">
          Create from templates, toggle items, complete with signature.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}

      {!active ? (
        <>
          <div className="te-card space-y-3 p-4">
            <p className="text-sm font-semibold text-emerald-900">New from template</p>
            <div className="grid gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className="te-btn te-btn-secondary w-full justify-start text-left"
                  disabled={busy}
                  onClick={() => void createFromTemplate(t)}
                >
                  <span>
                    <span className="block font-semibold">{t.title}</span>
                    <span className="block text-xs font-normal text-slate-500">
                      {t.items.length} items · {t.key}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                className="te-card block w-full p-4 text-left"
                onClick={() => {
                  setActiveId(list.id)
                  setSignature(null)
                  setMessage(null)
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-emerald-950">{list.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {list.items.filter((i) => i.checked).length}/{list.items.length} checked
                      {list.completedAt ? ' · completed' : ''}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      list.syncStatus === 'synced'
                        ? 'bg-emerald-100 text-emerald-800'
                        : list.syncStatus === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {list.syncStatus}
                  </span>
                </div>
              </button>
            ))}
            {lists.length === 0 ? (
              <p className="text-sm text-slate-500">No checklists yet.</p>
            ) : null}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            className="text-sm font-medium text-emerald-700"
            onClick={() => setActiveId(null)}
          >
            ← All checklists
          </button>

          <div className="te-card space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-emerald-950">{active.title}</h3>
                <p className="text-xs text-slate-500">{active.templateKey}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  active.completedAt
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {active.completedAt ? 'Completed' : 'Open'}
              </span>
            </div>

            <ul className="space-y-2">
              {active.items.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-100 bg-white/70 px-3 py-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={item.checked}
                      disabled={!!active.completedAt || busy}
                      onChange={(e) =>
                        void toggleItem(active, item.id, e.target.checked)
                      }
                    />
                    <span
                      className={`text-sm ${
                        item.checked ? 'text-slate-500 line-through' : 'text-slate-800'
                      }`}
                    >
                      {item.label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {!active.completedAt ? (
            <div className="te-card space-y-3 p-4">
              <SignaturePad onChange={setSignature} />
              <button
                type="button"
                className="te-btn te-btn-primary w-full"
                disabled={!signature || busy}
                onClick={() => void completeWithSignature()}
              >
                {busy ? 'Saving…' : 'Sign & complete'}
              </button>
            </div>
          ) : (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Checklist completed
              {active.completedAt
                ? ` · ${new Date(active.completedAt).toLocaleString()}`
                : ''}
              .
            </p>
          )}
        </div>
      )}

      <ProjectNav />
    </div>
  )
}
