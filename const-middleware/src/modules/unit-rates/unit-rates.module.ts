import { Module } from '@nestjs/common';
import { UnitRatesService } from './unit-rates.service';
import { UnitRatesController } from './unit-rates.controller';
import { AuditModule } from '../audit/audit.module';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [AuditModule, TenancyModule],
  controllers: [UnitRatesController],
  providers: [UnitRatesService],
  exports: [UnitRatesService],
})
export class UnitRatesModule {}
