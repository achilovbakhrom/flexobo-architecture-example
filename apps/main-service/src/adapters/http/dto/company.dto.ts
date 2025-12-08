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
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

// Enums matching frontend expectations
export enum CompanyStatusDto {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}

export enum CompanyVerifyStatusDto {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum CompanyMemberRoleDto {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum CompanyDocumentTypeDto {
  CERTIFICATE = 'certificate',
  BUSINESS_ACTIVITY_LICENSE = 'business_activity_license',
  DIRECTOR_PASSPORT = 'director_passport',
  OTHER = 'other',
}

// Request DTOs

export class CompanyDocumentDto {
  @ApiProperty({ enum: CompanyDocumentTypeDto, example: 'certificate' })
  @IsEnum(CompanyDocumentTypeDto)
  type!: CompanyDocumentTypeDto;

  @ApiProperty({ example: 'https://cdn.example.com/docs/certificate.pdf' })
  @IsString()
  url!: string;
}

export class CreateCompanyDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Company type ID' })
  @IsString()
  @IsUUID()
  company_type!: string;

  @ApiPropertyOptional({ example: 'Tashkent Logistics LLC', description: 'Company name' })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiPropertyOptional({
    example: 'International freight carrier with 50+ trucks',
    description: 'Company description',
  })
  @IsOptional()
  @IsString()
  company_description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avatars/company-123.png',
    description: 'Company avatar URL',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: '+998901234567', description: 'Company phone number' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ example: 'info@tashkent-logistics.uz', description: 'Company email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Country ID' })
  @IsString()
  @IsUUID()
  country!: string;

  @ApiPropertyOptional({ example: 'Tashkent', description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'MC-123456', description: 'DOT/MC number for carriers' })
  @IsString()
  dot_mc!: string;

  @ApiPropertyOptional({ example: true, description: 'Is this a legal entity', default: true })
  @IsOptional()
  @IsBoolean()
  is_legal_entity?: boolean;

  @ApiPropertyOptional({ enum: CompanyStatusDto, example: 'active', description: 'Company status' })
  @IsOptional()
  @IsEnum(CompanyStatusDto)
  status?: CompanyStatusDto;

  @ApiPropertyOptional({ type: [CompanyDocumentDto], description: 'Company documents' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyDocumentDto)
  documents?: CompanyDocumentDto[];
}

export class CreateMyCompanyDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Company type ID' })
  @IsString()
  @IsUUID()
  company_type!: string;

  @ApiPropertyOptional({ example: 'Tashkent Logistics LLC', description: 'Company name' })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiPropertyOptional({
    example: 'International freight carrier with 50+ trucks',
    description: 'Company description',
  })
  @IsOptional()
  @IsString()
  company_description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avatars/company-123.png',
    description: 'Company avatar URL',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: '+998901234567', description: 'Company phone number' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ example: 'info@tashkent-logistics.uz', description: 'Company email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Country ID' })
  @IsString()
  @IsUUID()
  country!: string;

  @ApiPropertyOptional({ example: 'Tashkent', description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'MC-123456', description: 'DOT/MC number for carriers' })
  @IsString()
  dot_mc!: string;

  @ApiPropertyOptional({ example: true, description: 'Is this a legal entity', default: true })
  @IsOptional()
  @IsBoolean()
  is_legal_entity?: boolean;

  @ApiPropertyOptional({ type: [CompanyDocumentDto], description: 'Company documents' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyDocumentDto)
  documents?: CompanyDocumentDto[];
}

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Company type ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  company_type?: string;

  @ApiPropertyOptional({ example: 'Tashkent Logistics International LLC', description: 'Company name' })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiPropertyOptional({
    example: 'Updated description with expanded services',
    description: 'Company description',
  })
  @IsOptional()
  @IsString()
  company_description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avatars/company-123-new.png',
    description: 'Company avatar URL',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: '+998901234568', description: 'Company phone number' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ example: 'contact@tashkent-logistics.uz', description: 'Company email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Country ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  country?: string;

  @ApiPropertyOptional({ example: 'Samarkand', description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'MC-789012', description: 'DOT/MC number for carriers' })
  @IsOptional()
  @IsString()
  dot_mc?: string;

  @ApiPropertyOptional({ example: true, description: 'Is this a legal entity' })
  @IsOptional()
  @IsBoolean()
  is_legal_entity?: boolean;

  @ApiPropertyOptional({ enum: CompanyStatusDto, example: 'active', description: 'Company status' })
  @IsOptional()
  @IsEnum(CompanyStatusDto)
  status?: CompanyStatusDto;
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
  @IsUUID()
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

