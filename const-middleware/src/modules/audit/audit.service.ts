import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: {
    companyId?: string | null;
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string | null;
  }) {
    return this.prisma.auditEvent.create({
      data: {
        companyId: input.companyId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? undefined,
        ipAddress: input.ipAddress ?? null,
      },
    });
  }
}
