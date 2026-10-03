import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type TenantContext = {
  companyId: string;
  role: string;
  membershipId: string;
};

@Injectable()
export class TenancyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: { id: string };
      headers: Record<string, string | string[] | undefined>;
      params?: Record<string, string | undefined>;
      tenancy?: TenantContext;
    }>();

    const companyHeader = req.headers['x-company-id'];
    let companyId = Array.isArray(companyHeader)
      ? companyHeader[0]
      : companyHeader;

    if (!req.user?.id) {
      throw new NotFoundException('Resource not found');
    }

    const projectId = req.params?.projectId || req.params?.id;
    if (projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (project) {
        // Verify user is a member of this project's company
        const projectMembership = await this.prisma.membership.findUnique({
          where: {
            companyId_userId: {
              companyId: project.companyId,
              userId: req.user.id,
            },
          },
        });
        if (projectMembership) {
          companyId = project.companyId;
        }
      }
    }

    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: req.user.id,
        },
      },
    });

    if (!membership) {
      // Cross-tenant: hide existence
      throw new NotFoundException('Resource not found');
    }

    req.tenancy = {
      companyId: membership.companyId,
      role: membership.role,
      membershipId: membership.id,
    };

    return true;
  }
}
