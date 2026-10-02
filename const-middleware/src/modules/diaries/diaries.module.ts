import { Module } from '@nestjs/common';
import { DiariesService } from './diaries.service';
import { DiariesController } from './diaries.controller';
import { AuditModule } from '../audit/audit.module';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [AuditModule, TenancyModule],
  controllers: [DiariesController],
  providers: [DiariesService],
  exports: [DiariesService],
})
export class DiariesModule {}
