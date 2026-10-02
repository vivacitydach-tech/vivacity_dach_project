import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DocType } from '@prisma/client';
import { Type } from 'class-transformer';

export class PresignDocumentDto {
  @IsEnum(DocType)
  doc_type!: DocType;

  @IsString()
  @MaxLength(255)
  file_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  mime_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}

export class CompleteDocumentDto {
  @IsString()
  @MaxLength(64)
  sha256!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  size_bytes!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}
