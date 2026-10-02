import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { BoqService } from './boq.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenancyGuard, TenantContext } from '../tenancy/tenancy.guard';
import { CurrentTenancy, CurrentUser } from '../tenancy/tenancy.decorators';
import { CreateBoqItemDto, PatchBoqItemDto } from './dto/boq.dto';

@Controller('projects/:projectId/boq')
@UseGuards(JwtAuthGuard, TenancyGuard)
export class BoqController {
  constructor(private readonly boq: BoqService) {}

  @Get()
  tree(
    @CurrentTenancy() tenancy: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.boq.getTree(
      tenancy.companyId,
      projectId,
      tenancy.role as MembershipRole,
    );
  }

  @Post()
  create(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() dto: CreateBoqItemDto,
  ) {
    return this.boq.create(
      tenancy.companyId,
      user.id,
      projectId,
      tenancy.role as MembershipRole,
      dto,
    );
  }

  @Patch(':itemId')
  patch(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchBoqItemDto,
  ) {
    return this.boq.patch(
      tenancy.companyId,
      user.id,
      projectId,
      itemId,
      tenancy.role as MembershipRole,
      dto,
    );
  }

  @Delete(':itemId')
  remove(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.boq.remove(tenancy.companyId, user.id, projectId, itemId);
  }
}
