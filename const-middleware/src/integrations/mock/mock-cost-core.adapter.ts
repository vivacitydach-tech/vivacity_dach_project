import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { CostCorePort } from '../ports/cost-core.port';
import { CircuitBreaker } from '../circuit-breaker';

@Injectable()
export class MockCostCoreAdapter implements CostCorePort {
  private readonly breaker = new CircuitBreaker(5, 60_000);
  private readonly actuals = new Map<string, string>();

  constructor(private readonly config: ConfigService) {}

  private assertAvailable() {
    if (this.config.get<string>('MOCK_UPSTREAM_OUTAGE') === 'true') {
      this.breaker.recordFailure();
      throw new Error('Mock CostCore upstream outage');
    }
    if (this.breaker.isOpen) {
      throw new Error('CostCore circuit breaker open');
    }
  }

  async createProject(input: {
    localProjectId: string;
    name: string;
    currency: 'EUR' | 'PKR';
    idempotencyKey: string;
  }): Promise<{ externalId: string }> {
    this.assertAvailable();
    try {
      const externalId = `ERP-${randomUUID().slice(0, 8)}`;
      this.actuals.set(externalId, '0.00');
      this.breaker.recordSuccess();
      return { externalId };
    } catch (e) {
      this.breaker.recordFailure();
      throw e;
    }
  }

  async createBoqItem(
    externalProjectId: string,
    input: {
      code: string;
      description: string;
      quantity: string;
      unitPrice: string;
      currency: string;
      idempotencyKey: string;
    },
  ): Promise<{ externalId: string }> {
    this.assertAvailable();
    try {
      const externalId = `BOQ-${randomUUID().slice(0, 8)}`;
      const qty = Number(input.quantity);
      const price = Number(input.unitPrice);
      const add = Number.isFinite(qty * price) ? qty * price : 0;
      const prev = Number(this.actuals.get(externalProjectId) ?? '0');
      this.actuals.set(externalProjectId, (prev + add).toFixed(2));
      this.breaker.recordSuccess();
      return { externalId };
    } catch (e) {
      this.breaker.recordFailure();
      throw e;
    }
  }

  async getProjectActualCosts(
    externalProjectId: string,
  ): Promise<{ actualCost: string }> {
    this.assertAvailable();
    return {
      actualCost: this.actuals.get(externalProjectId) ?? '0.00',
    };
  }

  async healthCheck(): Promise<boolean> {
    if (this.config.get<string>('MOCK_UPSTREAM_OUTAGE') === 'true') return false;
    return !this.breaker.isOpen;
  }
}
