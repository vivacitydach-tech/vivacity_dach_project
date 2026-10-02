import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { COST_CORE_PORT } from './ports/cost-core.port';
import { PM_CORE_PORT } from './ports/pm-core.port';
import { MockCostCoreAdapter } from './mock/mock-cost-core.adapter';
import { MockPmCoreAdapter } from './mock/mock-pm-core.adapter';
import { HttpCostCoreAdapter } from './http/http-cost-core.adapter';
import { HttpPmCoreAdapter } from './http/http-pm-core.adapter';

function useHttpUpstream(config: ConfigService, which: 'cost' | 'pm') {
  const mode = (config.get<string>('UPSTREAM_MODE') ?? 'mock').toLowerCase();
  if (mode === 'http' || mode === 'hybrid') {
    const url =
      which === 'cost'
        ? config.get<string>('COST_CORE_BASE_URL')
        : config.get<string>('PM_CORE_BASE_URL');
    return Boolean(url && url.trim());
  }
  return false;
}

@Module({
  imports: [ConfigModule],
  providers: [
    MockCostCoreAdapter,
    MockPmCoreAdapter,
    HttpCostCoreAdapter,
    HttpPmCoreAdapter,
    {
      provide: COST_CORE_PORT,
      inject: [
        ConfigService,
        MockCostCoreAdapter,
        HttpCostCoreAdapter,
      ],
      useFactory: (
        config: ConfigService,
        mock: MockCostCoreAdapter,
        http: HttpCostCoreAdapter,
      ) => (useHttpUpstream(config, 'cost') ? http : mock),
    },
    {
      provide: PM_CORE_PORT,
      inject: [ConfigService, MockPmCoreAdapter, HttpPmCoreAdapter],
      useFactory: (
        config: ConfigService,
        mock: MockPmCoreAdapter,
        http: HttpPmCoreAdapter,
      ) => (useHttpUpstream(config, 'pm') ? http : mock),
    },
  ],
  exports: [
    COST_CORE_PORT,
    PM_CORE_PORT,
    MockCostCoreAdapter,
    MockPmCoreAdapter,
    HttpCostCoreAdapter,
    HttpPmCoreAdapter,
  ],
})
export class IntegrationsModule {}
