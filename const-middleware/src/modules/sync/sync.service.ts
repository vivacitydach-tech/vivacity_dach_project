import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { IssueStatus, SyncStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PM_CORE_PORT, PmCorePort } from '../../integrations/ports/pm-core.port';
import { recordSyncRetry } from '../../common/telemetry/metrics';
import { scrubStringValue } from '../../common/utils/scrub';

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PM_CORE_PORT) private readonly pmCore: PmCorePort,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.poll();
    }, 3000);
    this.logger.log('Sync outbox polling started (in-process, no Redis)');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async poll() {
    if (this.running) return;
    this.running = true;
    try {
      const jobs = await this.prisma.syncJob.findMany({
        where: {
          status: SyncStatus.pending,
          availableAt: { lte: new Date() },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });

      for (const job of jobs) {
        await this.processJob(job.id);
      }
    } catch (err) {
      this.logger.error(
        `Sync poll error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async processJob(jobId: string) {
    const claimed = await this.prisma.syncJob.updateMany({
      where: { id: jobId, status: SyncStatus.pending },
      data: { status: SyncStatus.processing, attempts: { increment: 1 } },
    });
    if (claimed.count === 0) return;

    const job = await this.prisma.syncJob.findUnique({ where: { id: jobId } });
    if (!job) return;

    try {
      if (job.jobType === 'issue.sync') {
        const payload = job.payload as {
          issueId: string;
          title: string;
          description?: string | null;
          type: string;
          priority: string;
        };

        const project = job.projectId
          ? await this.prisma.project.findUnique({
              where: { id: job.projectId },
            })
          : null;

        const result = await this.pmCore.syncIssue({
          projectExternalId: project?.pmProjectId ?? 'unknown',
          title: payload.title,
          description: payload.description,
          type: payload.type,
          priority: payload.priority,
        });

        await this.prisma.$transaction([
          this.prisma.issue.update({
            where: { id: payload.issueId },
            data: { status: IssueStatus.open },
          }),
          this.prisma.externalMapping.create({
            data: {
              projectId: job.projectId!,
              system: 'pm_core',
              entityType: 'issue',
              localId: payload.issueId,
              externalId: result.externalIssueId,
            },
          }),
          this.prisma.syncJob.update({
            where: { id: jobId },
            data: {
              status: SyncStatus.succeeded,
              processedAt: new Date(),
              lastError: null,
            },
          }),
        ]);
      } else {
        await this.prisma.syncJob.update({
          where: { id: jobId },
          data: {
            status: SyncStatus.succeeded,
            processedAt: new Date(),
          },
        });
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const message = scrubStringValue(raw);
      const attempts = job.attempts + 1;
      await this.prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: attempts >= 5 ? SyncStatus.dead : SyncStatus.failed,
          lastError: message,
          availableAt: new Date(Date.now() + Math.min(attempts, 5) * 5000),
        },
      });
      if (attempts < 5) {
        recordSyncRetry();
        await this.prisma.syncJob.update({
          where: { id: jobId },
          data: { status: SyncStatus.pending },
        });
      }
      this.logger.warn(`Sync job ${jobId} failed: ${message}`);
    }
  }

  /** Exposed for unit tests — process a single outbox job by id. */
  async processJobForTest(jobId: string) {
    return this.processJob(jobId);
  }
}
