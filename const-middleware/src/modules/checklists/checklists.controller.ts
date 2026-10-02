import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ChecklistsService } from './checklists.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenancyGuard, TenantContext } from '../tenancy/tenancy.guard';
import { CurrentTenancy, CurrentUser } from '../tenancy/tenancy.decorators';
import {
  ChecklistSignatureDto,
  CreateChecklistDto,
  UpdateChecklistDto,
} from './dto/checklist.dto';

@Controller('projects/:projectId/checklists')
@UseGuards(JwtAuthGuard, TenancyGuard)
export class ChecklistsController {
  constructor(private readonly checklists: ChecklistsService) {}

  @Get()
  list(
    @CurrentTenancy() tenancy: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.checklists.list(tenancy.companyId, projectId);
  }

  @Post()
  create(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() dto: CreateChecklistDto,
  ) {
    return this.checklists.create(tenancy.companyId, user.id, projectId, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChecklistDto,
  ) {
    return this.checklists.update(
      tenancy.companyId,
      user.id,
      projectId,
      id,
      dto,
    );
  }

  @Post(':id/signature')
  addSignature(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: ChecklistSignatureDto,
  ) {
    return this.checklists.addSignature(
      tenancy.companyId,
      user.id,
      projectId,
      id,
      dto,
    );
  }
}
