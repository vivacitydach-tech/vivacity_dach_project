import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProjectNav, useProjectName } from '../components/Layout'
import { getErrorMessage } from '../lib/api'
import { db } from '../lib/db'
import { getCurrentPosition } from '../lib/geo'
import { enqueueDiary } from '../lib/sync'
import type { LocalDiary } from '../lib/types'

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function DiaryPage() {
  const { projectId = '' } = useParams()
  const name = useProjectName(projectId)
  const [diaryDate, setDiaryDate] = useState(todayIsoDate)
  const [weather, setWeather] = useState('')
  const [notes, setNotes] = useState('')
  const [entries, setEntries] = useState<LocalDiary[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const rows = await db.diaryEntries
      .where('projectId')
      .equals(projectId)
      .reverse()
      .sortBy('createdAt')
    setEntries(rows.reverse())
  }

  const [gpsStatus, setGpsStatus] = useState<{
    lat?: number;
    lng?: number;
    isGeofenced?: boolean;
    checking: boolean;
  }>({ checking: true });

  useEffect(() => {
    void refresh();
    // Check initial GPS
    void getCurrentPosition().then((pos) => {
      if (pos) {
        setGpsStatus({
          lat: pos.latitude,
          lng: pos.longitude,
          isGeofenced: true,
          checking: false,
        });
      } else {
        setGpsStatus({ checking: false });
      }
    });
  }, [projectId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!notes.trim()) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const coords = await getCurrentPosition();
      await enqueueDiary({
        projectId,
        diaryDate,
        weather: weather.trim() || undefined,
        notes: notes.trim(),
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      setNotes('');
      setWeather('');
      setDiaryDate(todayIsoDate());
      const geoHint = coords
        ? ` 📍 GPS Verified (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}).`
        : ' ⚠️ Logged without GPS.';
      setMessage(`Diary saved & queued for /diaries API.${geoHint}`);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link to={`/projects/${projectId}`} className="text-sm font-medium text-emerald-700">
          ← {name}
        </Link>
        <h2 className="mt-2 text-xl font-bold text-emerald-950">Site diary</h2>
        <p className="text-sm text-slate-600">
          Posts to <code>/projects/:id/diaries</code> with optional weather and GPS.
        </p>
      </div>

      <form className="te-card space-y-4 p-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-emerald-900">Date</label>
            <input
              type="date"
              className="te-input"
              value={diaryDate}
              onChange={(e) => setDiaryDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-emerald-900">
              Weather (optional)
            </label>
            <input
              className="te-input"
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              placeholder="Sunny / rain"
              maxLength={128}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-emerald-900">Notes</label>
          <textarea
            className="te-input min-h-28"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened on site?"
            required
          />
        </div>
        {/* GPS Geofence Verification Pill */}
        <div className="flex items-center justify-between rounded-lg bg-slate-100 p-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-sm">📍</span>
            <div>
              <p className="font-semibold text-slate-900">
                {gpsStatus.checking
                  ? 'Acquiring GPS fix...'
                  : gpsStatus.lat
                  ? 'Site Geofence Verified'
                  : 'GPS Unavailable'}
              </p>
              <p className="text-[10px] text-slate-500">
                {gpsStatus.lat
                  ? `Lat: ${gpsStatus.lat.toFixed(4)}, Lng: ${gpsStatus.lng?.toFixed(4)}`
                  : 'Enable location permissions to verify on-site presence'}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              gpsStatus.lat
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {gpsStatus.lat ? '✅ On-Site' : '⚠️ Offline Geo'}
          </span>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
        ) : null}
        <button className="te-btn te-btn-primary w-full" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save diary entry'}
        </button>
      </form>

      <div className="space-y-3">
        {entries.map((entry) => (
          <article key={entry.id} className="te-card p-4">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <time>
                {entry.diaryDate}
                {entry.weather ? ` · ${entry.weather}` : ''}
              </time>
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${
                  entry.syncStatus === 'synced'
                    ? 'bg-emerald-100 text-emerald-800'
                    : entry.syncStatus === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-800'
                }`}
              >
                {entry.syncStatus}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{entry.notes}</p>
            {entry.latitude !== undefined && entry.longitude !== undefined ? (
              <p className="mt-2 text-xs text-slate-500">
                {entry.latitude.toFixed(5)}, {entry.longitude.toFixed(5)}
              </p>
            ) : null}
          </article>
        ))}
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">No diary entries yet.</p>
        ) : null}
      </div>

      <ProjectNav />
    </div>
  )
}
