'use client';

import { useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { ProjectNav } from '@/components/project-nav';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui-states';
import { useI18n } from '@/components/i18n-provider';
import { apiGet, apiPost, getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { SiteDiary } from '@/lib/types';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function tryGetPosition(): Promise<{
  latitude?: number;
  longitude?: number;
}> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return {};
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve({}),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 },
    );
  });
}

export default function DiariesPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const { t } = useI18n();

  const [diaryDate, setDiaryDate] = useState(todayIsoDate);
  const [weather, setWeather] = useState('');
  const [notes, setNotes] = useState('');
  const [captureGps, setCaptureGps] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['diaries', id],
    queryFn: () => apiGet<SiteDiary[]>(`/projects/${id}/diaries`),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiPost<SiteDiary>(`/projects/${id}/diaries`, body),
    onSuccess: async () => {
      setNotes('');
      setWeather('');
      setDiaryDate(todayIsoDate());
      setFormError(null);
      await qc.invalidateQueries({ queryKey: ['diaries', id] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!notes.trim()) return;
    const body: Record<string, unknown> = {
      diary_date: diaryDate,
      notes: notes.trim(),
    };
    if (weather.trim()) body.weather = weather.trim();
    if (captureGps) {
      const coords = await tryGetPosition();
      if (coords.latitude != null) body.latitude = coords.latitude;
      if (coords.longitude != null) body.longitude = coords.longitude;
    }
    createMutation.mutate(body);
  }

  return (
    <div>
      <PageHeader
        title={t('siteDiary')}
        subtitle="Daily site notes with optional weather and GPS"
      />
      <ProjectNav projectId={id} />

      <form
        onSubmit={onSubmit}
        className="te-panel mb-6 grid gap-3 p-5 md:grid-cols-4"
      >
        <label className="block">
          <span className="te-label">Date</span>
          <input
            type="date"
            required
            value={diaryDate}
            onChange={(e) => setDiaryDate(e.target.value)}
            className="te-input"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="te-label">{t('weather')}</span>
          <input
            value={weather}
            onChange={(e) => setWeather(e.target.value)}
            className="te-input"
            placeholder="Sunny / rain"
            maxLength={128}
          />
        </label>
        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            checked={captureGps}
            onChange={(e) => setCaptureGps(e.target.checked)}
            className="rounded border-slate-700"
          />
          <span className="text-sm text-slate-300">Capture GPS</span>
        </label>
        <label className="block md:col-span-4">
          <span className="te-label">{t('notes')}</span>
          <textarea
            required
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="te-input min-h-28"
            placeholder="What happened on site?"
          />
        </label>
        <div className="md:col-span-4">
          {formError ? (
            <p className="mb-2 text-sm text-rose-400">{formError}</p>
          ) : null}
          <button
            type="submit"
            disabled={createMutation.isPending || !notes.trim()}
            className="te-btn-primary"
          >
            {createMutation.isPending ? 'Saving…' : t('createDiary')}
          </button>
        </div>
      </form>

      {query.isLoading ? <LoadingState label="Loading diaries…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : null}
      {query.isSuccess && (query.data?.length ?? 0) === 0 ? (
        <EmptyState message="No site diary entries yet." />
      ) : null}

      {query.isSuccess && (query.data?.length ?? 0) > 0 ? (
        <div className="space-y-3">
          {query.data!.map((entry) => (
            <article key={entry.id} className="te-panel p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm text-emerald-400">
                  {formatDate(String(entry.diary_date).slice(0, 10))}
                </p>
                {entry.weather ? (
                  <span className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-xs text-slate-300">
                    {entry.weather}
                  </span>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-200">
                {entry.notes}
              </p>
              {(entry.latitude || entry.longitude) && (
                <p className="mt-2 font-mono text-xs text-slate-500">
                  GPS {entry.latitude ?? '—'}, {entry.longitude ?? '—'}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
