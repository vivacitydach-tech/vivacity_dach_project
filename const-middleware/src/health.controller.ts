import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { COST_CORE_PORT, CostCorePort } from './integrations/ports/cost-core.port';
import { PM_CORE_PORT, PmCorePort } from './integrations/ports/pm-core.port';

@Controller('health')
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    @Inject(COST_CORE_PORT) private readonly costCore: CostCorePort,
    @Inject(PM_CORE_PORT) private readonly pmCore: PmCorePort,
  ) {}

  @Get()
  async check() {
    const mode = this.config.get<string>('UPSTREAM_MODE') ?? 'mock';
    const [costOk, pmOk] = await Promise.all([
      this.costCore.healthCheck().catch(() => false),
      this.pmCore.healthCheck().catch(() => false),
    ]);
    return {
      status: 'ok',
      service: 'const-middleware',
      upstream: {
        mode,
        cost_core: costOk ? 'up' : 'down',
        pm_core: pmOk ? 'up' : 'down',
        // Never leak internal hostnames to clients in production responses;
        // only expose whether URLs are configured (boolean).
        cost_core_configured: Boolean(
          this.config.get<string>('COST_CORE_BASE_URL'),
        ),
        pm_core_configured: Boolean(this.config.get<string>('PM_CORE_BASE_URL')),
      },
    };
  }
}
