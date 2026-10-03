import { PrismaClient, MembershipRole, ProjectStatus, IssueType, IssuePriority, IssueStatus, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import Decimal from 'decimal.js';

function computeSpi(ev: Decimal.Value, pv: Decimal.Value): string | null {
  const d = new Decimal(pv);
  if (d.isZero()) return null;
  return new Decimal(ev).div(d).toFixed(4);
}

function computeCpi(ev: Decimal.Value, ac: Decimal.Value): string | null {
  const d = new Decimal(ac);
  if (d.isZero()) return null;
  return new Decimal(ev).div(d).toFixed(4);
}

const prisma = new PrismaClient();

async function upsertUser(
  email: string,
  name: string,
  passwordHash: string,
) {
  return prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
  });
}

async function main() {
  const passwordHash = await argon2.hash('Password123!', {
    type: argon2.argon2id,
  });

  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {
      name: 'ADO Innenausbau GmbH',
      country: 'DE',
      currency: 'EUR',
      timezone: 'Europe/Berlin',
      locale: 'de',
    },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'ADO Innenausbau GmbH',
      country: 'DE',
      currency: 'EUR',
      timezone: 'Europe/Berlin',
      locale: 'de',
    },
  });

  const companyPk = await prisma.company.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    update: {
      name: 'ADO Innenausbau (Pakistan)',
      country: 'PK',
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      locale: 'en',
    },
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'ADO Innenausbau (Pakistan)',
      country: 'PK',
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      locale: 'en',
    },
  });

  const users = [
    { email: 'admin@target.local', name: 'Admin User', role: MembershipRole.admin },
    { email: 'pm@target.local', name: 'Project Manager', role: MembershipRole.project_manager },
    { email: 'site@target.local', name: 'Site Manager', role: MembershipRole.site_manager },
    { email: 'sub@target.local', name: 'Subcontractor', role: MembershipRole.subcontractor },
    { email: 'client@target.local', name: 'Client User', role: MembershipRole.client },
  ];

  const createdUsers: Record<string, { id: string; role: MembershipRole }> = {};

  for (const u of users) {
    const user = await upsertUser(u.email, u.name, passwordHash);
    await prisma.membership.upsert({
      where: {
        companyId_userId: { companyId: company.id, userId: user.id },
      },
      update: { role: u.role },
      create: {
        companyId: company.id,
        userId: user.id,
        role: u.role,
      },
    });
    createdUsers[u.email] = { id: user.id, role: u.role };
  }

  // Admin also belongs to second company for switcher demo
  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: companyPk.id,
        userId: createdUsers['admin@target.local'].id,
      },
    },
    update: { role: MembershipRole.admin },
    create: {
      companyId: companyPk.id,
      userId: createdUsers['admin@target.local'].id,
      role: MembershipRole.admin,
    },
  });

  const project = await prisma.project.upsert({
    where: { id: '00000000-0000-4000-8000-000000000010' },
    update: {
      name: 'Berlin Logistics Park',
      code: 'BLP-001',
      status: ProjectStatus.active,
      erpProjectId: 'ERP-SEED001',
      pmProjectId: 'PM-SEED001',
    },
    create: {
      id: '00000000-0000-4000-8000-000000000010',
      companyId: company.id,
      name: 'Berlin Logistics Park',
      code: 'BLP-001',
      status: ProjectStatus.active,
      erpProjectId: 'ERP-SEED001',
      pmProjectId: 'PM-SEED001',
    },
  });

  for (const email of Object.keys(createdUsers)) {
    const u = createdUsers[email];
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId: project.id, userId: u.id },
      },
      update: { role: u.role },
      create: {
        projectId: project.id,
        userId: u.id,
        role: u.role,
      },
    });
  }

  await prisma.boqItem.deleteMany({ where: { projectId: project.id } });

  const parent = await prisma.boqItem.create({
    data: {
      projectId: project.id,
      code: '01',
      name: 'Earthworks',
      unit: null,
      quantity: new Prisma.Decimal(0),
      unitPrice: new Prisma.Decimal(0),
      sortOrder: 1,
    },
  });

  await prisma.boqItem.createMany({
    data: [
      {
        projectId: project.id,
        parentId: parent.id,
        code: '01.01',
        name: 'Excavation',
        unit: 'm3',
        quantity: new Prisma.Decimal('0.3333'),
        unitPrice: new Prisma.Decimal('45.00'),
        sortOrder: 1,
      },
      {
        projectId: project.id,
        parentId: parent.id,
        code: '01.02',
        name: 'Backfill',
        unit: 'm3',
        quantity: new Prisma.Decimal('120.0000'),
        unitPrice: new Prisma.Decimal('28.50'),
        sortOrder: 2,
      },
    ],
  });

  await prisma.activity.deleteMany({ where: { projectId: project.id } });
  await prisma.activity.createMany({
    data: [
      {
        projectId: project.id,
        code: 'A1000',
        name: 'Site preparation',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-15'),
        percentComplete: new Prisma.Decimal('80'),
        pv: new Prisma.Decimal('100000'),
        ev: new Prisma.Decimal('90000'),
        ac: new Prisma.Decimal('95000'),
      },
      {
        projectId: project.id,
        code: 'A2000',
        name: 'Structural works',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-06-30'),
        percentComplete: new Prisma.Decimal('35'),
        pv: new Prisma.Decimal('250000'),
        ev: new Prisma.Decimal('200000'),
        ac: new Prisma.Decimal('210000'),
      },
      {
        projectId: project.id,
        code: 'A3000',
        name: 'MEP installation',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-09-30'),
        percentComplete: new Prisma.Decimal('10'),
        pv: new Prisma.Decimal('80000'),
        ev: new Prisma.Decimal('50000'),
        ac: new Prisma.Decimal('55000'),
      },
    ],
  });

  await prisma.issue.deleteMany({ where: { projectId: project.id } });
  const pmUserId = createdUsers['pm@target.local'].id;
  await prisma.issue.createMany({
    data: [
      {
        projectId: project.id,
        createdById: pmUserId,
        type: IssueType.defect,
        priority: IssuePriority.high,
        status: IssueStatus.open,
        title: 'Cracked slab section B2',
        description: 'Hairline cracks observed after pour',
        location: 'Building B / Level 2',
      },
      {
        projectId: project.id,
        createdById: pmUserId,
        type: IssueType.rfi,
        priority: IssuePriority.medium,
        status: IssueStatus.open,
        title: 'Clarification on door hardware schedule',
        description: 'Vendor list incomplete for fire doors',
        location: 'Core A',
      },
    ],
  });

  await prisma.evmSnapshot.deleteMany({ where: { projectId: project.id } });
  const pv = new Decimal(430000);
  const ev = new Decimal(340000);
  const ac = new Decimal(360000);
  const bac = pv;
  const spi = computeSpi(ev, pv);
  const cpi = computeCpi(ev, ac);

  await prisma.evmSnapshot.create({
    data: {
      projectId: project.id,
      asOfDate: new Date('2026-03-31'),
      pv: new Prisma.Decimal(pv.toFixed(4)),
      ev: new Prisma.Decimal(ev.toFixed(4)),
      ac: new Prisma.Decimal(ac.toFixed(4)),
      bac: new Prisma.Decimal(bac.toFixed(4)),
      spi: spi ? new Prisma.Decimal(spi) : null,
      cpi: cpi ? new Prisma.Decimal(cpi) : null,
    },
  });

  // Seed Pakistan project for Company 2
  const projectPk = await prisma.project.upsert({
    where: { id: '00000000-0000-4000-8000-000000000020' },
    update: {
      name: 'Karachi Commercial Complex',
      code: 'KCC-001',
      status: ProjectStatus.active,
      erpProjectId: 'ERP-SEED002',
      pmProjectId: 'PM-SEED002',
    },
    create: {
      id: '00000000-0000-4000-8000-000000000020',
      companyId: companyPk.id,
      name: 'Karachi Commercial Complex',
      code: 'KCC-001',
      status: ProjectStatus.active,
      erpProjectId: 'ERP-SEED002',
      pmProjectId: 'PM-SEED002',
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: projectPk.id, userId: createdUsers['admin@target.local'].id },
    },
    update: { role: MembershipRole.admin },
    create: {
      projectId: projectPk.id,
      userId: createdUsers['admin@target.local'].id,
      role: MembershipRole.admin,
    },
  });

  await prisma.boqItem.deleteMany({ where: { projectId: projectPk.id } });
  const parentPk = await prisma.boqItem.create({
    data: {
      projectId: projectPk.id,
      code: '01',
      name: 'Civil & Structure',
      unit: null,
      quantity: new Prisma.Decimal(0),
      unitPrice: new Prisma.Decimal(0),
      sortOrder: 1,
    },
  });

  await prisma.boqItem.createMany({
    data: [
      {
        projectId: projectPk.id,
        parentId: parentPk.id,
        code: '01.01',
        name: 'Foundation Piling Works',
        unit: 'm',
        quantity: new Prisma.Decimal('450.0000'),
        unitPrice: new Prisma.Decimal('12500.00'),
        sortOrder: 1,
      },
      {
        projectId: projectPk.id,
        parentId: parentPk.id,
        code: '01.02',
        name: 'RCC Superstructure Concrete',
        unit: 'm3',
        quantity: new Prisma.Decimal('850.0000'),
        unitPrice: new Prisma.Decimal('22000.00'),
        sortOrder: 2,
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete:', {
    companyId: company.id,
    projectId: project.id,
    companyPkId: companyPk.id,
    projectPkId: projectPk.id,
    users: users.map((u) => u.email),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
