import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  Min,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransportType, LoadingType, Feature } from '../../../domain/constants/enums';

export class CreateTransportDto {
  @ApiProperty({ enum: TransportType })
  @IsString()
  transportType!: string;

  @ApiProperty({ type: [String], enum: LoadingType, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  loadingTypes!: string[];

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  capacityTons!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityM3?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthM?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  widthM?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  heightM?: number;

  @ApiPropertyOptional({ type: [String], enum: Feature, isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adrClasses?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permits?: string[];
}

export class UpdateTransportDto {
  @ApiPropertyOptional({ enum: TransportType })
  @IsOptional()
  @IsString()
  transportType?: string;

  @ApiPropertyOptional({ type: [String], enum: LoadingType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  loadingTypes?: string[];

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityTons?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityM3?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthM?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  widthM?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  heightM?: number;

  @ApiPropertyOptional({ type: [String], enum: Feature, isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adrClasses?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permits?: string[];
}

export class ListTransportsQueryDto {
  @ApiPropertyOptional({ enum: TransportType })
  @IsOptional()
  @IsString()
  transportType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}

export class TransportResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ enum: TransportType })
  transportType!: string;

  @ApiProperty({ type: [String], enum: LoadingType })
  loadingTypes!: string[];

  @ApiProperty()
  capacityTons!: number;

  @ApiPropertyOptional()
  capacityM3?: number;

  @ApiPropertyOptional()
  lengthM?: number;

  @ApiPropertyOptional()
  widthM?: number;

  @ApiPropertyOptional()
  heightM?: number;

  @ApiProperty({ type: [String], enum: Feature })
  features!: string[];

  @ApiProperty({ type: [String] })
  adrClasses!: string[];

  @ApiProperty({ type: [String] })
  permits!: string[];

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ListTransportsResponseDto {
  @ApiProperty({ type: [TransportResponseDto] })
  items!: TransportResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
