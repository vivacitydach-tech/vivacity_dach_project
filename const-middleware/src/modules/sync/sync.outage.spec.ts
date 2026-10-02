import { NotFoundException } from '@nestjs/common';
import { IssueStatus, SyncStatus } from '@prisma/client';
import { SyncService } from './sync.service';
import { IssuesService } from '../issues/issues.service';

describe('sync / issue outage (§14)', () => {
  it('sync job stays pending/retryable and scrubbed on upstream outage', async () => {
    const job = {
      id: 'job-1',
      projectId: 'proj-1',
      companyId: 'co-1',
      jobType: 'issue.sync',
      status: SyncStatus.pending,
      attempts: 0,
      payload: {
        issueId: 'issue-1',
        title: 'Blocked',
        type: 'defect',
        priority: 'high',
      },
    };

    const updates: unknown[] = [];
    const prisma = {
      syncJob: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue(job),
        update: jest.fn().mockImplementation(({ data }) => {
          updates.push(data);
          return Promise.resolve({ ...job, ...data });
        }),
      },
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'proj-1',
          pmProjectId: 'PM-1',
        }),
      },
      $transaction: jest.fn(),
    };

    const pmCore = {
      syncIssue: jest
        .fn()
        .mockRejectedValue(
          new Error(
            'Mock upstream outage (OpenProject / OpenConstructionERP hidden)',
          ),
        ),
    };

    const sync = new SyncService(prisma as never, pmCore as never);
    await sync.processJobForTest('job-1');

    expect(pmCore.syncIssue).toHaveBeenCalled();
    const lastErrorUpdate = updates.find(
      (u) => u && typeof u === 'object' && 'lastError' in (u as object),
    ) as { lastError?: string; status?: SyncStatus } | undefined;
    expect(lastErrorUpdate?.lastError).toBeTruthy();
    expect(lastErrorUpdate!.lastError!).not.toMatch(
      /OpenProject|OpenConstructionERP|NestJS/i,
    );
    expect(
      updates.some(
        (u) => (u as { status?: SyncStatus }).status === SyncStatus.pending,
      ),
    ).toBe(true);
  });

  it('when MOCK_UPSTREAM_OUTAGE path fails, issue create still leaves pending_sync', async () => {
    // Create path is local-first: status pending_sync + outbox row, even if
    // upstream is down (sync poller will retry later).
    const created = {
      id: 'issue-1',
      projectId: 'proj-b',
      createdById: 'user-a',
      type: 'defect',
      priority: 'high',
      status: IssueStatus.pending_sync,
      title: 'Field defect',
      description: null,
      location: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const prisma = {
      project: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'proj-b', companyId: 'co-a' }),
      },
      $transaction: jest
        .fn()
        .mockImplementation(async (fn: (tx: unknown) => unknown) => {
          const tx = {
            issue: { create: jest.fn().mockResolvedValue(created) },
            syncJob: { create: jest.fn().mockResolvedValue({}) },
          };
          return fn(tx);
        }),
    };
    const audit = { write: jest.fn().mockResolvedValue(undefined) };

    const issues = new IssuesService(prisma as never, audit as never);
    const result = await issues.create('co-a', 'user-a', 'proj-b', {
      type: 'defect' as never,
      priority: 'high' as never,
      title: 'Field defect',
    });

    expect(result.status).toBe(IssueStatus.pending_sync);
  });

  it('cross-tenant project access is NOT_FOUND not FORBIDDEN', async () => {
    const prisma = {
      project: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const { ProjectsService } = await import('../projects/projects.service');
    const service = new ProjectsService(
      prisma as never,
      { write: jest.fn() } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.get('company-a', 'project-of-b'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.get('company-a', 'project-of-b')).rejects.toMatchObject(
      {
        message: 'Resource not found',
      },
    );
  });
});
