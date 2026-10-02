import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChecklistDto {
  @IsString()
  @MaxLength(64)
  template_key!: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  items!: string[];
}

export class ChecklistItemPatchDto {
  @IsUUID()
  id!: string;

  @IsBoolean()
  checked!: boolean;
}

export class UpdateChecklistDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemPatchDto)
  items?: ChecklistItemPatchDto[];

  @IsOptional()
  @IsBoolean()
  complete?: boolean;
}

export class ChecklistSignatureDto {
  @IsString()
  image_data!: string;
}
