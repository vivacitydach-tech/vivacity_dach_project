import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { computeCpi, computeSpi } from './evm.math';

const ALERT_THRESHOLD = 0.85;
const SNAPSHOT_INTERVAL_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class EvmService implements OnModuleInit {
  private readonly logger = new Logger(EvmService.name);
  private intervalHandle?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.intervalHandle = setInterval(() => {
      void this.runScheduledSnapshots();
    }, SNAPSHOT_INTERVAL_MS);
  }

  private async runScheduledSnapshots() {
    try {
      const projects = await this.prisma.project.findMany({
        where: { status: ProjectStatus.active },
        select: { id: true },
      });
      for (const project of projects) {
        try {
          await this.seedSnapshotFromActivities(project.id);
        } catch (err) {
          this.logger.warn(
            `EVM snapshot failed for project ${project.id}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(
        `EVM scheduled snapshot sweep failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async assertProject(companyId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId },
    });
    if (!project) throw new NotFoundException('Resource not found');
    return project;
  }

  /** Public alias used by refresh endpoint */
  async assertProjectForRefresh(companyId: string, projectId: string) {
    return this.assertProject(companyId, projectId);
  }

  private serializeSnapshot(s: {
    id: string;
    projectId: string;
    asOfDate: Date;
    pv: Prisma.Decimal;
    ev: Prisma.Decimal;
    ac: Prisma.Decimal;
    bac: Prisma.Decimal;
    spi: Prisma.Decimal | null;
    cpi: Prisma.Decimal | null;
    createdAt: Date;
  }) {
    return {
      id: s.id,
      project_id: s.projectId,
      as_of_date: s.asOfDate,
      pv: s.pv.toString(),
      ev: s.ev.toString(),
      ac: s.ac.toString(),
      bac: s.bac.toString(),
      spi: s.spi?.toString() ?? null,
      cpi: s.cpi?.toString() ?? null,
      created_at: s.createdAt,
    };
  }

  async getReport(companyId: string, projectId: string) {
    await this.assertProject(companyId, projectId);
    const snapshots = await this.prisma.evmSnapshot.findMany({
      where: { projectId },
      orderBy: { asOfDate: 'desc' },
    });

    return snapshots.map((s) => this.serializeSnapshot(s));
  }

  async getAlerts(companyId: string, projectId: string) {
    await this.assertProject(companyId, projectId);
    const latest = await this.prisma.evmSnapshot.findFirst({
      where: { projectId },
      orderBy: [{ asOfDate: 'desc' }, { createdAt: 'desc' }],
    });

    if (!latest) {
      return {
        snapshot: null,
        alerts: {
          spi_alert: false,
          cpi_alert: false,
        },
      };
    }

    const spi = latest.spi !== null ? Number(latest.spi.toString()) : null;
    const cpi = latest.cpi !== null ? Number(latest.cpi.toString()) : null;

    return {
      snapshot: this.serializeSnapshot(latest),
      alerts: {
        spi_alert: spi !== null && spi < ALERT_THRESHOLD,
        cpi_alert: cpi !== null && cpi < ALERT_THRESHOLD,
      },
    };
  }

  async seedSnapshotFromActivities(projectId: string, asOfDate = new Date()) {
    const activities = await this.prisma.activity.findMany({
      where: { projectId },
    });

    const zero = new Prisma.Decimal(0);
    const pv = activities.reduce((a, x) => a.add(x.pv), zero);
    // Derive EV from progress × PV when activity EV is zero / unset
    const ev = activities.reduce((a, x) => {
      const stored = x.ev;
      const pct = Number(x.percentComplete.toString()) / 100;
      const derived = x.pv.mul(new Prisma.Decimal(pct));
      const use =
        stored.equals(0) && !x.pv.equals(0) ? derived : stored;
      return a.add(use);
    }, zero);
    const ac = activities.reduce((a, x) => a.add(x.ac), zero);
    const bac = pv;

    const spi = computeSpi(ev, pv);
    const cpi = computeCpi(ev, ac);

    return this.prisma.evmSnapshot.create({
      data: {
        projectId,
        asOfDate,
        pv,
        ev,
        ac,
        bac,
        spi: spi === null ? null : new Prisma.Decimal(spi),
        cpi: cpi === null ? null : new Prisma.Decimal(cpi),
      },
    });
  }
}
