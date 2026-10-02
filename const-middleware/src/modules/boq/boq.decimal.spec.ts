import { multiplyQuantity } from './boq.decimal';

describe('boq decimal rounding', () => {
  it('rounds 0.3333 * 10 to 3.33 with ROUND_HALF_UP', () => {
    expect(multiplyQuantity('0.3333', 10, 2)).toBe('3.33');
  });

  it('rounds half up at midpoint', () => {
    expect(multiplyQuantity('1.225', 1, 2)).toBe('1.23');
  });
});
