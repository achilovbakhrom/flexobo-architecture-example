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
  @ApiProperty({ example: 'Tashkent Logistics LLC', description: 'Company name' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: CompanyTypeDto, example: 'CARRIER', description: 'Company type' })
  @IsEnum(CompanyTypeDto)
  type!: CompanyTypeDto;

  @ApiPropertyOptional({
    example: 'International freight carrier with 50+ trucks',
    description: 'Company description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/logos/company-123.png',
    description: 'Company logo URL',
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ example: '+998901234567', description: 'Company phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@tashkent-logistics.uz', description: 'Company email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '123 Industrial Street, Tashkent',
    description: 'Company address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'UZ', description: 'Country code (ISO 2-letter)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Tashkent', description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '123456789', description: 'Tax identification number' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'https://tashkent-logistics.uz', description: 'Company website' })
  @IsOptional()
  @IsString()
  website?: string;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'Tashkent Logistics International LLC', description: 'Company name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated description with expanded services',
    description: 'Company description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/logos/company-123-new.png',
    description: 'Company logo URL',
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ example: '+998901234568', description: 'Company phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@tashkent-logistics.uz', description: 'Company email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '456 Business Park, Tashkent',
    description: 'Company address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'UZ', description: 'Country code (ISO 2-letter)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Samarkand', description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '987654321', description: 'Tax identification number' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'https://tashkent-logistics.com', description: 'Company website' })
  @IsOptional()
  @IsString()
  website?: string;
}

export class VerifyCompanyDto {
  @ApiPropertyOptional({
    example: 'Documents verified, all licenses valid until 2025',
    description: 'Verification notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectCompanyDto {
  @ApiProperty({
    example: 'Missing required business license documentation',
    description: 'Rejection reason',
  })
  @IsString()
  reason!: string;
}

export class SuspendCompanyDto {
  @ApiProperty({
    example: 'Multiple customer complaints, pending investigation',
    description: 'Suspension reason',
  })
  @IsString()
  reason!: string;
}

export class AddCompanyMemberDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User ID to add as member',
  })
  @IsString()
  userId!: string;

  @ApiProperty({
    enum: CompanyMemberRoleDto,
    example: 'MEMBER',
    default: CompanyMemberRoleDto.MEMBER,
    description: 'Member role (ADMIN or MEMBER, cannot add OWNER)',
  })
  @IsEnum(CompanyMemberRoleDto)
  role!: CompanyMemberRoleDto;
}

export class UpdateCompanyMemberDto {
  @ApiProperty({
    enum: CompanyMemberRoleDto,
    example: 'ADMIN',
    description: 'New member role (ADMIN or MEMBER)',
  })
  @IsEnum(CompanyMemberRoleDto)
  role!: CompanyMemberRoleDto;
}

export class ListCompaniesQueryDto {
  @ApiPropertyOptional({ enum: CompanyStatusDto, example: 'VERIFIED', description: 'Filter by status' })
  @IsOptional()
  @IsEnum(CompanyStatusDto)
  status?: CompanyStatusDto;

  @ApiPropertyOptional({ enum: CompanyTypeDto, example: 'CARRIER', description: 'Filter by type' })
  @IsOptional()
  @IsEnum(CompanyTypeDto)
  type?: CompanyTypeDto;

  @ApiPropertyOptional({ example: 'UZ', description: 'Filter by country code' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Tashkent', description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: true, description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'logistics', description: 'Search by name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
