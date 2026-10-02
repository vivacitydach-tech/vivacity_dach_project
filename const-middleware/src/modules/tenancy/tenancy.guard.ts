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
      tenancy?: TenantContext;
    }>();

    const companyHeader = req.headers['x-company-id'];
    const companyId = Array.isArray(companyHeader)
      ? companyHeader[0]
      : companyHeader;

    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }

    if (!req.user?.id) {
      throw new NotFoundException('Resource not found');
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
