import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DependencyType } from '@prisma/client';

export class CreateActivityDto {
  @IsString()
  @MaxLength(64)
  code!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsDateString()
  baseline_start?: string;

  @IsOptional()
  @IsDateString()
  baseline_end?: string;

  @IsOptional()
  @IsDateString()
  actual_start?: string;

  @IsOptional()
  @IsDateString()
  actual_end?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  percent_complete?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pv?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ev?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ac?: number;
}

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsDateString()
  baseline_start?: string;

  @IsOptional()
  @IsDateString()
  baseline_end?: string;

  @IsOptional()
  @IsDateString()
  actual_start?: string;

  @IsOptional()
  @IsDateString()
  actual_end?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  percent_complete?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pv?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ev?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ac?: number;
}

export class ActivityDependencyDto {
  @IsUUID()
  predecessor_id!: string;

  @IsUUID()
  successor_id!: string;

  @IsOptional()
  @IsEnum(DependencyType)
  type?: DependencyType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lag_days?: number;
}

export class ReplaceDependenciesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityDependencyDto)
  dependencies!: ActivityDependencyDto[];
}
