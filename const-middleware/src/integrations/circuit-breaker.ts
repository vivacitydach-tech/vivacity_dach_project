export class CircuitBreaker {
  private failures: number[] = [];
  private openUntil = 0;

  constructor(
    private readonly threshold = 5,
    private readonly windowMs = 60_000,
    private readonly coolDownMs = 30_000,
  ) {}

  get isOpen(): boolean {
    if (Date.now() < this.openUntil) return true;
    this.prune();
    return false;
  }

  recordSuccess() {
    this.failures = [];
    this.openUntil = 0;
  }

  recordFailure() {
    const now = Date.now();
    this.failures.push(now);
    this.prune();
    if (this.failures.length >= this.threshold) {
      this.openUntil = now + this.coolDownMs;
    }
  }

  private prune() {
    const cutoff = Date.now() - this.windowMs;
    this.failures = this.failures.filter((t) => t >= cutoff);
  }
}
