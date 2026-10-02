import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { DiariesService } from './diaries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenancyGuard, TenantContext } from '../tenancy/tenancy.guard';
import { CurrentTenancy, CurrentUser } from '../tenancy/tenancy.decorators';
import { CreateDiaryDto } from './dto/diary.dto';

@Controller('projects/:projectId/diaries')
@UseGuards(JwtAuthGuard, TenancyGuard)
export class DiariesController {
  constructor(private readonly diaries: DiariesService) {}

  @Get()
  list(
    @CurrentTenancy() tenancy: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.diaries.list(tenancy.companyId, projectId);
  }

  @Post()
  create(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() dto: CreateDiaryDto,
  ) {
    return this.diaries.create(tenancy.companyId, user.id, projectId, dto);
  }
}
