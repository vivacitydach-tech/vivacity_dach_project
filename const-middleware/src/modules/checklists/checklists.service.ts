import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ChecklistSignatureDto,
  CreateChecklistDto,
  UpdateChecklistDto,
} from './dto/checklist.dto';

@Injectable()
export class ChecklistsService {
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

  private serialize(
    row: {
      id: string;
      projectId: string;
      createdById: string;
      templateKey: string;
      title: string;
      completedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      items?: {
        id: string;
        label: string;
        checked: boolean;
        sortOrder: number;
      }[];
      signatures?: {
        id: string;
        userId: string;
        signedAt: Date;
      }[];
    },
  ) {
    return {
      id: row.id,
      project_id: row.projectId,
      created_by_id: row.createdById,
      template_key: row.templateKey,
      title: row.title,
      completed_at: row.completedAt,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      items: (row.items ?? []).map((i) => ({
        id: i.id,
        label: i.label,
        checked: i.checked,
        sort_order: i.sortOrder,
      })),
      signatures: (row.signatures ?? []).map((s) => ({
        id: s.id,
        user_id: s.userId,
        signed_at: s.signedAt,
      })),
    };
  }

  async list(companyId: string, projectId: string) {
    await this.assertProject(companyId, projectId);
    const rows = await this.prisma.checklist.findMany({
      where: { projectId },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        signatures: { orderBy: { signedAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async create(
    companyId: string,
    userId: string,
    projectId: string,
    dto: CreateChecklistDto,
  ) {
    await this.assertProject(companyId, projectId);

    const row = await this.prisma.checklist.create({
      data: {
        projectId,
        createdById: userId,
        templateKey: dto.template_key,
        title: dto.title,
        items: {
          create: dto.items.map((label, index) => ({
            label,
            sortOrder: index,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        signatures: true,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'checklist.create',
      entityType: 'checklist',
      entityId: row.id,
    });

    return this.serialize(row);
  }

  async update(
    companyId: string,
    userId: string,
    projectId: string,
    id: string,
    dto: UpdateChecklistDto,
  ) {
    await this.assertProject(companyId, projectId);
    const existing = await this.prisma.checklist.findFirst({
      where: { id, projectId },
    });
    if (!existing) throw new NotFoundException('Resource not found');

    if (dto.items?.length) {
      await this.prisma.$transaction(
        dto.items.map((item) =>
          this.prisma.checklistItem.updateMany({
            where: { id: item.id, checklistId: id },
            data: { checked: item.checked },
          }),
        ),
      );
    }

    const row = await this.prisma.checklist.update({
      where: { id },
      data: {
        completedAt:
          dto.complete === true
            ? new Date()
            : dto.complete === false
              ? null
              : undefined,
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        signatures: { orderBy: { signedAt: 'desc' } },
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'checklist.update',
      entityType: 'checklist',
      entityId: id,
    });

    return this.serialize(row);
  }

  async addSignature(
    companyId: string,
    userId: string,
    projectId: string,
    id: string,
    dto: ChecklistSignatureDto,
  ) {
    await this.assertProject(companyId, projectId);
    const existing = await this.prisma.checklist.findFirst({
      where: { id, projectId },
    });
    if (!existing) throw new NotFoundException('Resource not found');

    const signature = await this.prisma.signature.create({
      data: {
        userId,
        entityType: 'checklist',
        entityId: id,
        checklistId: id,
        imageData: dto.image_data,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'checklist.signature',
      entityType: 'checklist',
      entityId: id,
    });

    return {
      id: signature.id,
      checklist_id: id,
      user_id: signature.userId,
      signed_at: signature.signedAt,
    };
  }
}
