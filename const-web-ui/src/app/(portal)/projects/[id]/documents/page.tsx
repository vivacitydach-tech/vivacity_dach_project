'use client';

import { useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { ProjectNav } from '@/components/project-nav';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui-states';
import { useI18n } from '@/components/i18n-provider';
import { apiGet, apiPost, getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  DOC_TYPES,
  type Document,
  type DocumentComplete,
  type PresignResult,
} from '@/lib/types';

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function formatCoord(value: string | null | undefined) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toFixed(6);
}

export default function DocumentsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const { t } = useI18n();

  const [docType, setDocType] =
    useState<(typeof DOC_TYPES)[number]>('drawing');
  const [file, setFile] = useState<File | null>(null);
  const [captureGps, setCaptureGps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['documents', id],
    queryFn: () => apiGet<Document[]>(`/projects/${id}/documents`),
  });

  async function readGps(): Promise<{ latitude: number; longitude: number } | null> {
    if (!captureGps) return null;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Geolocation is not available in this browser');
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        (err) => reject(new Error(err.message || 'Unable to capture GPS')),
        { enableHighAccuracy: true, timeout: 15000 },
      );
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const gps = await readGps();

      const presign = await apiPost<PresignResult>(
        `/projects/${id}/documents/presign`,
        {
          doc_type: docType,
          file_name: file.name,
          mime_type: file.type || 'application/octet-stream',
        },
      );

      if (/^https?:\/\//i.test(presign.upload_url)) {
        await fetch(presign.upload_url, {
          method: presign.method || 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });
      }

      const sha256 = await sha256Hex(file);
      const completeBody: Record<string, unknown> = {
        sha256,
        size_bytes: file.size,
      };
      if (gps) {
        completeBody.latitude = gps.latitude;
        completeBody.longitude = gps.longitude;
      }
      await apiPost<DocumentComplete>(
        `/projects/${id}/documents/${presign.document_id}/complete`,
        completeBody,
      );
      setFile(null);
      await qc.invalidateQueries({ queryKey: ['documents', id] });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const docs = query.data ?? [];

  return (
    <div>
      <PageHeader
        title={t('documents')}
        subtitle="Presign + complete upload flow"
      />
      <ProjectNav projectId={id} />

      <form
        onSubmit={onSubmit}
        className="te-panel mb-6 grid gap-4 border-dashed border-slate-700 p-6 md:grid-cols-3"
      >
        <div className="md:col-span-3">
          <p className="text-sm font-medium text-slate-200">Upload area</p>
          <p className="mt-1 text-xs text-slate-500">
            Select a document type and file, then complete the upload pipeline.
          </p>
        </div>
        <label className="block">
          <span className="te-label">{t('docType')}</span>
          <select
            value={docType}
            onChange={(e) =>
              setDocType(e.target.value as (typeof DOC_TYPES)[number])
            }
            className="te-input"
          >
            {DOC_TYPES.map((dt) => (
              <option key={dt} value={dt}>
                {dt}
              </option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="te-label">{t('file')}</span>
          <input
            type="file"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="te-input file:mr-3 file:rounded file:border-0 file:bg-emerald-500/15 file:px-3 file:py-1 file:text-emerald-400"
          />
        </label>
        <label className="flex items-center gap-2 md:col-span-3">
          <input
            type="checkbox"
            checked={captureGps}
            onChange={(e) => setCaptureGps(e.target.checked)}
          />
          <span className="text-sm text-slate-300">{t('captureGps')}</span>
        </label>
        <div className="md:col-span-3">
          {error ? <p className="mb-2 text-sm text-rose-400">{error}</p> : null}
          {file ? (
            <p className="mb-2 font-mono text-xs text-slate-400">
              Selected: {file.name} ({file.size.toLocaleString()} B)
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !file}
            className="te-btn-primary"
          >
            {busy ? 'Uploading…' : t('uploadAndComplete')}
          </button>
        </div>
      </form>

      {query.isLoading ? <LoadingState label="Loading documents…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : null}
      {query.isSuccess && docs.length === 0 ? (
        <EmptyState message="No documents yet." />
      ) : null}

      {query.isSuccess && docs.length > 0 ? (
        <div className="te-panel overflow-hidden">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">{t('file')}</th>
                <th className="px-4 py-3 font-medium">{t('type')}</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">{t('latitude')}</th>
                <th className="px-4 py-3 font-medium">{t('longitude')}</th>
                <th className="px-4 py-3 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-100">
                    {doc.file_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs capitalize text-slate-400">
                    {doc.doc_type}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {Number(doc.size_bytes ?? 0).toLocaleString()} B
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {formatCoord(doc.latitude)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {formatCoord(doc.longitude)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(doc.completed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
