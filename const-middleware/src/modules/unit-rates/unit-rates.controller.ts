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
import { UnitRatesService } from './unit-rates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenancyGuard, TenantContext } from '../tenancy/tenancy.guard';
import { CurrentTenancy, CurrentUser } from '../tenancy/tenancy.decorators';
import { CreateUnitRateDto, UpdateUnitRateDto } from './dto/unit-rate.dto';

@Controller('unit-rates')
@UseGuards(JwtAuthGuard, TenancyGuard)
export class UnitRatesController {
  constructor(private readonly unitRates: UnitRatesService) {}

  @Get()
  list(@CurrentTenancy() tenancy: TenantContext) {
    return this.unitRates.list(tenancy.companyId, tenancy.role);
  }

  @Post()
  create(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateUnitRateDto,
  ) {
    return this.unitRates.create(
      tenancy.companyId,
      user.id,
      tenancy.role,
      dto,
    );
  }

  @Patch(':id')
  update(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateUnitRateDto,
  ) {
    return this.unitRates.update(
      tenancy.companyId,
      user.id,
      tenancy.role,
      id,
      dto,
    );
  }

  @Delete(':id')
  remove(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.unitRates.remove(tenancy.companyId, user.id, id);
  }
}
