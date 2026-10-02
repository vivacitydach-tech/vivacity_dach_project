import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CompleteDocumentDto, PresignDocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  private async assertProject(companyId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId },
    });
    if (!project) throw new NotFoundException('Resource not found');
    return project;
  }

  async presign(
    companyId: string,
    userId: string,
    projectId: string,
    dto: PresignDocumentDto,
  ) {
    await this.assertProject(companyId, projectId);

    const uploadDir = this.config.get<string>('UPLOAD_DIR') ?? './uploads';
    const relative = join(projectId, `${randomUUID()}-${dto.file_name}`);
    const storagePath = join(uploadDir, relative);
    mkdirSync(join(uploadDir, projectId), { recursive: true });

    const doc = await this.prisma.document.create({
      data: {
        projectId,
        uploadedById: userId,
        docType: dto.doc_type,
        fileName: dto.file_name,
        mimeType: dto.mime_type,
        storagePath,
        latitude:
          dto.latitude !== undefined
            ? new Prisma.Decimal(dto.latitude)
            : null,
        longitude:
          dto.longitude !== undefined
            ? new Prisma.Decimal(dto.longitude)
            : null,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'document.presign',
      entityType: 'document',
      entityId: doc.id,
    });

    return {
      document_id: doc.id,
      upload_url: storagePath,
      method: 'PUT',
      storage_path: storagePath,
    };
  }

  private serialize(doc: {
    id: string;
    projectId: string;
    docType: string;
    fileName: string;
    mimeType: string | null;
    storagePath: string | null;
    sha256: string | null;
    sizeBytes: bigint | null;
    latitude: Prisma.Decimal | null;
    longitude: Prisma.Decimal | null;
    completedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: doc.id,
      project_id: doc.projectId,
      doc_type: doc.docType,
      file_name: doc.fileName,
      mime_type: doc.mimeType,
      storage_path: doc.storagePath,
      sha256: doc.sha256,
      size_bytes: Number(doc.sizeBytes ?? 0n),
      latitude: doc.latitude?.toString() ?? null,
      longitude: doc.longitude?.toString() ?? null,
      completed_at: doc.completedAt,
      created_at: doc.createdAt,
    };
  }

  async list(companyId: string, projectId: string) {
    await this.assertProject(companyId, projectId);
    const rows = await this.prisma.document.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async complete(
    companyId: string,
    userId: string,
    projectId: string,
    documentId: string,
    dto: CompleteDocumentDto,
  ) {
    await this.assertProject(companyId, projectId);
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, projectId },
    });
    if (!doc) throw new NotFoundException('Resource not found');

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        sha256: dto.sha256,
        sizeBytes: BigInt(dto.size_bytes),
        completedAt: new Date(),
        latitude:
          dto.latitude !== undefined
            ? new Prisma.Decimal(dto.latitude)
            : undefined,
        longitude:
          dto.longitude !== undefined
            ? new Prisma.Decimal(dto.longitude)
            : undefined,
      },
    });

    await this.audit.write({
      companyId,
      userId,
      action: 'document.complete',
      entityType: 'document',
      entityId: documentId,
    });

    return this.serialize(updated);
  }
}
