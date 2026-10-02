import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenancyGuard, TenantContext } from '../tenancy/tenancy.guard';
import { CurrentTenancy, CurrentUser } from '../tenancy/tenancy.decorators';
import {
  AddProjectMemberDto,
  InviteCompanyMemberDto,
} from './dto/member.dto';

@Controller()
@UseGuards(JwtAuthGuard, TenancyGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get('members')
  listCompany(@CurrentTenancy() tenancy: TenantContext) {
    return this.members.listCompanyMembers(tenancy.companyId);
  }

  @Post('members')
  inviteCompany(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Body() dto: InviteCompanyMemberDto,
  ) {
    return this.members.inviteCompanyMember(tenancy.companyId, user.id, dto);
  }

  @Get('projects/:projectId/members')
  listProject(
    @CurrentTenancy() tenancy: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.members.listProjectMembers(tenancy.companyId, projectId);
  }

  @Post('projects/:projectId/members')
  addProject(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.members.addProjectMember(
      tenancy.companyId,
      user.id,
      projectId,
      dto,
    );
  }
}
