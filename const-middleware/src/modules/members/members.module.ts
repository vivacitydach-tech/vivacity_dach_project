import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { AuditModule } from '../audit/audit.module';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [AuditModule, TenancyModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
