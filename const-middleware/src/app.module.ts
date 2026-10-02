import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { BoqModule } from './modules/boq/boq.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { IssuesModule } from './modules/issues/issues.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { EvmModule } from './modules/evm/evm.module';
import { AuditModule } from './modules/audit/audit.module';
import { SyncModule } from './modules/sync/sync.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { MembersModule } from './modules/members/members.module';
import { UnitRatesModule } from './modules/unit-rates/unit-rates.module';
import { ChangeOrdersModule } from './modules/change-orders/change-orders.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { DiariesModule } from './modules/diaries/diaries.module';
import { ChecklistsModule } from './modules/checklists/checklists.module';
import { BcfModule } from './modules/bcf/bcf.module';
import { DocsModule } from './modules/docs/docs.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    IntegrationsModule,
    AuditModule,
    AuthModule,
    TenancyModule,
    ProjectsModule,
    BoqModule,
    ScheduleModule,
    IssuesModule,
    DocumentsModule,
    EvmModule,
    SyncModule,
    MembersModule,
    UnitRatesModule,
    ChangeOrdersModule,
    CompaniesModule,
    DiariesModule,
    ChecklistsModule,
    BcfModule,
    DocsModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
