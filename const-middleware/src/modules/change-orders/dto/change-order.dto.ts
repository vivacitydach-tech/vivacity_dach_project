import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ChangeOrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateChangeOrderDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ChangeOrderStatus)
  status?: ChangeOrderStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  delta_cost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  delta_days?: number;

  @IsOptional()
  @IsUUID()
  issue_id?: string;

  @IsOptional()
  @IsUUID()
  boq_item_id?: string;
}

export class UpdateChangeOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ChangeOrderStatus)
  status?: ChangeOrderStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  delta_cost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  delta_days?: number;

  @IsOptional()
  @IsUUID()
  issue_id?: string | null;

  @IsOptional()
  @IsUUID()
  boq_item_id?: string | null;
}
