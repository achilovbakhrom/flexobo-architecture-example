import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsEmail,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CompanyTypeDto {
  LOGISTICS = 'LOGISTICS',
  CARRIER = 'CARRIER',
  FORWARDER = 'FORWARDER',
  SHIPPER = 'SHIPPER',
}

export enum CompanyStatusDto {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum CompanyMemberRoleDto {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export class CreateCompanyDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: CompanyTypeDto, description: 'Company type' })
  @IsEnum(CompanyTypeDto)
  type!: CompanyTypeDto;

  @ApiPropertyOptional({ description: 'Company description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Company logo URL' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ description: 'Company phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Company email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Company address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Country code' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Tax identification number' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ description: 'Company website' })
  @IsOptional()
  @IsString()
  website?: string;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Company description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Company logo URL' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ description: 'Company phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Company email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Company address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Country code' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Tax identification number' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ description: 'Company website' })
  @IsOptional()
  @IsString()
  website?: string;
}

export class VerifyCompanyDto {
  @ApiPropertyOptional({ description: 'Verification notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectCompanyDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  reason!: string;
}

export class SuspendCompanyDto {
  @ApiProperty({ description: 'Suspension reason' })
  @IsString()
  reason!: string;
}

export class AddCompanyMemberDto {
  @ApiProperty({ description: 'User ID to add as member' })
  @IsString()
  userId!: string;

  @ApiProperty({
    enum: CompanyMemberRoleDto,
    default: CompanyMemberRoleDto.MEMBER,
    description: 'Member role (ADMIN or MEMBER, cannot add OWNER)',
  })
  @IsEnum(CompanyMemberRoleDto)
  role!: CompanyMemberRoleDto;
}

export class UpdateCompanyMemberDto {
  @ApiProperty({
    enum: CompanyMemberRoleDto,
    description: 'New member role (ADMIN or MEMBER)',
  })
  @IsEnum(CompanyMemberRoleDto)
  role!: CompanyMemberRoleDto;
}

export class ListCompaniesQueryDto {
  @ApiPropertyOptional({ enum: CompanyStatusDto, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(CompanyStatusDto)
  status?: CompanyStatusDto;

  @ApiPropertyOptional({ enum: CompanyTypeDto, description: 'Filter by type' })
  @IsOptional()
  @IsEnum(CompanyTypeDto)
  type?: CompanyTypeDto;

  @ApiPropertyOptional({ description: 'Filter by country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search by name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
