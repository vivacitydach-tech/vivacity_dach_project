import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DependencyType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ActivityDependencyDto,
  CreateActivityDto,
  ReplaceDependenciesDto,
  UpdateActivityDto,
} from './dto/activity.dto';

@Injectable()
export class ScheduleService {
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

  private serialize(a: {
    id: string;
    projectId: string;
    code: string;
    name: string;
    startDate: Date | null;
    endDate: Date | null;
    baselineStart: Date | null;
    baselineEnd: Date | null;
    actualStart: Date | null;
    actualEnd: Date | null;
    percentComplete: Prisma.Decimal;
    pv: Prisma.Decimal;
    ev: Prisma.Decimal;
    ac: Prisma.Decimal;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: a.id,
      project_id: a.projectId,
      code: a.code,
      name: a.name,
      start_date: a.startDate,
      end_date: a.endDate,
      baseline_start: a.baselineStart,
      baseline_end: a.baselineEnd,
      actual_start: a.actualStart,
      actual_end: a.actualEnd,
      percent_complete: a.percentComplete.toString(),
      pv: a.pv.toString(),
      ev: a.ev.toString(),
      ac: a.ac.toString(),
      created_at: a.createdAt,
      updated_at: a.updatedAt,
    };
  }

  private serializeDependency(d: {
    id: string;
    projectId: string;
    predecessorId: string;
    successorId: string;
    type: string;
    lagDays: number;
    createdAt: Date;
  }) {
    return {
      id: d.id,
      project_id: d.projectId,
      predecessor_id: d.predecessorId,
      successor_id: d.successorId,
      type: d.type,
      lag_days: d.lagDays,
      created_at: d.createdAt,
    };
  }

  private optionalDate(value: string | undefined | null) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return new Date(value);
  }

  async list(companyId: string, projectId: string) {
    await this.assertProject(companyId, projectId);
    const rows = await this.prisma.activity.findMany({
      where: { projectId },
      orderBy: { code: 'asc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async create(
    companyId: string,
    userId: string,
    projectId: string,
    dto: CreateActivityDto,
  ) {
    await this.assertProject(companyId, projectId);
    const row = await this.prisma.activity.create({
      data: {
        projectId,
        code: dto.code,
        name: dto.name,
        startDate: dto.start_date ? new Date(dto.start_date) : null,
        endDate: dto.end_date ? new Date(dto.end_date) : null,
        baselineStart: dto.baseline_start
          ? new Date(dto.baseline_start)
          : null,
        baselineEnd: dto.baseline_end ? new Date(dto.baseline_end) : null,
        actualStart: dto.actual_start ? new Date(dto.actual_start) : null,
        actualEnd: dto.actual_end ? new Date(dto.actual_end) : null,
        percentComplete: new Prisma.Decimal(dto.percent_complete ?? 0),
        pv: new Prisma.Decimal(dto.pv ?? 0),
        ev: new Prisma.Decimal(dto.ev ?? 0),
        ac: new Prisma.Decimal(dto.ac ?? 0),
      },
    });
    await this.audit.write({
      companyId,
      userId,
      action: 'activity.create',
      entityType: 'activity',
      entityId: row.id,
    });
    return this.serialize(row);
  }

  async update(
    companyId: string,
    userId: string,
    projectId: string,
    activityId: string,
    dto: UpdateActivityDto,
  ) {
    await this.assertProject(companyId, projectId);
    const existing = await this.prisma.activity.findFirst({
      where: { id: activityId, projectId },
    });
    if (!existing) throw new NotFoundException('Resource not found');

    const row = await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        name: dto.name,
        startDate: this.optionalDate(dto.start_date),
        endDate: this.optionalDate(dto.end_date),
        baselineStart: this.optionalDate(dto.baseline_start),
        baselineEnd: this.optionalDate(dto.baseline_end),
        actualStart: this.optionalDate(dto.actual_start),
        actualEnd: this.optionalDate(dto.actual_end),
        percentComplete:
          dto.percent_complete !== undefined
            ? new Prisma.Decimal(dto.percent_complete)
            : undefined,
        pv: dto.pv !== undefined ? new Prisma.Decimal(dto.pv) : undefined,
        ev: dto.ev !== undefined ? new Prisma.Decimal(dto.ev) : undefined,
        ac: dto.ac !== undefined ? new Prisma.Decimal(dto.ac) : undefined,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'activity.update',
      entityType: 'activity',
      entityId: activityId,
    });

    return this.serialize(row);
  }

  async listDependencies(companyId: string, projectId: string) {
    await this.assertProject(companyId, projectId);
    const rows = await this.prisma.activityDependency.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.serializeDependency(r));
  }

  private async assertActivitiesInProject(
    projectId: string,
    predecessorId: string,
    successorId: string,
  ) {
    if (predecessorId === successorId) {
      throw new BadRequestException('Predecessor and successor must differ');
    }
    const activities = await this.prisma.activity.findMany({
      where: {
        projectId,
        id: { in: [predecessorId, successorId] },
      },
      select: { id: true },
    });
    if (activities.length !== 2) {
      throw new NotFoundException('Resource not found');
    }
  }

  async createDependency(
    companyId: string,
    userId: string,
    projectId: string,
    dto: ActivityDependencyDto,
  ) {
    await this.assertProject(companyId, projectId);
    await this.assertActivitiesInProject(
      projectId,
      dto.predecessor_id,
      dto.successor_id,
    );

    const row = await this.prisma.activityDependency.create({
      data: {
        projectId,
        predecessorId: dto.predecessor_id,
        successorId: dto.successor_id,
        type: dto.type ?? DependencyType.FS,
        lagDays: dto.lag_days ?? 0,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'activity_dependency.create',
      entityType: 'activity_dependency',
      entityId: row.id,
    });

    return this.serializeDependency(row);
  }

  async replaceDependencies(
    companyId: string,
    userId: string,
    projectId: string,
    dto: ReplaceDependenciesDto,
  ) {
    await this.assertProject(companyId, projectId);

    for (const dep of dto.dependencies) {
      await this.assertActivitiesInProject(
        projectId,
        dep.predecessor_id,
        dep.successor_id,
      );
    }

    const rows = await this.prisma.$transaction(async (tx) => {
      await tx.activityDependency.deleteMany({ where: { projectId } });
      if (!dto.dependencies.length) return [];
      await tx.activityDependency.createMany({
        data: dto.dependencies.map((dep) => ({
          projectId,
          predecessorId: dep.predecessor_id,
          successorId: dep.successor_id,
          type: dep.type ?? DependencyType.FS,
          lagDays: dep.lag_days ?? 0,
        })),
      });
      return tx.activityDependency.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      });
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'activity_dependency.replace',
      entityType: 'activity_dependency',
      entityId: projectId,
    });

    return rows.map((r) => this.serializeDependency(r));
  }
}
