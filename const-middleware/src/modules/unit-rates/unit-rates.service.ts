import { Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUnitRateDto, UpdateUnitRateDto } from './dto/unit-rate.dto';

const MASKED_ROLES: MembershipRole[] = [
  MembershipRole.site_manager,
  MembershipRole.subcontractor,
  MembershipRole.client,
];

@Injectable()
export class UnitRatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private serialize(
    row: {
      id: string;
      companyId: string;
      code: string;
      description: string;
      unit: string;
      unitPrice: Prisma.Decimal;
      currency: string;
      createdAt: Date;
      updatedAt: Date;
    },
    role: string,
  ) {
    const mask = MASKED_ROLES.includes(role as MembershipRole);
    return {
      id: row.id,
      company_id: row.companyId,
      code: row.code,
      description: row.description,
      unit: row.unit,
      unit_price: mask ? null : row.unitPrice.toString(),
      currency: row.currency,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  async list(companyId: string, role: string) {
    const rows = await this.prisma.unitRate.findMany({
      where: { companyId },
      orderBy: { code: 'asc' },
    });
    return rows.map((r) => this.serialize(r, role));
  }

  async create(
    companyId: string,
    userId: string,
    role: string,
    dto: CreateUnitRateDto,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Resource not found');

    const row = await this.prisma.unitRate.create({
      data: {
        companyId,
        code: dto.code,
        description: dto.description,
        unit: dto.unit,
        unitPrice: new Prisma.Decimal(dto.unit_price),
        currency: dto.currency ?? company.currency,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'unit_rate.create',
      entityType: 'unit_rate',
      entityId: row.id,
    });

    return this.serialize(row, role);
  }

  async update(
    companyId: string,
    userId: string,
    role: string,
    id: string,
    dto: UpdateUnitRateDto,
  ) {
    const existing = await this.prisma.unitRate.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Resource not found');

    const row = await this.prisma.unitRate.update({
      where: { id },
      data: {
        code: dto.code,
        description: dto.description,
        unit: dto.unit,
        unitPrice:
          dto.unit_price !== undefined
            ? new Prisma.Decimal(dto.unit_price)
            : undefined,
        currency: dto.currency,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'unit_rate.update',
      entityType: 'unit_rate',
      entityId: id,
    });

    return this.serialize(row, role);
  }

  async remove(companyId: string, userId: string, id: string) {
    const existing = await this.prisma.unitRate.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Resource not found');

    await this.prisma.unitRate.delete({ where: { id } });

    await this.audit.write({
      companyId,
      userId,
      action: 'unit_rate.delete',
      entityType: 'unit_rate',
      entityId: id,
    });

    return { ok: true };
  }
}
