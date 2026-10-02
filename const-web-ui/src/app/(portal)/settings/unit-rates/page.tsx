'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui-states';
import { useI18n } from '@/components/i18n-provider';
import { apiDelete, apiGet, apiPost, getErrorMessage } from '@/lib/api';
import { getCurrency } from '@/lib/auth';
import type { CurrencyCode, UnitRate } from '@/lib/types';

export default function UnitRatesPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const defaultCurrency = getCurrency();

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['unit-rates'],
    queryFn: () => apiGet<UnitRate[]>('/unit-rates'),
  });

  const createMutation = useMutation({
    mutationFn: (body: {
      code: string;
      description: string;
      unit: string;
      unit_price: number;
      currency: string;
    }) => apiPost<UnitRate>('/unit-rates', body),
    onSuccess: async () => {
      setCode('');
      setDescription('');
      setUnit('');
      setUnitPrice('');
      setFormError(null);
      await qc.invalidateQueries({ queryKey: ['unit-rates'] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/unit-rates/${id}`),
    onSuccess: async () => {
      setRowError(null);
      await qc.invalidateQueries({ queryKey: ['unit-rates'] });
    },
    onError: (err) => setRowError(getErrorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      code: code.trim(),
      description: description.trim(),
      unit: unit.trim(),
      unit_price: Number(unitPrice),
      currency,
    });
  }

  return (
    <div>
      <PageHeader
        title={t('unitRates')}
        subtitle="Company rate library for BOQ and estimating"
      />

      <form
        onSubmit={onSubmit}
        className="te-panel mb-6 grid gap-3 p-5 md:grid-cols-5"
      >
        <label className="block">
          <span className="te-label">Code</span>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="te-input font-mono"
            placeholder="UR-100"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="te-label">Description</span>
          <input
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="te-input"
            placeholder="Rate description"
          />
        </label>
        <label className="block">
          <span className="te-label">Unit</span>
          <input
            required
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="te-input font-mono"
            placeholder="m²"
          />
        </label>
        <label className="block">
          <span className="te-label">Unit price</span>
          <input
            required
            type="number"
            step="any"
            min={0}
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="te-input font-mono"
          />
        </label>
        <label className="block">
          <span className="te-label">Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="te-input"
          >
            <option value="EUR">EUR</option>
            <option value="PKR">PKR</option>
          </select>
        </label>
        <div className="md:col-span-4">
          {formError ? (
            <p className="mb-2 text-sm text-rose-400">{formError}</p>
          ) : null}
          <button
            type="submit"
            disabled={
              createMutation.isPending ||
              !code.trim() ||
              !description.trim() ||
              !unit.trim() ||
              unitPrice === ''
            }
            className="te-btn-primary"
          >
            {createMutation.isPending ? 'Creating…' : t('create')}
          </button>
        </div>
      </form>

      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : null}
      {query.isSuccess && query.data.length === 0 ? (
        <EmptyState message="No unit rates yet." />
      ) : null}

      {rowError ? (
        <p className="mb-3 text-sm text-rose-400">{rowError}</p>
      ) : null}

      {query.isSuccess && query.data.length > 0 ? (
        <div className="te-panel overflow-hidden">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium">Currency</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {query.data.map((rate) => (
                <tr key={rate.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-xs text-emerald-400">
                    {rate.code}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-100">
                    {rate.description}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {rate.unit}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-200">
                    {rate.unit_price == null ? (
                      <span className="italic text-slate-500">{t('masked')}</span>
                    ) : (
                      rate.unit_price
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {rate.currency}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="te-btn-secondary px-2 py-1 text-xs text-rose-300"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(rate.id)}
                    >
                      Delete
                    </button>
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
