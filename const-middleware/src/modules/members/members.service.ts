import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AddProjectMemberDto,
  InviteCompanyMemberDto,
} from './dto/member.dto';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async assertProject(companyId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId },
    });
    if (!project) throw new NotFoundException('Resource not found');
    return project;
  }

  async listCompanyMembers(companyId: string) {
    const rows = await this.prisma.membership.findMany({
      where: { companyId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((m) => ({
      id: m.id,
      user_id: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      created_at: m.createdAt,
    }));
  }

  async inviteCompanyMember(
    companyId: string,
    actorId: string,
    dto: InviteCompanyMemberDto,
  ) {
    const email = dto.email.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const password = dto.password ?? 'Password123!';
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      user = await this.prisma.user.create({
        data: {
          email,
          name: dto.name,
          passwordHash,
        },
      });
    }

    const existing = await this.prisma.membership.findUnique({
      where: {
        companyId_userId: { companyId, userId: user.id },
      },
    });
    if (existing) {
      throw new BadRequestException('User is already a company member');
    }

    const membership = await this.prisma.membership.create({
      data: {
        companyId,
        userId: user.id,
        role: dto.role,
      },
    });

    await this.audit.write({
      companyId,
      userId: actorId,
      action: 'membership.invite',
      entityType: 'membership',
      entityId: membership.id,
    });

    return {
      id: membership.id,
      user_id: user.id,
      email: user.email,
      name: user.name,
      role: membership.role,
      created_at: membership.createdAt,
    };
  }

  async listProjectMembers(companyId: string, projectId: string) {
    await this.assertProject(companyId, projectId);
    const rows = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((m) => ({
      id: m.id,
      project_id: m.projectId,
      user_id: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      created_at: m.createdAt,
    }));
  }

  async addProjectMember(
    companyId: string,
    actorId: string,
    projectId: string,
    dto: AddProjectMemberDto,
  ) {
    await this.assertProject(companyId, projectId);
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found — invite them to the company first');

    const companyMembership = await this.prisma.membership.findUnique({
      where: {
        companyId_userId: { companyId, userId: user.id },
      },
    });
    if (!companyMembership) {
      throw new BadRequestException('User must be a company member first');
    }

    const existing = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: user.id },
      },
    });
    if (existing) throw new BadRequestException('User is already a project member');

    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: user.id,
        role: dto.role,
      },
    });

    await this.audit.write({
      companyId,
      userId: actorId,
      action: 'project_member.add',
      entityType: 'project_member',
      entityId: member.id,
    });

    return {
      id: member.id,
      project_id: member.projectId,
      user_id: user.id,
      email: user.email,
      name: user.name,
      role: member.role,
      created_at: member.createdAt,
    };
  }
}
