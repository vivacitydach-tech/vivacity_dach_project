import { Module } from '@nestjs/common';
import { ChecklistsService } from './checklists.service';
import { ChecklistsController } from './checklists.controller';
import { AuditModule } from '../audit/audit.module';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [AuditModule, TenancyModule],
  controllers: [ChecklistsController],
  providers: [ChecklistsService],
  exports: [ChecklistsService],
})
export class ChecklistsModule {}
