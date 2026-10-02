'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { ErrorState, LoadingState } from '@/components/ui-states';
import { useI18n } from '@/components/i18n-provider';
import { apiGet, apiPatch, getErrorMessage } from '@/lib/api';
import { setCountry, setCurrency } from '@/lib/auth';
import type { Company, CurrencyCode } from '@/lib/types';
import type { Locale as I18nLocale } from '@/lib/i18n';

export default function CompanySettingsPage() {
  const qc = useQueryClient();
  const { t, setLocale } = useI18n();

  const [name, setName] = useState('');
  const [country, setCountryField] = useState('DE');
  const [currency, setCurrencyField] = useState<CurrencyCode>('EUR');
  const [timezone, setTimezone] = useState('Europe/Berlin');
  const [locale, setLocaleField] = useState<'en' | 'de'>('en');
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const query = useQuery({
    queryKey: ['company', 'current'],
    queryFn: () => apiGet<Company>('/companies/current'),
  });

  useEffect(() => {
    if (!query.data) return;
    setName(query.data.name);
    setCountryField(query.data.country);
    setCurrencyField(
      query.data.currency === 'PKR' ? 'PKR' : 'EUR',
    );
    setTimezone(query.data.timezone);
    setLocaleField(query.data.locale === 'de' ? 'de' : 'en');
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: (body: {
      name: string;
      country: string;
      currency: string;
      timezone: string;
      locale: string;
    }) => apiPatch<Company>('/companies/current', body),
    onSuccess: async (data) => {
      setFormError(null);
      setSaved(true);
      setCurrency(data.currency === 'PKR' ? 'PKR' : 'EUR');
      setCountry(data.country);
      if (data.locale === 'en' || data.locale === 'de') {
        setLocale(data.locale as I18nLocale);
      }
      await qc.invalidateQueries({ queryKey: ['company', 'current'] });
    },
    onError: (err) => {
      setSaved(false);
      setFormError(getErrorMessage(err));
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    saveMutation.mutate({
      name: name.trim(),
      country: country.trim().toUpperCase(),
      currency,
      timezone: timezone.trim(),
      locale,
    });
  }

  if (query.isLoading) return <LoadingState label="Loading company…" />;
  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error)}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('company')}
        subtitle="Workspace name, locale, and currency defaults"
      />

      <form onSubmit={onSubmit} className="te-panel grid max-w-2xl gap-4 p-5">
        <label className="block">
          <span className="te-label">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="te-input"
          />
        </label>
        <label className="block">
          <span className="te-label">Country</span>
          <input
            required
            maxLength={2}
            value={country}
            onChange={(e) => setCountryField(e.target.value)}
            className="te-input font-mono uppercase"
            placeholder="DE"
          />
        </label>
        <label className="block">
          <span className="te-label">Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrencyField(e.target.value as CurrencyCode)}
            className="te-input"
          >
            <option value="EUR">EUR</option>
            <option value="PKR">PKR</option>
          </select>
        </label>
        <label className="block">
          <span className="te-label">Timezone</span>
          <input
            required
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="te-input font-mono"
            placeholder="Europe/Berlin"
          />
        </label>
        <label className="block">
          <span className="te-label">Locale</span>
          <select
            value={locale}
            onChange={(e) => setLocaleField(e.target.value as 'en' | 'de')}
            className="te-input"
          >
            <option value="en">en</option>
            <option value="de">de</option>
          </select>
        </label>

        {formError ? (
          <p className="text-sm text-rose-400">{formError}</p>
        ) : null}
        {saved ? (
          <p className="text-sm text-emerald-400">Company settings saved.</p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={saveMutation.isPending || !name.trim()}
            className="te-btn-primary"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
