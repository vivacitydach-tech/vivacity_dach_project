import { IsEnum, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { MembershipRole } from '@prisma/client';

export class AddProjectMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(MembershipRole)
  role!: MembershipRole;
}

export class InviteCompanyMemberDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsEnum(MembershipRole)
  role!: MembershipRole;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;
}
