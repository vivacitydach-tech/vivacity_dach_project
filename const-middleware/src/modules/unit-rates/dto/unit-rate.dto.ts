import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUnitRateDto {
  @IsString()
  @MaxLength(64)
  code!: string;

  @IsString()
  @MaxLength(255)
  description!: string;

  @IsString()
  @MaxLength(32)
  unit!: string;

  @Type(() => Number)
  @IsNumber()
  unit_price!: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}

export class UpdateUnitRateDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unit_price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}
