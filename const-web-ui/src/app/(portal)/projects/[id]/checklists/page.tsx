'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { ProjectNav } from '@/components/project-nav';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui-states';
import { useI18n } from '@/components/i18n-provider';
import { apiGet, apiPatch, apiPost, getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Checklist } from '@/lib/types';

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
];

function stubSignatureDataUrl(label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80"><rect width="100%" height="100%" fill="#0f172a"/><text x="16" y="48" fill="#34d399" font-family="monospace" font-size="18">${label.replace(/[<>&]/g, '')}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export default function ChecklistsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['checklists', id],
    queryFn: () => apiGet<Checklist[]>(`/projects/${id}/checklists`),
  });

  const lists = query.data ?? [];
  const active = useMemo(
    () => lists.find((c) => c.id === activeId) ?? null,
    [lists, activeId],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [activeId]);

  const createMutation = useMutation({
    mutationFn: (body: {
      template_key: string;
      title: string;
      items: string[];
    }) => apiPost<Checklist>(`/projects/${id}/checklists`, body),
    onSuccess: async (created) => {
      setFormError(null);
      setActiveId(created.id);
      await qc.invalidateQueries({ queryKey: ['checklists', id] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const patchMutation = useMutation({
    mutationFn: ({
      checklistId,
      body,
    }: {
      checklistId: string;
      body: Record<string, unknown>;
    }) => apiPatch<Checklist>(`/projects/${id}/checklists/${checklistId}`, body),
    onSuccess: async () => {
      setRowError(null);
      await qc.invalidateQueries({ queryKey: ['checklists', id] });
    },
    onError: (err) => setRowError(getErrorMessage(err)),
  });

  const signatureMutation = useMutation({
    mutationFn: async ({
      checklistId,
      image_data,
    }: {
      checklistId: string;
      image_data: string;
    }) => {
      await apiPost(`/projects/${id}/checklists/${checklistId}/signature`, {
        image_data,
      });
      return apiPatch<Checklist>(`/projects/${id}/checklists/${checklistId}`, {
        complete: true,
      });
    },
    onSuccess: async () => {
      setRowError(null);
      setSignerName('');
      clearCanvas();
      await qc.invalidateQueries({ queryKey: ['checklists', id] });
    },
    onError: (err) => setRowError(getErrorMessage(err)),
  });

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function onCanvasPointer(
    e: PointerEvent<HTMLCanvasElement>,
    mode: 'down' | 'move' | 'up',
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (mode === 'down') {
      drawingRef.current = true;
      canvas.setPointerCapture(e.pointerId);
      ctx.beginPath();
      ctx.moveTo(x, y);
      return;
    }
    if (mode === 'up') {
      drawingRef.current = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
    if (!drawingRef.current) return;
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function onCreateFromTemplate(e: FormEvent) {
    e.preventDefault();
    const select = (e.target as HTMLFormElement).elements.namedItem(
      'template',
    ) as HTMLSelectElement;
    const template = TEMPLATES.find((t) => t.key === select.value);
    if (!template) return;
    createMutation.mutate({
      template_key: template.key,
      title: template.title,
      items: template.items,
    });
  }

  function toggleItem(checklist: Checklist, itemId: string, checked: boolean) {
    patchMutation.mutate({
      checklistId: checklist.id,
      body: { items: [{ id: itemId, checked }] },
    });
  }

  function completeAndSign() {
    if (!active) return;
    const canvas = canvasRef.current;
    let image_data =
      canvas && canvas.width > 0
        ? canvas.toDataURL('image/png')
        : stubSignatureDataUrl(signerName.trim() || 'Signed');
    if (signerName.trim() && (!canvas || isCanvasBlank(canvas))) {
      image_data = stubSignatureDataUrl(signerName.trim());
    }
    signatureMutation.mutate({ checklistId: active.id, image_data });
  }

  function isCanvasBlank(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 15 || data[i + 1] !== 23 || data[i + 2] !== 42) {
        return false;
      }
    }
    return true;
  }

  return (
    <div>
      <PageHeader
        title={t('checklists')}
        subtitle="Field templates, item toggles, and signature completion"
      />
      <ProjectNav projectId={id} />

      <form
        onSubmit={onCreateFromTemplate}
        className="te-panel mb-6 flex flex-wrap items-end gap-3 p-5"
      >
        <label className="block min-w-[220px] flex-1">
          <span className="te-label">Template</span>
          <select name="template" className="te-input" defaultValue="daily_safety">
            {TEMPLATES.map((tpl) => (
              <option key={tpl.key} value={tpl.key}>
                {tpl.title} ({tpl.items.length} items)
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="te-btn-primary"
        >
          {createMutation.isPending ? 'Creating…' : t('createChecklist')}
        </button>
        {formError ? (
          <p className="w-full text-sm text-rose-400">{formError}</p>
        ) : null}
      </form>

      {query.isLoading ? <LoadingState label="Loading checklists…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : null}
      {query.isSuccess && lists.length === 0 ? (
        <EmptyState message="No checklists yet. Create one from a template." />
      ) : null}

      {rowError ? (
        <p className="mb-3 text-sm text-rose-400">{rowError}</p>
      ) : null}

      {lists.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="te-panel divide-y divide-slate-800 overflow-hidden">
            {lists.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`block w-full px-4 py-3 text-left transition ${
                  activeId === c.id
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'hover:bg-slate-900/80 text-slate-200'
                }`}
              >
                <p className="text-sm font-medium">{c.title}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  {c.template_key} · {formatDate(c.created_at)}
                  {c.completed_at ? ' · done' : ''}
                </p>
              </button>
            ))}
          </div>

          {active ? (
            <div className="te-panel space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">
                    {active.title}
                  </h3>
                  <p className="font-mono text-xs text-slate-500">
                    {active.template_key}
                  </p>
                </div>
                {active.completed_at ? (
                  <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                    Completed {formatDate(active.completed_at)}
                  </span>
                ) : (
                  <span className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400">
                    In progress
                  </span>
                )}
              </div>

              <ul className="space-y-2">
                {active.items.map((item) => (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5 hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        disabled={Boolean(active.completed_at) || patchMutation.isPending}
                        onChange={(e) =>
                          toggleItem(active, item.id, e.target.checked)
                        }
                        className="mt-0.5"
                      />
                      <span
                        className={`text-sm ${
                          item.checked
                            ? 'text-slate-500 line-through'
                            : 'text-slate-200'
                        }`}
                      >
                        {item.label}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              {!active.completed_at ? (
                <div className="space-y-3 border-t border-slate-800 pt-4">
                  <label className="block max-w-sm">
                    <span className="te-label">Signer name (optional stub)</span>
                    <input
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      className="te-input"
                      placeholder="Site manager"
                    />
                  </label>
                  <div>
                    <p className="te-label mb-1">Signature pad</p>
                    <canvas
                      ref={canvasRef}
                      width={480}
                      height={140}
                      className="w-full max-w-lg cursor-crosshair rounded-lg border border-slate-700 bg-slate-950"
                      onPointerDown={(e) => onCanvasPointer(e, 'down')}
                      onPointerMove={(e) => onCanvasPointer(e, 'move')}
                      onPointerUp={(e) => onCanvasPointer(e, 'up')}
                      onPointerLeave={(e) => onCanvasPointer(e, 'up')}
                    />
                    <button
                      type="button"
                      className="te-btn-secondary mt-2 px-2 py-1 text-xs"
                      onClick={clearCanvas}
                    >
                      Clear pad
                    </button>
                  </div>
                  <button
                    type="button"
                    className="te-btn-primary"
                    disabled={signatureMutation.isPending}
                    onClick={completeAndSign}
                  >
                    {signatureMutation.isPending
                      ? 'Saving…'
                      : t('completeChecklist')}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Signatures: {active.signatures?.length ?? 0}
                </p>
              )}
            </div>
          ) : (
            <div className="te-panel flex items-center justify-center p-8 text-sm text-slate-500">
              Select a checklist to review items and sign.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
