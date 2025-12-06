import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RoutePointDto {
  @ApiProperty({ example: 'UZ', description: 'Country code (ISO 2-letter)' })
  @IsString()
  country!: string;

  @ApiProperty({ example: 'Tashkent', description: 'City name' })
  @IsString()
  city!: string;

  @ApiPropertyOptional({ example: 'Industrial Zone 3', description: 'Street address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 41.2995, description: 'Latitude coordinate' })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 69.2401, description: 'Longitude coordinate' })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiProperty({ example: '2024-03-15', description: 'Date at this point (ISO 8601)' })
  @IsString()
  date!: string;

  @ApiPropertyOptional({ example: 50, description: 'Search radius in km (for matching)' })
  @IsOptional()
  @IsNumber()
  radius?: number;
}

export class DimensionsDto {
  @ApiPropertyOptional({ example: 13.6, description: 'Length in meters' })
  @IsOptional()
  @IsNumber()
  lengthM?: number;

  @ApiPropertyOptional({ example: 2.45, description: 'Width in meters' })
  @IsOptional()
  @IsNumber()
  widthM?: number;

  @ApiPropertyOptional({ example: 2.7, description: 'Height in meters' })
  @IsOptional()
  @IsNumber()
  heightM?: number;
}

export class TransportSnapshotDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Transport ID',
  })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'TENT', description: 'Transport type' })
  @IsString()
  type!: string;

  @ApiProperty({ example: 22, description: 'Capacity in tons' })
  @IsNumber()
  capacity!: number;

  @ApiPropertyOptional({
    type: DimensionsDto,
    example: { lengthM: 13.6, widthM: 2.45, heightM: 2.7 },
    description: 'Cargo area dimensions',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @ApiProperty({
    type: [String],
    example: ['TOP', 'SIDE'],
    description: 'Available loading methods',
  })
  @IsArray()
  @IsString({ each: true })
  loadingTypes!: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['GPS', 'TIR'],
    default: [],
    description: 'Available features',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['ECMT'],
    default: [],
    description: 'Available permits',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permits?: string[];
}

export class CreateTripDto {
  @ApiProperty({
    type: TransportSnapshotDto,
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'TENT',
      capacity: 22,
      loadingTypes: ['TOP', 'SIDE'],
      features: ['GPS'],
    },
    description: 'Transport information snapshot',
  })
  @ValidateNested()
  @Type(() => TransportSnapshotDto)
  transport!: TransportSnapshotDto;

  @ApiProperty({
    type: [RoutePointDto],
    example: [{ country: 'UZ', city: 'Tashkent', date: '2024-03-15' }],
    description: 'Loading points on the route',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  loadingPoints!: RoutePointDto[];

  @ApiProperty({
    type: [RoutePointDto],
    example: [{ country: 'RU', city: 'Moscow', date: '2024-03-20' }],
    description: 'Unloading points on the route',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  unloadingPoints!: RoutePointDto[];

  @ApiPropertyOptional({ example: 1500, description: 'Requested price' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD', description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Upon delivery', description: 'Payment terms' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440001'],
    description: 'Board IDs for private visibility',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  boardIds?: string[];

  @ApiPropertyOptional({ example: true, default: true, description: 'Whether trip is publicly visible' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateTripDto {
  @ApiPropertyOptional({
    type: TransportSnapshotDto,
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'REFRIGERATOR',
      capacity: 20,
      loadingTypes: ['REAR'],
    },
    description: 'Transport information snapshot',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransportSnapshotDto)
  transport?: TransportSnapshotDto;

  @ApiPropertyOptional({
    type: [RoutePointDto],
    example: [{ country: 'UZ', city: 'Samarkand', date: '2024-03-16' }],
    description: 'Loading points',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  loadingPoints?: RoutePointDto[];

  @ApiPropertyOptional({
    type: [RoutePointDto],
    example: [{ country: 'KZ', city: 'Almaty', date: '2024-03-21' }],
    description: 'Unloading points',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  unloadingPoints?: RoutePointDto[];

  @ApiPropertyOptional({ example: 1800, description: 'Requested price' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 'EUR', description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Prepayment 30%', description: 'Payment terms' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({ type: [String], description: 'Board IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  boardIds?: string[];

  @ApiPropertyOptional({ example: false, description: 'Whether trip is publicly visible' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class ListTripsQueryDto {
  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

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

export class SearchTripsQueryDto {
  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'TENT', description: 'Filter by transport type' })
  @IsOptional()
  @IsString()
  transportType?: string;

  @ApiPropertyOptional({ example: 'UZ', description: 'Filter by origin country' })
  @IsOptional()
  @IsString()
  fromCountry?: string;

  @ApiPropertyOptional({ example: 'RU', description: 'Filter by destination country' })
  @IsOptional()
  @IsString()
  toCountry?: string;

  @ApiPropertyOptional({ example: '2024-03-01', description: 'Filter by date from' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2024-03-31', description: 'Filter by date to' })
  @IsOptional()
  @IsString()
  dateTo?: string;

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
