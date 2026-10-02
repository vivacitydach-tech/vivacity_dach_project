import {
  Injectable,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { COST_CORE_PORT, CostCorePort } from '../../integrations/ports/cost-core.port';
import { PM_CORE_PORT, PmCorePort } from '../../integrations/ports/pm-core.port';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import {
  recordProvisionFail,
  recordProvisionSuccess,
} from '../../common/telemetry/metrics';
import { scrubStringValue } from '../../common/utils/scrub';

type ProjectSafe = {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  status: ProjectStatus;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(COST_CORE_PORT) private readonly costCore: CostCorePort,
    @Inject(PM_CORE_PORT) private readonly pmCore: PmCorePort,
  ) {}

  private toPublic(p: {
    id: string;
    companyId: string;
    name: string;
    code: string | null;
    status: ProjectStatus;
    createdAt: Date;
    updatedAt: Date;
  }): ProjectSafe {
    return {
      id: p.id,
      company_id: p.companyId,
      name: p.name,
      code: p.code,
      status: p.status,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    };
  }

  async list(companyId: string) {
    const rows = await this.prisma.project.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toPublic(r));
  }

  async get(companyId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, companyId },
    });
    if (!project) throw new NotFoundException('Resource not found');
    return this.toPublic(project);
  }

  async create(companyId: string, userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        companyId,
        name: dto.name,
        code: dto.code,
        status: ProjectStatus.provisioning,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'project.create',
      entityType: 'project',
      entityId: project.id,
      metadata: { name: dto.name },
    });

    // Fire-and-forget provisioning
    void this.provision(project.id, companyId);

    return this.toPublic(project);
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateProjectDto,
  ) {
    const existing = await this.prisma.project.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Resource not found');

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        status: dto.status,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'project.update',
      entityType: 'project',
      entityId: id,
    });

    return this.toPublic(project);
  }

  async remove(companyId: string, userId: string, id: string) {
    const existing = await this.prisma.project.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Resource not found');

    await this.prisma.project.delete({ where: { id } });
    await this.audit.write({
      companyId,
      userId,
      action: 'project.delete',
      entityType: 'project',
      entityId: id,
    });
    return { ok: true };
  }

  async provision(projectId: string, companyId: string) {
    try {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, companyId },
      });
      if (!project || project.status !== ProjectStatus.provisioning) return;

      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });
      const currency = (company?.currency === 'PKR' ? 'PKR' : 'EUR') as
        | 'EUR'
        | 'PKR';
      const idempotencyKey = `provision-${projectId}`;

      const [erp, pm] = await Promise.all([
        this.costCore.createProject({
          localProjectId: projectId,
          name: project.name,
          currency,
          idempotencyKey: `${idempotencyKey}-cost`,
          code: project.code,
        }),
        this.pmCore.createProject({
          localProjectId: projectId,
          name: project.name,
          idempotencyKey: `${idempotencyKey}-pm`,
          code: project.code,
        }),
      ]);

      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          erpProjectId: erp.externalId,
          pmProjectId: pm.externalId,
          status: ProjectStatus.active,
        },
      });

      await this.prisma.externalMapping.createMany({
        data: [
          {
            projectId,
            system: 'cost_core',
            entityType: 'project',
            localId: projectId,
            externalId: erp.externalId,
          },
          {
            projectId,
            system: 'pm_core',
            entityType: 'project',
            localId: projectId,
            externalId: pm.externalId,
          },
        ],
      });
      recordProvisionSuccess();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Provisioning failed for ${projectId}: ${scrubStringValue(raw)}`,
      );
      recordProvisionFail();
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.provisioning_failed },
      });
    }
  }
}
