import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBcfTopicDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  topic_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  priority?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsUUID()
  issue_id?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  link_issue?: boolean;
}

export class UpdateBcfTopicDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  topic_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  priority?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  comments?: string;
}
