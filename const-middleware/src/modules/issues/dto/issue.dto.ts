import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IssuePriority, IssueStatus, IssueType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateIssueDto {
  @IsEnum(IssueType)
  type!: IssueType;

  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  bcf_guid?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cost_impact?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  time_impact_days?: number;
}

export class UpdateIssueDto {
  @IsOptional()
  @IsEnum(IssueType)
  type?: IssueType;

  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority;

  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  bcf_guid?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cost_impact?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  time_impact_days?: number;
}
