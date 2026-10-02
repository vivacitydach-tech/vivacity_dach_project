import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PmCorePort } from '../ports/pm-core.port';
import { CircuitBreaker } from '../circuit-breaker';

/**
 * HTTP adapter for OpenProject API v3 style pm-core.
 * Base URL example: http://pm-core.internal:8080 (never public).
 */
@Injectable()
export class HttpPmCoreAdapter implements PmCorePort {
  private readonly logger = new Logger(HttpPmCoreAdapter.name);
  private readonly breaker = new CircuitBreaker(5, 60_000);

  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    return (this.config.get<string>('PM_CORE_BASE_URL') ?? '').replace(
      /\/$/,
      '',
    );
  }

  private token(): string {
    return this.config.get<string>('PM_CORE_API_TOKEN') ?? '';
  }

  private assertBreaker() {
    if (this.breaker.isOpen) {
      throw new Error('PmCore circuit breaker open');
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
      Accept: 'application/hal+json, application/json',
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
        this.logger.warn(`PmCore ${res.status} ${path}`);
        throw new Error(`PmCore upstream error ${res.status}`);
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
    idempotencyKey: string;
    code?: string | null;
  }): Promise<{ externalId: string }> {
    const data = await this.request<{ id?: number | string }>(
      '/api/v3/projects',
      {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          identifier:
            input.code ??
            `p-${input.localProjectId.replace(/-/g, '').slice(0, 12)}`,
        }),
        idempotencyKey: input.idempotencyKey,
      },
    );
    if (data.id == null) throw new Error('PmCore createProject missing id');
    return { externalId: String(data.id) };
  }

  async createWorkPackage(input: {
    localIssueId: string;
    externalProjectId: string;
    title: string;
    type: string;
    priority: string;
    description?: string | null;
    bcfTopic?: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<{ externalId: string; bcfGuid?: string }> {
    const data = await this.request<{
      id?: number | string;
      _embedded?: { customField?: { bcfGuid?: string } };
    }>('/api/v3/work_packages', {
      method: 'POST',
      body: JSON.stringify({
        subject: input.title,
        description: {
          format: 'plain',
          raw: input.description ?? '',
        },
        _links: {
          project: {
            href: `/api/v3/projects/${input.externalProjectId}`,
          },
          type: { title: input.type },
          priority: { title: input.priority },
        },
        customFieldBcf: input.bcfTopic ?? undefined,
      }),
      idempotencyKey: input.idempotencyKey,
    });
    if (data.id == null) throw new Error('PmCore createWorkPackage missing id');
    return {
      externalId: String(data.id),
      bcfGuid: data._embedded?.customField?.bcfGuid,
    };
  }

  async syncIssue(input: {
    projectExternalId: string;
    title: string;
    description?: string | null;
    type: string;
    priority: string;
  }): Promise<{ externalIssueId: string }> {
    const result = await this.createWorkPackage({
      localIssueId: 'sync',
      externalProjectId: input.projectExternalId,
      title: input.title,
      type: input.type,
      priority: input.priority,
      description: input.description,
      idempotencyKey: `issue-sync-${Date.now()}`,
    });
    return { externalIssueId: result.externalId };
  }

  async getProjectProgress(externalProjectId: string) {
    const data = await this.request<{
      _embedded?: {
        elements?: Array<{
          id: number | string;
          percentageDone?: number;
          startDate?: string;
          dueDate?: string;
        }>;
      };
    }>(
      `/api/v3/projects/${encodeURIComponent(externalProjectId)}/work_packages`,
    );
    const elements = data._embedded?.elements ?? [];
    return elements.map((el) => ({
      externalId: String(el.id),
      percentComplete: el.percentageDone ?? 0,
      actualStart: el.startDate,
      actualEnd: el.dueDate,
    }));
  }

  async healthCheck(): Promise<boolean> {
    if (!this.baseUrl()) return false;
    if (this.breaker.isOpen) return false;
    try {
      await this.request('/api/v3');
      return true;
    } catch {
      return false;
    }
  }
}
