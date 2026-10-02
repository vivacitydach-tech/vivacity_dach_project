import Decimal from 'decimal.js';

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export function multiplyQuantity(
  quantity: string | number | Decimal,
  factor: string | number | Decimal,
  decimalPlaces = 2,
): string {
  return new Decimal(quantity)
    .mul(new Decimal(factor))
    .toFixed(decimalPlaces);
}

export function toDecimalString(
  value: string | number | Decimal,
  decimalPlaces = 4,
): string {
  return new Decimal(value).toFixed(decimalPlaces);
}
