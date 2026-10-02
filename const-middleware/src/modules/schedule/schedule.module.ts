import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { AuditModule } from '../audit/audit.module';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [AuditModule, TenancyModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
