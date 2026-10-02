import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenancyGuard, TenantContext } from '../tenancy/tenancy.guard';
import { CurrentTenancy, CurrentUser } from '../tenancy/tenancy.decorators';
import { UpdateCompanyDto } from './dto/company.dto';

@Controller('companies')
@UseGuards(JwtAuthGuard, TenancyGuard)
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get('current')
  getCurrent(@CurrentTenancy() tenancy: TenantContext) {
    return this.companies.getCurrent(tenancy.companyId);
  }

  @Patch('current')
  updateCurrent(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companies.updateCurrent(tenancy.companyId, user.id, dto);
  }
}
