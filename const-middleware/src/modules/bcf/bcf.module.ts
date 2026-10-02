import { Module } from '@nestjs/common';
import { BcfService } from './bcf.service';
import { BcfController } from './bcf.controller';
import { AuditModule } from '../audit/audit.module';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [AuditModule, TenancyModule],
  controllers: [BcfController],
  providers: [BcfService],
  exports: [BcfService],
})
export class BcfModule {}
