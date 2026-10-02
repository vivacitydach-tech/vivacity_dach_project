import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ChangeOrdersService } from './change-orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenancyGuard, TenantContext } from '../tenancy/tenancy.guard';
import { CurrentTenancy, CurrentUser } from '../tenancy/tenancy.decorators';
import {
  CreateChangeOrderDto,
  UpdateChangeOrderDto,
} from './dto/change-order.dto';

@Controller('projects/:projectId/change-orders')
@UseGuards(JwtAuthGuard, TenancyGuard)
export class ChangeOrdersController {
  constructor(private readonly changeOrders: ChangeOrdersService) {}

  @Get()
  list(
    @CurrentTenancy() tenancy: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.changeOrders.list(tenancy.companyId, projectId);
  }

  @Post()
  create(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() dto: CreateChangeOrderDto,
  ) {
    return this.changeOrders.create(
      tenancy.companyId,
      user.id,
      projectId,
      dto,
    );
  }

  @Patch(':id')
  update(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChangeOrderDto,
  ) {
    return this.changeOrders.update(
      tenancy.companyId,
      user.id,
      projectId,
      id,
      dto,
    );
  }
}
