import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBoqItemDto {
  @IsOptional()
  @IsUUID()
  parent_id?: string | null;

  @IsString()
  @MaxLength(64)
  code!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unit_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sort_order?: number;
}

export class PatchBoqItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unit_price?: number;
}
