import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransportType, LoadingType, Feature } from '../../../domain/constants/enums';

export class CreateTransportDto {
  @ApiProperty({
    enum: TransportType,
    example: 'TENT',
    description: 'Transport type',
  })
  @IsString()
  transportType!: string;

  @ApiProperty({
    type: [String],
    enum: LoadingType,
    isArray: true,
    example: ['TOP', 'SIDE', 'REAR'],
    description: 'Available loading methods',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  loadingTypes!: string[];

  @ApiProperty({
    example: 22,
    minimum: 0,
    description: 'Cargo capacity in tons',
  })
  @IsNumber()
  @Min(0)
  capacityTons!: number;

  @ApiPropertyOptional({
    example: 86,
    description: 'Cargo volume capacity in cubic meters',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityM3?: number;

  @ApiPropertyOptional({
    example: 13.6,
    description: 'Cargo area length in meters',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthM?: number;

  @ApiPropertyOptional({
    example: 2.45,
    description: 'Cargo area width in meters',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  widthM?: number;

  @ApiPropertyOptional({
    example: 2.7,
    description: 'Cargo area height in meters',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  heightM?: number;

  @ApiPropertyOptional({
    type: [String],
    enum: Feature,
    isArray: true,
    example: ['GPS', 'TIR', 'CMR'],
    description: 'Available features',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['ADR1', 'ADR3'],
    description: 'ADR certification classes',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adrClasses?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['ECMT', 'EU'],
    description: 'Available permits/licenses',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permits?: string[];
}

export class UpdateTransportDto {
  @ApiPropertyOptional({
    enum: TransportType,
    example: 'REFRIGERATOR',
    description: 'Transport type',
  })
  @IsOptional()
  @IsString()
  transportType?: string;

  @ApiPropertyOptional({
    type: [String],
    enum: LoadingType,
    isArray: true,
    example: ['REAR'],
    description: 'Available loading methods',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  loadingTypes?: string[];

  @ApiPropertyOptional({
    example: 20,
    minimum: 0,
    description: 'Cargo capacity in tons',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityTons?: number;

  @ApiPropertyOptional({
    example: 80,
    description: 'Cargo volume capacity in cubic meters',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityM3?: number;

  @ApiPropertyOptional({
    example: 13.0,
    description: 'Cargo area length in meters',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthM?: number;

  @ApiPropertyOptional({
    example: 2.4,
    description: 'Cargo area width in meters',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  widthM?: number;

  @ApiPropertyOptional({
    example: 2.6,
    description: 'Cargo area height in meters',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  heightM?: number;

  @ApiPropertyOptional({
    type: [String],
    enum: Feature,
    isArray: true,
    example: ['GPS', 'THERMO'],
    description: 'Available features',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['ADR1'],
    description: 'ADR certification classes',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adrClasses?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['ECMT'],
    description: 'Available permits/licenses',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permits?: string[];
}

export class ListTransportsQueryDto {
  @ApiPropertyOptional({
    enum: TransportType,
    example: 'TENT',
    description: 'Filter by transport type',
  })
  @IsOptional()
  @IsString()
  transportType?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by active status',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}

export class TransportResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  ownerId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  companyId!: string;

  @ApiProperty({ enum: TransportType, example: 'TENT' })
  transportType!: string;

  @ApiProperty({ type: [String], enum: LoadingType, example: ['TOP', 'SIDE'] })
  loadingTypes!: string[];

  @ApiProperty({ example: 22 })
  capacityTons!: number;

  @ApiPropertyOptional({ example: 86 })
  capacityM3?: number;

  @ApiPropertyOptional({ example: 13.6 })
  lengthM?: number;

  @ApiPropertyOptional({ example: 2.45 })
  widthM?: number;

  @ApiPropertyOptional({ example: 2.7 })
  heightM?: number;

  @ApiProperty({ type: [String], enum: Feature, example: ['GPS', 'TIR'] })
  features!: string[];

  @ApiProperty({ type: [String], example: ['ADR1'] })
  adrClasses!: string[];

  @ApiProperty({ type: [String], example: ['ECMT'] })
  permits!: string[];

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: '2024-03-15T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-03-15T10:00:00.000Z' })
  updatedAt!: Date;
}

export class ListTransportsResponseDto {
  @ApiProperty({ type: [TransportResponseDto] })
  items!: TransportResponseDto[];

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
