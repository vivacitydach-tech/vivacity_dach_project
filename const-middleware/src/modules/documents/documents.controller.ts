import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenancyGuard, TenantContext } from '../tenancy/tenancy.guard';
import { CurrentTenancy, CurrentUser } from '../tenancy/tenancy.decorators';
import { CompleteDocumentDto, PresignDocumentDto } from './dto/document.dto';

@Controller('projects/:projectId/documents')
@UseGuards(JwtAuthGuard, TenancyGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(
    @CurrentTenancy() tenancy: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.documents.list(tenancy.companyId, projectId);
  }

  @Post('presign')
  presign(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() dto: PresignDocumentDto,
  ) {
    return this.documents.presign(tenancy.companyId, user.id, projectId, dto);
  }

  @Post(':documentId/complete')
  complete(
    @CurrentTenancy() tenancy: TenantContext,
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Body() dto: CompleteDocumentDto,
  ) {
    return this.documents.complete(
      tenancy.companyId,
      user.id,
      projectId,
      documentId,
      dto,
    );
  }
}
