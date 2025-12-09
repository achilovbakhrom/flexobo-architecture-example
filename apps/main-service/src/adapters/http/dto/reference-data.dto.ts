import { Expose, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ===== Translation DTOs =====

export class TranslationDto {
  @ApiProperty()
  @IsString()
  language_code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class ResponseTranslationDto {
  @Expose({ name: 'language_code' })
  @Transform(({ obj }) => obj.languageCode ?? obj.language_code)
  language_code!: string;

  @Expose()
  name!: string;

  @Expose()
  description?: string;
}

// ===== Response DTOs =====

export class ResponseCountryDto {
  @Expose({ name: '_id' })
  @Transform(({ obj }) => obj.id ?? obj._id)
  id!: string;

  @Expose()
  code!: string;

  @Expose({ name: 'currency_code' })
  @Transform(({ obj }) => obj.currencyCode ?? obj.currency_code)
  currency_code?: string;

  @Expose({ name: 'phone_code' })
  @Transform(({ obj }) => obj.phoneCode ?? obj.phone_code)
  phone_code?: string;

  @Expose({ name: 'is_active' })
  @Transform(({ obj }) => obj.isActive ?? obj.is_active ?? true)
  is_active!: boolean;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }) => obj.createdAt ?? obj.created_at)
  created_at!: Date;

  @Expose()
  @Type(() => ResponseTranslationDto)
  translations?: ResponseTranslationDto[];
}

export class ResponseLanguageDto {
  @Expose({ name: '_id' })
  @Transform(({ obj }) => obj.id ?? obj._id)
  id!: string;

  @Expose()
  code!: string;

  @Expose()
  name!: string;

  @Expose({ name: 'is_active' })
  @Transform(({ obj }) => obj.isActive ?? obj.is_active ?? true)
  is_active!: boolean;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }) => obj.createdAt ?? obj.created_at)
  created_at!: Date;
}

export class ResponseCurrencyDto {
  @Expose({ name: '_id' })
  @Transform(({ obj }) => obj.id ?? obj._id)
  id!: string;

  @Expose()
  code!: string;

  @Expose()
  symbol!: string;

  @Expose()
  rate!: number;

  @Expose({ name: 'is_active' })
  @Transform(({ obj }) => obj.isActive ?? obj.is_active ?? true)
  is_active!: boolean;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }) => obj.createdAt ?? obj.created_at)
  created_at!: Date;

  @Expose()
  @Type(() => ResponseTranslationDto)
  translations?: ResponseTranslationDto[];
}

export class ResponseReferenceItemDto {
  @Expose({ name: '_id' })
  @Transform(({ obj }) => obj.id ?? obj._id)
  _id!: string;

  @Expose({ name: 'is_active' })
  @Transform(({ obj }) => obj.isActive ?? obj.is_active ?? true)
  is_active!: boolean;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }) => obj.createdAt ?? obj.created_at)
  created_at!: Date;

  @Expose()
  @Type(() => ResponseTranslationDto)
  translations?: ResponseTranslationDto[];
}

export class ResponseTransportTypeDto {
  @Expose({ name: '_id' })
  @Transform(({ obj }) => obj.id ?? obj._id)
  _id!: string;

  @Expose({ name: 'is_active' })
  @Transform(({ obj }) => obj.isActive ?? obj.is_active ?? true)
  is_active!: boolean;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }) => obj.createdAt ?? obj.created_at)
  created_at!: Date;

  @Expose()
  @Type(() => ResponseTranslationDto)
  translations?: ResponseTranslationDto[];
}

export class ResponseLoadTypeDto {
  @Expose({ name: '_id' })
  @Transform(({ obj }) => obj.id ?? obj._id)
  id!: string;

  @Expose({ name: 'is_active' })
  @Transform(({ obj }) => obj.isActive ?? obj.is_active ?? true)
  is_active!: boolean;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }) => obj.createdAt ?? obj.created_at)
  created_at!: Date;

  @Expose()
  @Type(() => ResponseTranslationDto)
  translations?: ResponseTranslationDto[];
}

export class ResponseLoadingTypeDto {
  @Expose({ name: '_id' })
  @Transform(({ obj }) => obj.id ?? obj._id)
  id!: string;

  @Expose({ name: 'is_active' })
  @Transform(({ obj }) => obj.isActive ?? obj.is_active ?? true)
  is_active!: boolean;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }) => obj.createdAt ?? obj.created_at)
  created_at!: Date;

  @Expose()
  @Type(() => ResponseTranslationDto)
  translations?: ResponseTranslationDto[];
}

export class ResponseADRClassificationDto {
  @Expose({ name: '_id' })
  @Transform(({ obj }) => obj.id ?? obj._id)
  id!: string;

  @Expose({ name: 'is_active' })
  @Transform(({ obj }) => obj.isActive ?? obj.is_active ?? true)
  is_active!: boolean;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }) => obj.createdAt ?? obj.created_at)
  created_at!: Date;

  @Expose()
  @Type(() => ResponseTranslationDto)
  translations?: ResponseTranslationDto[];
}

export class ResponsePermitDto {
  @Expose({ name: '_id' })
  @Transform(({ obj }) => obj.id ?? obj._id)
  id!: string;

  @Expose({ name: 'is_active' })
  @Transform(({ obj }) => obj.isActive ?? obj.is_active ?? true)
  is_active!: boolean;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }) => obj.createdAt ?? obj.created_at)
  created_at!: Date;

  @Expose()
  @Type(() => ResponseTranslationDto)
  translations?: ResponseTranslationDto[];
}

export class ResponseCompanyTypeDto {
  @Expose({ name: '_id' })
  @Transform(({ obj }) => obj.id ?? obj._id)
  id!: string;

  @Expose({ name: 'is_active' })
  @Transform(({ obj }) => obj.isActive ?? obj.is_active ?? true)
  is_active!: boolean;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }) => obj.createdAt ?? obj.created_at)
  created_at!: Date;

  @Expose()
  @Type(() => ResponseTranslationDto)
  translations?: ResponseTranslationDto[];
}

// ===== Create DTOs =====

export class CreateCountryDto {
  @ApiProperty({ description: 'ISO 3166-1 alpha-2 code (e.g., UZ, RU)' })
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'ISO 4217 currency code (e.g., UZS)' })
  @IsOptional()
  @IsString()
  currency_code?: string;

  @ApiPropertyOptional({ description: 'Phone code without + (e.g., 998)' })
  @IsOptional()
  @IsString()
  phone_code?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [TranslationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

export class CreateCurrencyDto {
  @ApiProperty({ description: 'ISO 4217 code (e.g., USD, UZS)' })
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Currency symbol (e.g., $, ₽)' })
  @IsString()
  symbol!: string;

  @ApiPropertyOptional({ description: 'Exchange rate to USD', default: 1 })
  @IsOptional()
  @IsNumber()
  rate?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [TranslationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

export class CreateTransportTypeDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [TranslationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

export class CreateLoadTypeDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [TranslationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

export class CreateLoadingTypeDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [TranslationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

export class CreateADRClassificationDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [TranslationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

export class CreatePermitDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [TranslationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

export class CreateCompanyTypeDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [TranslationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

// ===== Update DTOs =====

export class UpdateCountryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [TranslationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

export class UpdateCurrencyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [TranslationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

export class UpdateReferenceItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [TranslationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

export class UpdateADRClassificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [TranslationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

export class UpdateCompanyTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [TranslationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

// ===== Query DTOs =====

export class ReferenceDataListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true' || value === true
  )
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => {
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  })
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Transform(({ value }) => {
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  })
  @IsNumber()
  @Min(1)
  limit?: number;
}
