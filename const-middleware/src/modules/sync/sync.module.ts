import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { IntegrationsModule } from '../../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
