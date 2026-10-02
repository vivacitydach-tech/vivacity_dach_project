import Decimal from 'decimal.js';

export function computeSpi(ev: Decimal.Value, pv: Decimal.Value): string | null {
  const d = new Decimal(pv);
  if (d.isZero()) return null;
  return new Decimal(ev).div(d).toFixed(4);
}

export function computeCpi(ev: Decimal.Value, ac: Decimal.Value): string | null {
  const d = new Decimal(ac);
  if (d.isZero()) return null;
  return new Decimal(ev).div(d).toFixed(4);
}
