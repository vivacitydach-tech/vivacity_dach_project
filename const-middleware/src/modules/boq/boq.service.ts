import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBoqItemDto, PatchBoqItemDto } from './dto/boq.dto';
import { multiplyQuantity, toDecimalString } from './boq.decimal';

const PRICE_MASKED_ROLES: MembershipRole[] = [
  MembershipRole.site_manager,
  MembershipRole.subcontractor,
  MembershipRole.client,
];

type BoqNode = {
  id: string;
  parent_id: string | null;
  code: string;
  name: string;
  unit: string | null;
  quantity: string;
  unit_price: string | null;
  sort_order: number;
  children: BoqNode[];
};

export type { BoqNode };

@Injectable()
export class BoqService {
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

  async getTree(companyId: string, projectId: string, role: MembershipRole) {
    await this.assertProject(companyId, projectId);
    const items = await this.prisma.boqItem.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    const maskPrice = PRICE_MASKED_ROLES.includes(role);
    const map = new Map<string, BoqNode>();
    const roots: BoqNode[] = [];

    for (const item of items) {
      map.set(item.id, {
        id: item.id,
        parent_id: item.parentId,
        code: item.code,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity.toString(),
        unit_price: maskPrice ? null : item.unitPrice.toString(),
        sort_order: item.sortOrder,
        children: [],
      });
    }

    for (const node of map.values()) {
      if (node.parent_id && map.has(node.parent_id)) {
        map.get(node.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private serializeItem(
    item: {
      id: string;
      parentId: string | null;
      code: string;
      name: string;
      unit: string | null;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      sortOrder: number;
    },
    maskPrice: boolean,
  ) {
    return {
      id: item.id,
      parent_id: item.parentId,
      code: item.code,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity.toString(),
      unit_price: maskPrice ? null : item.unitPrice.toString(),
      sort_order: item.sortOrder,
    };
  }

  async create(
    companyId: string,
    userId: string,
    projectId: string,
    role: MembershipRole,
    dto: CreateBoqItemDto,
  ) {
    await this.assertProject(companyId, projectId);

    if (dto.parent_id) {
      const parent = await this.prisma.boqItem.findFirst({
        where: { id: dto.parent_id, projectId },
      });
      if (!parent) throw new BadRequestException('Parent BOQ item not found');
    }

    const created = await this.prisma.boqItem.create({
      data: {
        projectId,
        parentId: dto.parent_id ?? null,
        code: dto.code,
        name: dto.name,
        unit: dto.unit ?? null,
        quantity: new Prisma.Decimal(
          multiplyQuantity(dto.quantity ?? 0, 1, 4),
        ),
        unitPrice: new Prisma.Decimal(
          toDecimalString(dto.unit_price ?? 0, 4),
        ),
        sortOrder: dto.sort_order ?? 0,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'boq.create',
      entityType: 'boq_item',
      entityId: created.id,
    });

    return this.serializeItem(created, PRICE_MASKED_ROLES.includes(role));
  }

  async remove(
    companyId: string,
    userId: string,
    projectId: string,
    itemId: string,
  ) {
    await this.assertProject(companyId, projectId);
    const item = await this.prisma.boqItem.findFirst({
      where: { id: itemId, projectId },
    });
    if (!item) throw new NotFoundException('Resource not found');

    await this.prisma.boqItem.delete({ where: { id: itemId } });

    await this.audit.write({
      companyId,
      userId,
      action: 'boq.delete',
      entityType: 'boq_item',
      entityId: itemId,
    });

    return { deleted: true, id: itemId };
  }

  async patch(
    companyId: string,
    userId: string,
    projectId: string,
    itemId: string,
    role: MembershipRole,
    dto: PatchBoqItemDto,
  ) {
    await this.assertProject(companyId, projectId);
    const item = await this.prisma.boqItem.findFirst({
      where: { id: itemId, projectId },
    });
    if (!item) throw new NotFoundException('Resource not found');

    const data: Prisma.BoqItemUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.quantity !== undefined) {
      // Apply ROUND_HALF_UP via Decimal when scaling factors appear
      const q = multiplyQuantity(dto.quantity, 1, 4);
      data.quantity = new Prisma.Decimal(q);
    }
    if (dto.unit_price !== undefined && !PRICE_MASKED_ROLES.includes(role)) {
      data.unitPrice = new Prisma.Decimal(toDecimalString(dto.unit_price, 4));
    }

    const updated = await this.prisma.boqItem.update({
      where: { id: itemId },
      data,
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'boq.patch',
      entityType: 'boq_item',
      entityId: itemId,
    });

    return this.serializeItem(updated, PRICE_MASKED_ROLES.includes(role));
  }

  /** Helper used by tests / callers applying factor scaling */
  scaleQuantity(quantity: string | number, factor: string | number) {
    return multiplyQuantity(quantity, factor, 2);
  }
}
