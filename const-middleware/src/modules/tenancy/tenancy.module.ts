import { Module } from '@nestjs/common';
import { TenancyGuard } from './tenancy.guard';

@Module({
  providers: [TenancyGuard],
  exports: [TenancyGuard],
})
export class TenancyModule {}
