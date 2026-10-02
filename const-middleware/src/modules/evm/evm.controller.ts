import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { EvmService } from './evm.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenancyGuard, TenantContext } from '../tenancy/tenancy.guard';
import { CurrentTenancy, CurrentUser } from '../tenancy/tenancy.decorators';

@Controller('projects/:projectId/evm')
@UseGuards(JwtAuthGuard, TenancyGuard)
export class EvmController {
  constructor(private readonly evm: EvmService) {}

  @Get()
  report(
    @CurrentTenancy() tenancy: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.evm.getReport(tenancy.companyId, projectId);
  }

  @Get('alerts')
  alerts(
    @CurrentTenancy() tenancy: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.evm.getAlerts(tenancy.companyId, projectId);
  }

  @Post('refresh')
  async refresh(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() _user: { id: string },
    @Param('projectId') projectId: string,
  ) {
    await this.evm.assertProjectForRefresh(tenancy.companyId, projectId);
    const snap = await this.evm.seedSnapshotFromActivities(projectId);
    return {
      id: snap.id,
      project_id: snap.projectId,
      as_of_date: snap.asOfDate,
      pv: snap.pv.toString(),
      ev: snap.ev.toString(),
      ac: snap.ac.toString(),
      bac: snap.bac.toString(),
      spi: snap.spi?.toString() ?? null,
      cpi: snap.cpi?.toString() ?? null,
      created_at: snap.createdAt,
    };
  }
}
