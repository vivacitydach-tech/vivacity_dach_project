import type { CurrencyCode } from './types';

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** EUR: 1.234.567,89 € — PKR: Rs 1,234,567.89 */
export function formatMoney(
  value: string | number | null | undefined,
  currency: CurrencyCode = 'EUR',
): string {
  const n = toNumber(value);
  if (n === null) return '—';

  if (currency === 'PKR') {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
    return `Rs ${formatted}`;
  }

  const formatted = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${formatted} €`;
}

export function formatNumber(
  value: string | number | null | undefined,
  digits = 2,
): string {
  const n = toNumber(value);
  if (n === null) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function multiplyStrings(
  qty: string | null | undefined,
  price: string | null | undefined,
): number | null {
  const q = toNumber(qty);
  const p = toNumber(price);
  if (q === null || p === null) return null;
  return Math.round(q * p * 100) / 100;
}
