import { Expose, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResponseLanguageDto {
  @Expose({ name: '_id' })
  @Transform(({ obj }) => obj.id ?? obj._id)
  _id!: string;

  @Expose()
  name!: string;

  @Expose()
  code!: string;

  @Expose({ name: 'is_active' })
  @Transform(({ obj }) => obj.isActive ?? obj.is_active ?? false)
  is_active!: boolean;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }) => obj.createdAt ?? obj.is_active ?? false)
  created_at!: boolean;
}

export class CreateLanguageDto {
  @ApiProperty({ example: 'Uzbek', description: 'Language name' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'uz', description: 'Language code (ISO 639-1)' })
  @IsString()
  code!: string;

  @ApiPropertyOptional({ example: true, default: false, description: 'Whether the language is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateLanguageDto {
  @ApiPropertyOptional({ example: 'O\'zbek', description: 'Language name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'uzb', description: 'Language code' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: false, description: 'Whether the language is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class LanguageListQueryDto {
  @ApiPropertyOptional({ example: 'uzbek', description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'uz', description: 'Filter by language code' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: true, description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true' || value === true
  )
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => {
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  })
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, default: 10, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => {
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  })
  @IsNumber()
  @Min(1)
  limit?: number;
}
