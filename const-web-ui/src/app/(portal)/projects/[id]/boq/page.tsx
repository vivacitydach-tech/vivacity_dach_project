'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PageHeader } from '@/components/page-header';
import { ProjectNav } from '@/components/project-nav';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui-states';
import { useI18n } from '@/components/i18n-provider';
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  getErrorMessage,
} from '@/lib/api';
import { getCurrency } from '@/lib/auth';
import { formatMoney, multiplyStrings } from '@/lib/format';
import { exportToCsv, printPdfReport } from '@/lib/export';
import type { BoqNode, UnitRate } from '@/lib/types';

type FlatRow = BoqNode & { depth: number; isLeaf: boolean };

type EditDraft = {
  name: string;
  quantity: string;
  unit_price: string;
};

const ROW_HEIGHT = 44;

function flatten(nodes: BoqNode[], depth = 0): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const n of nodes) {
    const hasChildren = Boolean(n.children?.length);
    rows.push({ ...n, depth, isLeaf: !hasChildren });
    if (hasChildren) {
      rows.push(...flatten(n.children, depth + 1));
    }
  }
  return rows;
}

export default function BoqPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const currency = getCurrency();
  const qc = useQueryClient();
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [parentId, setParentId] = useState('');
  const [unitRateId, setUnitRateId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, EditDraft>>({});
  const [rowError, setRowError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['boq', id],
    queryFn: () => apiGet<BoqNode[]>(`/projects/${id}/boq`),
  });

  const ratesQuery = useQuery({
    queryKey: ['unit-rates'],
    queryFn: () => apiGet<UnitRate[]>('/unit-rates'),
  });

  const rows = useMemo(
    () => (query.data ? flatten(query.data) : []),
    [query.data],
  );

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const footerTotal = useMemo(() => {
    let sum = 0;
    let any = false;
    for (const row of rows) {
      if (!row.isLeaf) continue;
      const draft = edits[row.id];
      const qty = draft?.quantity ?? row.quantity;
      const price = draft?.unit_price ?? row.unit_price;
      const total = multiplyStrings(qty, price);
      if (total == null) continue;
      sum += total;
      any = true;
    }
    return any ? sum : null;
  }, [rows, edits]);

  function draftFor(row: FlatRow): EditDraft {
    return (
      edits[row.id] ?? {
        name: row.name,
        quantity: row.quantity ?? '',
        unit_price: row.unit_price ?? '',
      }
    );
  }

  function setDraft(rowId: string, patch: Partial<EditDraft>) {
    setEdits((prev) => {
      const base =
        prev[rowId] ??
        (() => {
          const row = rows.find((r) => r.id === rowId);
          return {
            name: row?.name ?? '',
            quantity: row?.quantity ?? '',
            unit_price: row?.unit_price ?? '',
          };
        })();
      return { ...prev, [rowId]: { ...base, ...patch } };
    });
  }

  const createMutation = useMutation({
    mutationFn: (body: {
      code: string;
      name: string;
      unit?: string;
      quantity?: number;
      unit_price?: number;
      parent_id?: string;
    }) => apiPost<BoqNode>(`/projects/${id}/boq`, body),
    onSuccess: async () => {
      setCode('');
      setName('');
      setUnit('');
      setQuantity('');
      setUnitPrice('');
      setParentId('');
      setUnitRateId('');
      setFormError(null);
      await qc.invalidateQueries({ queryKey: ['boq', id] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  function applyUnitRate(rateId: string) {
    setUnitRateId(rateId);
    if (!rateId) return;
    const rate = (ratesQuery.data ?? []).find((r) => r.id === rateId);
    if (!rate) return;
    setUnit(rate.unit);
    setUnitPrice(rate.unit_price ?? '');
    if (!name.trim()) setName(rate.description);
    if (!code.trim()) setCode(rate.code);
  }

  const saveMutation = useMutation({
    mutationFn: ({
      itemId,
      body,
    }: {
      itemId: string;
      body: { name?: string; quantity?: number; unit_price?: number };
    }) => apiPatch(`/projects/${id}/boq/${itemId}`, body),
    onSuccess: async (_data, vars) => {
      setEdits((prev) => {
        const next = { ...prev };
        delete next[vars.itemId];
        return next;
      });
      setRowError(null);
      await qc.invalidateQueries({ queryKey: ['boq', id] });
    },
    onError: (err) => setRowError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiDelete(`/projects/${id}/boq/${itemId}`),
    onSuccess: async () => {
      setRowError(null);
      await qc.invalidateQueries({ queryKey: ['boq', id] });
    },
    onError: (err) => setRowError(getErrorMessage(err)),
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    const body: {
      code: string;
      name: string;
      unit?: string;
      quantity?: number;
      unit_price?: number;
      parent_id?: string;
    } = {
      code: code.trim(),
      name: name.trim(),
    };
    if (unit.trim()) body.unit = unit.trim();
    if (quantity.trim() !== '') body.quantity = Number(quantity);
    if (unitPrice.trim() !== '') body.unit_price = Number(unitPrice);
    if (parentId) body.parent_id = parentId;
    createMutation.mutate(body);
  }

  function onSaveRow(row: FlatRow) {
    const draft = draftFor(row);
    const body: { name?: string; quantity?: number; unit_price?: number } = {
      name: draft.name.trim(),
    };
    if (draft.quantity.trim() !== '') body.quantity = Number(draft.quantity);
    if (draft.unit_price.trim() !== '')
      body.unit_price = Number(draft.unit_price);
    saveMutation.mutate({ itemId: row.id, body });
  }

  function handleExportCsv() {
    const headers = [
      'Code',
      'Item Name',
      'Unit',
      'Quantity',
      `Unit Price (${currency})`,
      `Total Amount (${currency})`,
    ];
    const exportData = rows.map((r) => [
      r.code,
      r.name,
      r.unit || '-',
      r.quantity || '0',
      r.unit_price || '0',
      multiplyStrings(r.quantity, r.unit_price),
    ]);
    exportToCsv(`BOQ-Project-${id}`, headers, exportData);
  }

  function handlePrintPdf() {
    const tableRows = rows
      .map(
        (r) => `
      <tr>
        <td style="padding-left: ${r.depth * 18 + 8}px; font-weight: ${r.isLeaf ? 'normal' : 'bold'}">${r.code}</td>
        <td style="font-weight: ${r.isLeaf ? 'normal' : 'bold'}">${r.name}</td>
        <td>${r.unit || '-'}</td>
        <td class="text-right">${r.quantity || '-'}</td>
        <td class="text-right">${r.unit_price ? formatMoney(r.unit_price, currency) : '-'}</td>
        <td class="text-right font-bold">${formatMoney(multiplyStrings(r.quantity, r.unit_price), currency)}</td>
      </tr>
    `,
      )
      .join('');

    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Description</th>
            <th>Unit</th>
            <th class="text-right">Quantity</th>
            <th class="text-right">Unit Price (${currency})</th>
            <th class="text-right">Total (${currency})</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    printPdfReport('Bill of Quantities (BOQ)', `Project ID: ${id}`, tableHtml);
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title={t('billOfQuantities')}
          subtitle="Hierarchical cost items & unit rate estimates"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={rows.length === 0}
            className="te-btn-secondary text-xs flex items-center gap-1.5"
          >
            📊 Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            disabled={rows.length === 0}
            className="te-btn-secondary text-xs flex items-center gap-1.5"
          >
            📄 Print PDF Report
          </button>
        </div>
      </div>
      <ProjectNav projectId={id} />

      <form
        onSubmit={onCreate}
        className="te-panel mb-6 grid gap-3 p-5 md:grid-cols-6"
      >
        <label className="block md:col-span-3">
          <span className="te-label">{t('applyUnitRate')}</span>
          <select
            value={unitRateId}
            onChange={(e) => applyUnitRate(e.target.value)}
            className="te-input"
          >
            <option value="">— Select rate —</option>
            {(ratesQuery.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} — {r.description} ({r.unit}
                {r.unit_price != null ? ` · ${r.unit_price}` : ''})
              </option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-3">
          <span className="te-label">{t('parentOptional')}</span>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="te-input"
          >
            <option value="">— Root —</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {'—'.repeat(r.depth)} {r.code} {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="te-label">{t('code')}</span>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="te-input font-mono"
            placeholder="1.1"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="te-label">{t('name')}</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="te-input"
            placeholder="Item description"
          />
        </label>
        <label className="block">
          <span className="te-label">{t('unit')}</span>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="te-input"
            placeholder="m³"
          />
        </label>
        <label className="block">
          <span className="te-label">{t('quantity')}</span>
          <input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="te-input font-mono"
          />
        </label>
        <label className="block">
          <span className="te-label">{t('unitPrice')}</span>
          <input
            type="number"
            step="any"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="te-input font-mono"
          />
        </label>
        <div className="flex items-end md:col-span-6">
          {formError ? (
            <p className="mb-2 w-full text-sm text-rose-400">{formError}</p>
          ) : null}
          <button
            type="submit"
            disabled={createMutation.isPending || !code.trim() || !name.trim()}
            className="te-btn-primary"
          >
            {createMutation.isPending ? 'Adding…' : t('addItem')}
          </button>
        </div>
      </form>

      {query.isLoading ? <LoadingState label="Loading BOQ…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyState message="No BOQ items for this project." />
      ) : null}

      {rowError ? (
        <p className="mb-3 text-sm text-rose-400">{rowError}</p>
      ) : null}

      {query.isSuccess && rows.length > 0 ? (
        <div
          ref={scrollRef}
          className="te-panel overflow-auto"
          style={{ maxHeight: 560 }}
        >
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">{t('code')}</th>
                <th className="px-4 py-3 font-medium">{t('description')}</th>
                <th className="px-4 py-3 font-medium">{t('unit')}</th>
                <th className="px-4 py-3 font-medium text-right">
                  {t('quantity')}
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  {t('unitPrice')}
                </th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {paddingTop > 0 ? (
                <tr aria-hidden>
                  <td colSpan={7} style={{ height: paddingTop, padding: 0 }} />
                </tr>
              ) : null}
              {virtualItems.map((virtualRow) => {
                const row = rows[virtualRow.index];
                const draft = draftFor(row);
                const total = multiplyStrings(
                  draft.quantity,
                  draft.unit_price || null,
                );
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-800/40"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <td className="px-4 py-2 font-mono text-xs text-emerald-400/90">
                      {row.code}
                    </td>
                    <td
                      className="py-2 pr-4"
                      style={{ paddingLeft: `${16 + row.depth * 18}px` }}
                    >
                      <input
                        value={draft.name}
                        onChange={(e) =>
                          setDraft(row.id, { name: e.target.value })
                        }
                        className={`te-input py-1 ${
                          row.depth === 0
                            ? 'font-medium text-slate-100'
                            : 'text-slate-300'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {row.unit ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="any"
                        value={draft.quantity}
                        onChange={(e) =>
                          setDraft(row.id, { quantity: e.target.value })
                        }
                        className="te-input py-1 text-right font-mono"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="any"
                        value={draft.unit_price}
                        onChange={(e) =>
                          setDraft(row.id, { unit_price: e.target.value })
                        }
                        className="te-input py-1 text-right font-mono"
                        placeholder={
                          row.unit_price == null ? t('masked') : undefined
                        }
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-medium text-slate-100">
                      {!draft.unit_price && row.unit_price == null
                        ? t('masked')
                        : formatMoney(total, currency)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="te-btn-secondary px-2 py-1 text-xs"
                          disabled={saveMutation.isPending}
                          onClick={() => onSaveRow(row)}
                        >
                          {t('save')}
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/20"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete BOQ item ${row.code}?`,
                              )
                            ) {
                              deleteMutation.mutate(row.id);
                            }
                          }}
                        >
                          {t('delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paddingBottom > 0 ? (
                <tr aria-hidden>
                  <td
                    colSpan={7}
                    style={{ height: paddingBottom, padding: 0 }}
                  />
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-700 bg-slate-950/80">
                <td
                  colSpan={5}
                  className="px-4 py-3 text-right text-sm font-medium text-slate-400"
                >
                  Leaf totals
                </td>
                <td className="px-4 py-3 text-right font-mono text-base font-semibold text-emerald-400">
                  {footerTotal == null
                    ? t('masked')
                    : formatMoney(footerTotal, currency)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </div>
  );
}
