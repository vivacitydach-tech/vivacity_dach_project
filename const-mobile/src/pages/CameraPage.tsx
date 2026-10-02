import { useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProjectNav, useProjectName } from '../components/Layout'
import { getErrorMessage } from '../lib/api'
import { getCurrentPosition } from '../lib/geo'
import { enqueuePhoto } from '../lib/sync'

export function CameraPage() {
  const { projectId = '' } = useParams()
  const name = useProjectName(projectId)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function onCapture(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null
    setFile(next)
    setMessage(null)
    setError(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(next ? URL.createObjectURL(next) : null)
  }

  async function onSave() {
    if (!file) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const coords = await getCurrentPosition()
      await enqueuePhoto({
        projectId,
        file,
        fileName: file.name || undefined,
        note: note.trim() || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      })
      const geoHint = coords
        ? ` GPS ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}.`
        : ' No GPS fix.'
      setMessage(
        navigator.onLine
          ? `Photo queued and sync started (presign → complete).${geoHint}`
          : `Photo stored in IndexedDB and queued for upload when online.${geoHint}`,
      )
      setFile(null)
      setNote('')
      if (preview) URL.revokeObjectURL(preview)
      setPreview(null)
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
        <h2 className="mt-2 text-xl font-bold text-emerald-950">Camera</h2>
        <p className="text-sm text-slate-600">
          Captures GPS when available and sends lat/lng on document complete.
        </p>
      </div>

      <div className="te-card space-y-4 p-4">
        <label className="te-btn te-btn-secondary w-full cursor-pointer">
          Open camera / gallery
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onCapture}
          />
        </label>

        {preview ? (
          <img
            src={preview}
            alt="Capture preview"
            className="max-h-72 w-full rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 text-sm text-slate-500">
            No photo selected
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-emerald-900">
            Note (optional)
          </label>
          <input
            className="te-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What does this photo show?"
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
        ) : null}

        <button
          type="button"
          className="te-btn te-btn-primary w-full"
          disabled={!file || busy}
          onClick={() => void onSave()}
        >
          {busy ? 'Queuing…' : 'Attach & queue photo'}
        </button>
      </div>

      <ProjectNav />
    </div>
  )
}
