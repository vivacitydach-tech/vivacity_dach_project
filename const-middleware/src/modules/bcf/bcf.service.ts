import { Injectable, NotFoundException } from '@nestjs/common';
import { IssuePriority, IssueStatus, IssueType, SyncStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBcfTopicDto, UpdateBcfTopicDto } from './dto/bcf.dto';

@Injectable()
export class BcfService {
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

  private serialize(row: {
    id: string;
    projectId: string;
    issueId: string | null;
    guid: string;
    title: string;
    topicType: string;
    status: string;
    priority: string;
    description: string | null;
    comments: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      project_id: row.projectId,
      issue_id: row.issueId,
      guid: row.guid,
      title: row.title,
      topic_type: row.topicType,
      status: row.status,
      priority: row.priority,
      description: row.description,
      comments: row.comments,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  async list(companyId: string, projectId: string) {
    await this.assertProject(companyId, projectId);
    const rows = await this.prisma.bcfTopic.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async create(
    companyId: string,
    userId: string,
    projectId: string,
    dto: CreateBcfTopicDto,
  ) {
    await this.assertProject(companyId, projectId);
    const guid = randomUUID();

    const topic = await this.prisma.$transaction(async (tx) => {
      let issueId = dto.issue_id ?? null;

      if (!issueId && dto.link_issue !== false) {
        const issue = await tx.issue.create({
          data: {
            projectId,
            createdById: userId,
            type: IssueType.defect,
            priority: IssuePriority.medium,
            status: IssueStatus.pending_sync,
            title: dto.title,
            description: dto.description,
            bcfGuid: guid,
          },
        });
        issueId = issue.id;

        await tx.syncJob.create({
          data: {
            projectId,
            companyId,
            jobType: 'issue.sync',
            status: SyncStatus.pending,
            payload: {
              issueId: issue.id,
              title: issue.title,
              description: issue.description,
              type: issue.type,
              priority: issue.priority,
              bcf_guid: guid,
            },
          },
        });
      } else if (issueId) {
        const issue = await tx.issue.findFirst({
          where: { id: issueId, projectId },
        });
        if (!issue) throw new NotFoundException('Resource not found');
        await tx.issue.update({
          where: { id: issueId },
          data: { bcfGuid: guid },
        });
      }

      return tx.bcfTopic.create({
        data: {
          projectId,
          issueId,
          guid,
          title: dto.title,
          topicType: dto.topic_type ?? 'Issue',
          status: dto.status ?? 'open',
          priority: dto.priority ?? 'normal',
          description: dto.description,
          comments: dto.comments,
        },
      });
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'bcf.topic.create',
      entityType: 'bcf_topic',
      entityId: topic.id,
    });

    return this.serialize(topic);
  }

  async update(
    companyId: string,
    userId: string,
    projectId: string,
    topicId: string,
    dto: UpdateBcfTopicDto,
  ) {
    await this.assertProject(companyId, projectId);
    const existing = await this.prisma.bcfTopic.findFirst({
      where: { id: topicId, projectId },
    });
    if (!existing) throw new NotFoundException('Resource not found');

    const updated = await this.prisma.bcfTopic.update({
      where: { id: topicId },
      data: {
        title: dto.title,
        topicType: dto.topic_type,
        status: dto.status,
        priority: dto.priority,
        description: dto.description,
        comments: dto.comments,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'bcf.topic.update',
      entityType: 'bcf_topic',
      entityId: topicId,
    });

    return this.serialize(updated);
  }
}
