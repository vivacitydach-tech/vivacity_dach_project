import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenancyGuard, TenantContext } from '../tenancy/tenancy.guard';
import { CurrentTenancy, CurrentUser } from '../tenancy/tenancy.decorators';
import {
  ActivityDependencyDto,
  CreateActivityDto,
  ReplaceDependenciesDto,
  UpdateActivityDto,
} from './dto/activity.dto';

@Controller('projects/:projectId/activities')
@UseGuards(JwtAuthGuard, TenancyGuard)
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get()
  list(
    @CurrentTenancy() tenancy: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.schedule.list(tenancy.companyId, projectId);
  }

  @Get('dependencies')
  listDependencies(
    @CurrentTenancy() tenancy: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.schedule.listDependencies(tenancy.companyId, projectId);
  }

  @Put('dependencies')
  replaceDependencies(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() dto: ReplaceDependenciesDto,
  ) {
    return this.schedule.replaceDependencies(
      tenancy.companyId,
      user.id,
      projectId,
      dto,
    );
  }

  @Post('dependencies')
  createDependency(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() dto: ActivityDependencyDto,
  ) {
    return this.schedule.createDependency(
      tenancy.companyId,
      user.id,
      projectId,
      dto,
    );
  }

  @Post()
  create(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.schedule.create(tenancy.companyId, user.id, projectId, dto);
  }

  @Patch(':activityId')
  update(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('activityId') activityId: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.schedule.update(
      tenancy.companyId,
      user.id,
      projectId,
      activityId,
      dto,
    );
  }
}
