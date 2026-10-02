import { Module } from '@nestjs/common';
import { BoqService } from './boq.service';
import { BoqController } from './boq.controller';
import { AuditModule } from '../audit/audit.module';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [AuditModule, TenancyModule],
  controllers: [BoqController],
  providers: [BoqService],
  exports: [BoqService],
})
export class BoqModule {}
