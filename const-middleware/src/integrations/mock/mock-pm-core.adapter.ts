import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PmCorePort } from '../ports/pm-core.port';
import { CircuitBreaker } from '../circuit-breaker';

@Injectable()
export class MockPmCoreAdapter implements PmCorePort {
  private readonly breaker = new CircuitBreaker(5, 60_000);
  private readonly progress = new Map<
    string,
    Array<{
      externalId: string;
      percentComplete: number;
      actualStart?: string;
      actualEnd?: string;
    }>
  >();

  constructor(private readonly config: ConfigService) {}

  private assertAvailable() {
    if (this.config.get<string>('MOCK_UPSTREAM_OUTAGE') === 'true') {
      this.breaker.recordFailure();
      throw new Error('Mock PmCore upstream outage');
    }
    if (this.breaker.isOpen) {
      throw new Error('PmCore circuit breaker open');
    }
  }

  async createProject(input: {
    localProjectId: string;
    name: string;
    idempotencyKey: string;
  }): Promise<{ externalId: string }> {
    this.assertAvailable();
    try {
      const externalId = `PM-${randomUUID().slice(0, 8)}`;
      this.progress.set(externalId, []);
      this.breaker.recordSuccess();
      return { externalId };
    } catch (e) {
      this.breaker.recordFailure();
      throw e;
    }
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
    this.assertAvailable();
    try {
      const externalId = `WP-${randomUUID().slice(0, 8)}`;
      const list = this.progress.get(input.externalProjectId) ?? [];
      list.push({ externalId, percentComplete: 0 });
      this.progress.set(input.externalProjectId, list);
      this.breaker.recordSuccess();
      return {
        externalId,
        bcfGuid: input.bcfTopic ? randomUUID() : undefined,
      };
    } catch (e) {
      this.breaker.recordFailure();
      throw e;
    }
  }

  async syncIssue(input: {
    projectExternalId: string;
    title: string;
    description?: string | null;
    type: string;
    priority: string;
  }): Promise<{ externalIssueId: string }> {
    const result = await this.createWorkPackage({
      localIssueId: randomUUID(),
      externalProjectId: input.projectExternalId,
      title: input.title,
      type: input.type,
      priority: input.priority,
      description: input.description,
      idempotencyKey: `sync-${randomUUID()}`,
    });
    return { externalIssueId: result.externalId };
  }

  async getProjectProgress(externalProjectId: string) {
    this.assertAvailable();
    return this.progress.get(externalProjectId) ?? [];
  }

  async healthCheck(): Promise<boolean> {
    if (this.config.get<string>('MOCK_UPSTREAM_OUTAGE') === 'true') return false;
    return !this.breaker.isOpen;
  }
}
