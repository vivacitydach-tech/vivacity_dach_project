import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BcfService } from './bcf.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenancyGuard, TenantContext } from '../tenancy/tenancy.guard';
import { CurrentTenancy, CurrentUser } from '../tenancy/tenancy.decorators';
import { CreateBcfTopicDto, UpdateBcfTopicDto } from './dto/bcf.dto';

@Controller('projects/:projectId/bcf/topics')
@UseGuards(JwtAuthGuard, TenancyGuard)
export class BcfController {
  constructor(private readonly bcf: BcfService) {}

  @Get()
  list(
    @CurrentTenancy() tenancy: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.bcf.list(tenancy.companyId, projectId);
  }

  @Post()
  create(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() dto: CreateBcfTopicDto,
  ) {
    return this.bcf.create(tenancy.companyId, user.id, projectId, dto);
  }

  @Patch(':topicId')
  update(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('topicId') topicId: string,
    @Body() dto: UpdateBcfTopicDto,
  ) {
    return this.bcf.update(
      tenancy.companyId,
      user.id,
      projectId,
      topicId,
      dto,
    );
  }
}