export class AddMembersDto {
  @ApiProperty({
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
    description: 'Array of user IDs to add as members',
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  members!: string[];
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

export class AddDocumentDto {
  @ApiProperty({ enum: CompanyDocumentTypeDto, example: 'certificate' })
  @IsEnum(CompanyDocumentTypeDto)
  type!: CompanyDocumentTypeDto;

  @ApiProperty({ example: 'https://cdn.example.com/docs/certificate.pdf' })
  @IsString()
  url!: string;
}

// Response DTOs - matching frontend Company interface

export class CountryResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  _id!: string;

  @ApiProperty({ example: 'Uzbekistan' })
  name!: string;

  @ApiProperty({ example: 'UZ' })
  country_code!: string;
}

export class CompanyTypeResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  _id!: string;

  @ApiProperty({ example: 'Carrier' })
  name!: string;

  @ApiPropertyOptional({ example: 'Transport and logistics company' })
  description?: string;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  created_at!: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
  updated_at?: string;
}

export class StatusHistoryItemDto {
  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiPropertyOptional({ example: 'Company blocked due to policy violation' })
  reason?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  changed_at!: string;
}

export class CompanyDocumentResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ enum: CompanyDocumentTypeDto, example: 'certificate' })
  type!: CompanyDocumentTypeDto;

  @ApiProperty({ example: 'https://cdn.example.com/docs/certificate.pdf' })
  url!: string;
}

export class CompanyMemberResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  user_id!: string;

  @ApiProperty({ enum: CompanyMemberRoleDto, example: 'MEMBER' })
  role!: CompanyMemberRoleDto;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  joined_at!: string;
}

// Main Company Response DTO matching frontend interface
export class CompanyResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  _id!: string;

  @ApiProperty({ example: 'tashkent-logistics-abc123' })
  company_unique_id!: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Owner name (fio)' })
  fio?: string;

  @ApiPropertyOptional({ example: 'info@company.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  phone_number?: string;

  @ApiPropertyOptional({ type: CountryResponseDto })
  country?: CountryResponseDto;

  @ApiPropertyOptional({ example: 'Tashkent' })
  city?: string;

  @ApiPropertyOptional({ example: 'MC-123456' })
  dot_mc?: string;

  @ApiProperty({ example: 4.5 })
  rating!: number;

  @ApiProperty({ example: 25 })
  count_ratings!: number;

  @ApiProperty({ type: CompanyTypeResponseDto })
  company_type!: CompanyTypeResponseDto;

  @ApiPropertyOptional({ example: 'Tashkent Logistics LLC' })
  company_name?: string;

  @ApiPropertyOptional({ example: 'International freight carrier with 50+ trucks' })
  company_description?: string;

  @ApiProperty({ enum: CompanyStatusDto, example: 'active' })
  status!: CompanyStatusDto;

  @ApiProperty({ type: [StatusHistoryItemDto] })
  status_history!: StatusHistoryItemDto[];

  @ApiProperty({ enum: CompanyVerifyStatusDto, example: 'verified' })
  verify_status!: CompanyVerifyStatusDto;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  created_at!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatars/company-123.png' })
  avatar?: string;

  @ApiPropertyOptional({ type: [CompanyDocumentResponseDto] })
  documents?: CompanyDocumentResponseDto[];

  @ApiProperty({ example: true })
  is_legal_entity!: boolean;

  @ApiPropertyOptional({ type: [CompanyMemberResponseDto] })
  members?: CompanyMemberResponseDto[];
}

// Query DTOs

export class ListCompaniesQueryDto {
  @ApiPropertyOptional({ enum: CompanyStatusDto, example: 'active', description: 'Filter by status' })
  @IsOptional()
  @IsEnum(CompanyStatusDto)
  status?: CompanyStatusDto;

  @ApiPropertyOptional({ enum: CompanyVerifyStatusDto, example: 'verified', description: 'Filter by verify status' })
  @IsOptional()
  @IsEnum(CompanyVerifyStatusDto)
  verify_status?: CompanyVerifyStatusDto;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Filter by company type ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  company_type?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Filter by country ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  country?: string;

  @ApiPropertyOptional({ example: 'Tashkent', description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

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

// CompanyType DTOs

export class MultilingualTextDto {
  @ApiProperty({ example: 'Carrier' })
  @IsString()
  en!: string;

  @ApiPropertyOptional({ example: 'Перевозчик' })
  @IsOptional()
  @IsString()
  ru?: string;

  @ApiPropertyOptional({ example: 'Tashuvchi' })
  @IsOptional()
  @IsString()
  uz?: string;
}

export class CreateCompanyTypeDto {
  @ApiProperty({ type: MultilingualTextDto, description: 'Company type name in multiple languages' })
  @ValidateNested()
  @Type(() => MultilingualTextDto)
  name!: MultilingualTextDto;

  @ApiPropertyOptional({ type: MultilingualTextDto, description: 'Company type description in multiple languages' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MultilingualTextDto)
  description?: MultilingualTextDto;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateCompanyTypeDto {
  @ApiPropertyOptional({ type: MultilingualTextDto, description: 'Company type name in multiple languages' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MultilingualTextDto)
  name?: MultilingualTextDto;

  @ApiPropertyOptional({ type: MultilingualTextDto, description: 'Company type description in multiple languages' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MultilingualTextDto)
  description?: MultilingualTextDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
