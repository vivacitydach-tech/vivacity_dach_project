import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private serialize(company: {
    id: string;
    name: string;
    country: string;
    currency: string;
    timezone: string;
    locale: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: company.id,
      name: company.name,
      country: company.country,
      currency: company.currency,
      timezone: company.timezone,
      locale: company.locale,
      created_at: company.createdAt,
      updated_at: company.updatedAt,
    };
  }

  async getCurrent(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Resource not found');
    return this.serialize(company);
  }

  async updateCurrent(
    companyId: string,
    userId: string,
    dto: UpdateCompanyDto,
  ) {
    const existing = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!existing) throw new NotFoundException('Resource not found');

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        name: dto.name,
        country: dto.country,
        currency: dto.currency,
        timezone: dto.timezone,
        locale: dto.locale,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'company.update',
      entityType: 'company',
      entityId: companyId,
    });

    return this.serialize(company);
  }
}
