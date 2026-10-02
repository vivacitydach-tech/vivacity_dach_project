import { Injectable, NotFoundException } from '@nestjs/common';
import { ChangeOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateChangeOrderDto,
  UpdateChangeOrderDto,
} from './dto/change-order.dto';

@Injectable()
export class ChangeOrdersService {
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
    boqItemId: string | null;
    title: string;
    description: string | null;
    status: string;
    deltaCost: Prisma.Decimal;
    deltaDays: Prisma.Decimal;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      project_id: row.projectId,
      issue_id: row.issueId,
      boq_item_id: row.boqItemId,
      title: row.title,
      description: row.description,
      status: row.status,
      delta_cost: row.deltaCost.toString(),
      delta_days: row.deltaDays.toString(),
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  async list(companyId: string, projectId: string) {
    await this.assertProject(companyId, projectId);
    const rows = await this.prisma.changeOrder.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async create(
    companyId: string,
    userId: string,
    projectId: string,
    dto: CreateChangeOrderDto,
  ) {
    await this.assertProject(companyId, projectId);

    if (dto.issue_id) {
      const issue = await this.prisma.issue.findFirst({
        where: { id: dto.issue_id, projectId },
      });
      if (!issue) throw new NotFoundException('Resource not found');
    }
    if (dto.boq_item_id) {
      const item = await this.prisma.boqItem.findFirst({
        where: { id: dto.boq_item_id, projectId },
      });
      if (!item) throw new NotFoundException('Resource not found');
    }

    const row = await this.prisma.changeOrder.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        status: dto.status ?? ChangeOrderStatus.draft,
        deltaCost: new Prisma.Decimal(dto.delta_cost ?? 0),
        deltaDays: new Prisma.Decimal(dto.delta_days ?? 0),
        issueId: dto.issue_id,
        boqItemId: dto.boq_item_id,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'change_order.create',
      entityType: 'change_order',
      entityId: row.id,
    });

    return this.serialize(row);
  }

  async update(
    companyId: string,
    userId: string,
    projectId: string,
    id: string,
    dto: UpdateChangeOrderDto,
  ) {
    await this.assertProject(companyId, projectId);
    const existing = await this.prisma.changeOrder.findFirst({
      where: { id, projectId },
    });
    if (!existing) throw new NotFoundException('Resource not found');

    if (dto.issue_id) {
      const issue = await this.prisma.issue.findFirst({
        where: { id: dto.issue_id, projectId },
      });
      if (!issue) throw new NotFoundException('Resource not found');
    }
    if (dto.boq_item_id) {
      const item = await this.prisma.boqItem.findFirst({
        where: { id: dto.boq_item_id, projectId },
      });
      if (!item) throw new NotFoundException('Resource not found');
    }

    const row = await this.prisma.changeOrder.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        deltaCost:
          dto.delta_cost !== undefined
            ? new Prisma.Decimal(dto.delta_cost)
            : undefined,
        deltaDays:
          dto.delta_days !== undefined
            ? new Prisma.Decimal(dto.delta_days)
            : undefined,
        issueId: dto.issue_id === undefined ? undefined : dto.issue_id,
        boqItemId:
          dto.boq_item_id === undefined ? undefined : dto.boq_item_id,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'change_order.update',
      entityType: 'change_order',
      entityId: id,
    });

    return this.serialize(row);
  }
}
