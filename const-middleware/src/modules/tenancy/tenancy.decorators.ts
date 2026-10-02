import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from './tenancy.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user?: { id: string; email: string; name: string } }>();
    return req.user;
  },
);

export const CurrentTenancy = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const req = ctx.switchToHttp().getRequest<{ tenancy: TenantContext }>();
    return req.tenancy;
  },
);
