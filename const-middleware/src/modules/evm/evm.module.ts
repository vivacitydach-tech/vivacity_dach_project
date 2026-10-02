import { Module } from '@nestjs/common';
import { EvmService } from './evm.service';
import { EvmController } from './evm.controller';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [TenancyModule],
  controllers: [EvmController],
  providers: [EvmService],
  exports: [EvmService],
})
export class EvmModule {}
