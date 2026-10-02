import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenancyGuard } from '../tenancy/tenancy.guard';
import { CurrentTenancy, CurrentUser } from '../tenancy/tenancy.decorators';
import { TenantContext } from '../tenancy/tenancy.guard';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, TenancyGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentTenancy() tenancy: TenantContext) {
    return this.projects.list(tenancy.companyId);
  }

  @Get(':id')
  get(@CurrentTenancy() tenancy: TenantContext, @Param('id') id: string) {
    return this.projects.get(tenancy.companyId, id);
  }

  @Post()
  create(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateProjectDto,
  ) {
    return this.projects.create(tenancy.companyId, user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(tenancy.companyId, user.id, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.projects.remove(tenancy.companyId, user.id, id);
  }
}
