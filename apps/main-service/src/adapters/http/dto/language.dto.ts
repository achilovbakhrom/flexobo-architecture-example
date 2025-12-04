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
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateLanguageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class LanguageListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

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

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Transform(({ value }) => {
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  })
  @IsNumber()
  @Min(1)
  limit?: number;
}
