import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IssuesService } from './issues.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenancyGuard, TenantContext } from '../tenancy/tenancy.guard';
import { CurrentTenancy, CurrentUser } from '../tenancy/tenancy.decorators';
import { CreateIssueDto, UpdateIssueDto } from './dto/issue.dto';

@Controller('projects/:projectId/issues')
@UseGuards(JwtAuthGuard, TenancyGuard)
export class IssuesController {
  constructor(private readonly issues: IssuesService) {}

  @Get()
  list(
    @CurrentTenancy() tenancy: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.issues.list(tenancy.companyId, projectId);
  }

  @Post()
  create(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() dto: CreateIssueDto,
  ) {
    return this.issues.create(tenancy.companyId, user.id, projectId, dto);
  }

  @Patch(':issueId')
  update(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('issueId') issueId: string,
    @Body() dto: UpdateIssueDto,
  ) {
    return this.issues.update(
      tenancy.companyId,
      user.id,
      projectId,
      issueId,
      dto,
    );
  }
}
