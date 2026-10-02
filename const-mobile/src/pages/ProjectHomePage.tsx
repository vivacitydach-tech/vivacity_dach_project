import { Link, useParams } from 'react-router-dom'
import { ProjectNav, useProjectName } from '../components/Layout'
import { setSelectedProjectId } from '../lib/auth'
import { useEffect } from 'react'

export function ProjectHomePage() {
  const { projectId = '' } = useParams()
  const name = useProjectName(projectId)

  useEffect(() => {
    if (projectId) setSelectedProjectId(projectId)
  }, [projectId])

  const tiles = [
    {
      to: `/projects/${projectId}/diary`,
      title: 'Site diary',
      body: 'Daily notes with weather and GPS — posts to /diaries.',
    },
    {
      to: `/projects/${projectId}/snags`,
      title: 'Snags / defects',
      body: 'Report punch-list items as issue type defect.',
    },
    {
      to: `/projects/${projectId}/camera`,
      title: 'Camera',
      body: 'Capture site photos with GPS; upload via documents.',
    },
    {
      to: `/projects/${projectId}/checklists`,
      title: 'Checklists',
      body: 'Template lists, item toggles, sign to complete.',
    },
    {
      to: `/projects/${projectId}/queue`,
      title: 'Sync queue',
      body: 'Pending ops with idempotency keys in IndexedDB.',
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <Link to="/projects" className="text-sm font-medium text-emerald-700">
          ← Projects
        </Link>
        <h2 className="mt-2 text-xl font-bold text-emerald-950">{name}</h2>
        <p className="text-sm text-slate-600">Field workspace</p>
      </div>

      <div className="grid gap-3">
        {tiles.map((tile) => (
          <Link key={tile.to} to={tile.to} className="te-card block p-4">
            <p className="font-semibold text-emerald-950">{tile.title}</p>
            <p className="mt-1 text-sm text-slate-600">{tile.body}</p>
          </Link>
        ))}
      </div>

      <ProjectNav />
    </div>
  )
}
