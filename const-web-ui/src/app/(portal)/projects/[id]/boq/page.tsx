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

  // AI Estimator State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGfa, setAiGfa] = useState('3500');
  const [aiFloors, setAiFloors] = useState('6');
  const [aiArchetype, setAiArchetype] = useState<'commercial' | 'residential' | 'warehouse'>('commercial');
  const [isEstimating, setIsEstimating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    code: string;
    name: string;
    unit: string;
    quantity: number;
    unit_price: number;
  }>>([]);

  const handleRunAiEstimator = () => {
    setIsEstimating(true);
    setTimeout(() => {
      const gfa = Number(aiGfa) || 2000;
      const floors = Number(aiFloors) || 4;

      let concreteRate = 220;
      let rebarRate = 1850;
      let facadeRate = 450;
      let mepRate = 160;

      if (aiArchetype === 'commercial') {
        concreteRate = 240;
        rebarRate = 1900;
        facadeRate = 550;
        mepRate = 190;
      } else if (aiArchetype === 'warehouse') {
        concreteRate = 180;
        rebarRate = 1650;
        facadeRate = 280;
        mepRate = 110;
      }

      const concreteQty = Math.round(gfa * (0.35 + floors * 0.02));
      const rebarQty = Math.round((concreteQty * 110) / 1000); // tons
      const facadeQty = Math.round(gfa * 0.65);
      const mepQty = Math.round(gfa);
      const excavationQty = Math.round(gfa * (0.6 + floors * 0.05));
      const finishesQty = Math.round(gfa * 0.85);

      setAiSuggestions([
        { code: '02.10', name: 'Bulk Earthworks & Basement Excavation', unit: 'm³', quantity: excavationQty, unit_price: 35 },
        { code: '03.20', name: 'C30/37 Reinforced Concrete (Core & Slabs)', unit: 'm³', quantity: concreteQty, unit_price: concreteRate },
        { code: '03.30', name: 'B500B High-Yield Reinforcement Rebar', unit: 'ton', quantity: rebarQty, unit_price: rebarRate },
        { code: '08.40', name: 'High-Performance Unitized Curtain Wall Facade', unit: 'm²', quantity: facadeQty, unit_price: facadeRate },
        { code: '15.10', name: 'MEP Primary HVAC & Electrical Distribution Package', unit: 'm²', quantity: mepQty, unit_price: mepRate },
        { code: '09.20', name: 'Internal Drywall Partitions & Acoustic Ceilings', unit: 'm²', quantity: finishesQty, unit_price: 85 },
      ]);
      setIsEstimating(false);
    }, 600);
  };

  const handleImportAiItems = async () => {
    for (const item of aiSuggestions) {
      await createMutation.mutateAsync({
        code: item.code,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unit_price,
      });
    }
    setShowAiModal(false);
    setAiSuggestions([]);
  };

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
            onClick={() => {
              setShowAiModal(true);
              if (aiSuggestions.length === 0) handleRunAiEstimator();
            }}
            className="te-btn-primary text-xs flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 border-none shadow-lg shadow-purple-900/30 hover:from-purple-500 hover:to-indigo-500"
          >
            🤖 AI Quantity Estimator
          </button>
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

      {/* AI Estimator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="te-panel w-full max-w-3xl p-6 shadow-2xl border border-purple-500/30 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">AI BOQ Cost & Quantity Estimator</h3>
                  <p className="text-xs text-slate-400">Parametric cost estimation based on architectural & structural metrics</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-5 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="te-label">Building Archetype</label>
                <select
                  value={aiArchetype}
                  onChange={(e) => setAiArchetype(e.target.value as 'commercial' | 'residential' | 'warehouse')}
                  className="te-input text-xs"
                >
                  <option value="commercial">Commercial Office</option>
                  <option value="residential">Residential High-Rise</option>
                  <option value="warehouse">Logistics / Industrial</option>
                </select>
              </div>
              <div>
                <label className="te-label">Gross Floor Area (GFA m²)</label>
                <input
                  type="number"
                  value={aiGfa}
                  onChange={(e) => setAiGfa(e.target.value)}
                  className="te-input text-xs font-mono"
                  placeholder="3500"
                />
              </div>
              <div>
                <label className="te-label">Storey Count</label>
                <input
                  type="number"
                  value={aiFloors}
                  onChange={(e) => setAiFloors(e.target.value)}
                  className="te-input text-xs font-mono"
                  placeholder="6"
                />
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                AI Generated Bill of Quantities Breakdown
              </h4>
              <button
                type="button"
                onClick={handleRunAiEstimator}
                disabled={isEstimating}
                className="te-btn-secondary text-xs px-3 py-1 text-purple-300 border-purple-500/30 hover:bg-purple-500/10"
              >
                {isEstimating ? 'Recalculating…' : '🔄 Recalculate'}
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800 mb-5">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Item Description</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 text-right">Est. Quantity</th>
                    <th className="px-3 py-2 text-right">Rate ({currency})</th>
                    <th className="px-3 py-2 text-right font-bold">Total ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {aiSuggestions.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 font-mono">
                      <td className="px-3 py-2 text-purple-400">{item.code}</td>
                      <td className="px-3 py-2 text-slate-200 font-sans">{item.name}</td>
                      <td className="px-3 py-2 text-slate-400">{item.unit}</td>
                      <td className="px-3 py-2 text-right text-slate-300">{item.quantity.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-slate-400">{formatMoney(item.unit_price, currency)}</td>
                      <td className="px-3 py-2 text-right text-emerald-400 font-bold">
                        {formatMoney(item.quantity * item.unit_price, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 font-bold border-t border-slate-700">
                    <td colSpan={5} className="px-3 py-2.5 text-right text-slate-300">Total Estimated Budget:</td>
                    <td className="px-3 py-2.5 text-right text-emerald-400 font-mono">
                      {formatMoney(
                        aiSuggestions.reduce((acc, i) => acc + i.quantity * i.unit_price, 0),
                        currency
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="te-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportAiItems}
                disabled={aiSuggestions.length === 0}
                className="te-btn-primary text-xs flex items-center gap-1.5"
              >
                📥 Import All Items into Project BOQ
              </button>
            </div>
          </div>
        </div>
      )}

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
