import { Injectable, NotFoundException } from '@nestjs/common';
import { IssueStatus, Prisma, SyncStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateIssueDto, UpdateIssueDto } from './dto/issue.dto';

@Injectable()
export class IssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async assertProject(companyId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId },
    });
    if (!project) throw new NotFoundException('Resource not found');
    return project;
  }

  private serialize(issue: {
    id: string;
    projectId: string;
    createdById: string;
    type: string;
    priority: string;
    status: string;
    title: string;
    description: string | null;
    location: string | null;
    bcfGuid: string | null;
    costImpact: Prisma.Decimal | null;
    timeImpactDays: Prisma.Decimal | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: issue.id,
      project_id: issue.projectId,
      created_by_id: issue.createdById,
      type: issue.type,
      priority: issue.priority,
      status: issue.status,
      title: issue.title,
      description: issue.description,
      location: issue.location,
      bcf_guid: issue.bcfGuid,
      cost_impact: issue.costImpact?.toString() ?? null,
      time_impact_days: issue.timeImpactDays?.toString() ?? null,
      created_at: issue.createdAt,
      updated_at: issue.updatedAt,
    };
  }

  async list(companyId: string, projectId: string) {
    await this.assertProject(companyId, projectId);
    const rows = await this.prisma.issue.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async create(
    companyId: string,
    userId: string,
    projectId: string,
    dto: CreateIssueDto,
  ) {
    await this.assertProject(companyId, projectId);

    const issue = await this.prisma.$transaction(async (tx) => {
      const created = await tx.issue.create({
        data: {
          projectId,
          createdById: userId,
          type: dto.type,
          priority: dto.priority,
          status: IssueStatus.pending_sync,
          title: dto.title,
          description: dto.description,
          location: dto.location,
          bcfGuid: dto.bcf_guid,
          costImpact:
            dto.cost_impact !== undefined
              ? new Prisma.Decimal(dto.cost_impact)
              : null,
          timeImpactDays:
            dto.time_impact_days !== undefined
              ? new Prisma.Decimal(dto.time_impact_days)
              : null,
        },
      });

      await tx.syncJob.create({
        data: {
          projectId,
          companyId,
          jobType: 'issue.sync',
          status: SyncStatus.pending,
          payload: {
            issueId: created.id,
            title: created.title,
            description: created.description,
            type: created.type,
            priority: created.priority,
          },
        },
      });

      return created;
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'issue.create',
      entityType: 'issue',
      entityId: issue.id,
    });

    return this.serialize(issue);
  }

  async update(
    companyId: string,
    userId: string,
    projectId: string,
    issueId: string,
    dto: UpdateIssueDto,
  ) {
    await this.assertProject(companyId, projectId);
    const existing = await this.prisma.issue.findFirst({
      where: { id: issueId, projectId },
    });
    if (!existing) throw new NotFoundException('Resource not found');

    const updated = await this.prisma.issue.update({
      where: { id: issueId },
      data: {
        type: dto.type,
        priority: dto.priority,
        status: dto.status,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        bcfGuid: dto.bcf_guid,
        costImpact:
          dto.cost_impact !== undefined
            ? new Prisma.Decimal(dto.cost_impact)
            : undefined,
        timeImpactDays:
          dto.time_impact_days !== undefined
            ? new Prisma.Decimal(dto.time_impact_days)
            : undefined,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'issue.update',
      entityType: 'issue',
      entityId: issueId,
    });

    return this.serialize(updated);
  }
}
