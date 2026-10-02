import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CostCorePort } from '../ports/cost-core.port';
import { CircuitBreaker } from '../circuit-breaker';

/**
 * HTTP adapter for OpenConstructionERP-style cost-core.
 * Expects a headless JSON API behind COST_CORE_BASE_URL (never exposed to browsers).
 */
@Injectable()
export class HttpCostCoreAdapter implements CostCorePort {
  private readonly logger = new Logger(HttpCostCoreAdapter.name);
  private readonly breaker = new CircuitBreaker(5, 60_000);

  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    return (this.config.get<string>('COST_CORE_BASE_URL') ?? '').replace(
      /\/$/,
      '',
    );
  }

  private token(): string {
    return this.config.get<string>('COST_CORE_API_TOKEN') ?? '';
  }

  private assertBreaker() {
    if (this.breaker.isOpen) {
      throw new Error('CostCore circuit breaker open');
    }
  }

  private async request<T>(
    path: string,
    init: RequestInit & { idempotencyKey?: string } = {},
  ): Promise<T> {
    this.assertBreaker();
    const url = `${this.baseUrl()}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers as Record<string, string>),
    };
    const token = this.token();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (init.idempotencyKey) {
      headers['Idempotency-Key'] = init.idempotencyKey;
    }

    try {
      const res = await fetch(url, { ...init, headers });
      if (!res.ok) {
        this.breaker.recordFailure();
        const body = await res.text().catch(() => '');
        this.logger.warn(`CostCore ${res.status} ${path}`);
        throw new Error(`CostCore upstream error ${res.status}`);
      }
      this.breaker.recordSuccess();
      if (res.status === 204) return {} as T;
      return (await res.json()) as T;
    } catch (e) {
      this.breaker.recordFailure();
      throw e;
    }
  }

  async createProject(input: {
    localProjectId: string;
    name: string;
    currency: 'EUR' | 'PKR';
    idempotencyKey: string;
    code?: string | null;
  }): Promise<{ externalId: string }> {
    const data = await this.request<{ id?: string; externalId?: string }>(
      '/api/projects',
      {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          currency: input.currency,
          code: input.code,
          local_project_id: input.localProjectId,
        }),
        idempotencyKey: input.idempotencyKey,
      },
    );
    const externalId = data.externalId ?? data.id;
    if (!externalId) throw new Error('CostCore createProject missing id');
    return { externalId };
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
    const data = await this.request<{ id?: string; externalId?: string }>(
      `/api/projects/${encodeURIComponent(externalProjectId)}/boq-items`,
      {
        method: 'POST',
        body: JSON.stringify({
          code: input.code,
          description: input.description,
          quantity: input.quantity,
          unit_price: input.unitPrice,
          currency: input.currency,
        }),
        idempotencyKey: input.idempotencyKey,
      },
    );
    const externalId = data.externalId ?? data.id;
    if (!externalId) throw new Error('CostCore createBoqItem missing id');
    return { externalId };
  }

  async getProjectActualCosts(
    externalProjectId: string,
  ): Promise<{ actualCost: string }> {
    const data = await this.request<{
      actual_cost?: string;
      actualCost?: string;
    }>(`/api/projects/${encodeURIComponent(externalProjectId)}/actual-costs`);
    return {
      actualCost: data.actualCost ?? data.actual_cost ?? '0.00',
    };
  }

  async healthCheck(): Promise<boolean> {
    if (!this.baseUrl()) return false;
    if (this.breaker.isOpen) return false;
    try {
      await this.request('/health', { method: 'GET' });
      return true;
    } catch {
      return false;
    }
  }
}
