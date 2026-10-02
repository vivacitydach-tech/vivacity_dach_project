import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDiaryDto {
  @IsDateString()
  diary_date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  weather?: string;

  @IsString()
  notes!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}
