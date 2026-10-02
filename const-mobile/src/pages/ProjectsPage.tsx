import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest, getErrorMessage } from '../lib/api'
import { setSelectedProjectId } from '../lib/auth'
import { cacheProjects, getCachedProjects, isOnline } from '../lib/sync'
import type { Project } from '../lib/types'

export function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        if (isOnline()) {
          const remote = await apiRequest<Project[]>('/projects')
          await cacheProjects(remote)
          if (!cancelled) setProjects(remote)
        } else {
          const cached = await getCachedProjects()
          if (!cancelled) setProjects(cached)
        }
      } catch (err) {
        const cached = await getCachedProjects()
        if (!cancelled) {
          setProjects(cached)
          if (cached.length === 0) setError(getErrorMessage(err))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  function openProject(id: string) {
    setSelectedProjectId(id)
    navigate(`/projects/${id}`)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-emerald-950">Projects</h2>
        <p className="text-sm text-slate-600">Pick a site to capture diary, snags, and photos.</p>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="space-y-3">
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            className="te-card w-full p-4 text-left transition hover:border-emerald-400"
            onClick={() => openProject(p.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-emerald-950">{p.name}</p>
                <p className="text-xs text-slate-500">
                  {p.code || 'No code'} · {p.status}
                </p>
              </div>
              <span className="text-emerald-700">→</span>
            </div>
          </button>
        ))}
        {!loading && projects.length === 0 ? (
          <p className="text-sm text-slate-500">No projects available.</p>
        ) : null}
      </div>
    </div>
  )
}
