import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDiaryDto } from './dto/diary.dto';

@Injectable()
export class DiariesService {
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
    authorId: string;
    diaryDate: Date;
    weather: string | null;
    notes: string;
    latitude: Prisma.Decimal | null;
    longitude: Prisma.Decimal | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      project_id: row.projectId,
      author_id: row.authorId,
      diary_date: row.diaryDate,
      weather: row.weather,
      notes: row.notes,
      latitude: row.latitude?.toString() ?? null,
      longitude: row.longitude?.toString() ?? null,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  async list(companyId: string, projectId: string) {
    await this.assertProject(companyId, projectId);
    const rows = await this.prisma.siteDiary.findMany({
      where: { projectId },
      orderBy: { diaryDate: 'desc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async create(
    companyId: string,
    userId: string,
    projectId: string,
    dto: CreateDiaryDto,
  ) {
    await this.assertProject(companyId, projectId);

    const row = await this.prisma.siteDiary.create({
      data: {
        projectId,
        authorId: userId,
        diaryDate: new Date(dto.diary_date),
        weather: dto.weather,
        notes: dto.notes,
        latitude:
          dto.latitude !== undefined
            ? new Prisma.Decimal(dto.latitude)
            : null,
        longitude:
          dto.longitude !== undefined
            ? new Prisma.Decimal(dto.longitude)
            : null,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'site_diary.create',
      entityType: 'site_diary',
      entityId: row.id,
    });

    return this.serialize(row);
  }
}
