import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreaker (§14)', () => {
  it('opens after 5 failures inside the window', () => {
    const breaker = new CircuitBreaker(5, 60_000, 30_000);

    expect(breaker.isOpen).toBe(false);

    for (let i = 0; i < 4; i++) {
      breaker.recordFailure();
      expect(breaker.isOpen).toBe(false);
    }

    breaker.recordFailure();
    expect(breaker.isOpen).toBe(true);
  });

  it('closes after success resets the window', () => {
    const breaker = new CircuitBreaker(5, 60_000, 30_000);
    for (let i = 0; i < 5; i++) breaker.recordFailure();
    expect(breaker.isOpen).toBe(true);

    // Cool-down still active — force closed via success
    breaker.recordSuccess();
    expect(breaker.isOpen).toBe(false);
  });
});
