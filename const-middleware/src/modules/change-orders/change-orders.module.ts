import { Module } from '@nestjs/common';
import { ChangeOrdersService } from './change-orders.service';
import { ChangeOrdersController } from './change-orders.controller';
import { AuditModule } from '../audit/audit.module';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [AuditModule, TenancyModule],
  controllers: [ChangeOrdersController],
  providers: [ChangeOrdersService],
  exports: [ChangeOrdersService],
})
export class ChangeOrdersModule {}
