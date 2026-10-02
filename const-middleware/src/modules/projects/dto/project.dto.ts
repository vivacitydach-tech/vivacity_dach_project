import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
