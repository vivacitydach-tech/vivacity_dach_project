import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { TenancyGuard } from './tenancy.guard';
import { ProjectsService } from '../projects/projects.service';

describe('tenant isolation (§14)', () => {
  it('TenancyGuard returns NOT_FOUND (not FORBIDDEN) for non-members', async () => {
    const prisma = {
      membership: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const guard = new TenancyGuard(prisma as never);

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-a' },
          headers: { 'x-company-id': 'company-b' },
        }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    try {
      await guard.canActivate(ctx);
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException);
      expect((err as NotFoundException).getStatus()).toBe(404);
      expect((err as NotFoundException).message).toBe('Resource not found');
    }
  });

  it('ProjectsService.get hides other-company projects as NOT_FOUND', async () => {
    const prisma = {
      project: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new ProjectsService(
      prisma as never,
      { write: jest.fn() } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.get('company-a', 'project-owned-by-b'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'project-owned-by-b', companyId: 'company-a' },
    });
  });
});
