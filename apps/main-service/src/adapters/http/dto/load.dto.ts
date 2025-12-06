import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  ValidateNested,
  Min,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocationDto {
  @ApiProperty({ example: 'UZ', description: 'Country code (ISO 2-letter)' })
  @IsString()
  country!: string;

  @ApiProperty({ example: 'Tashkent', description: 'City name' })
  @IsString()
  city!: string;

  @ApiPropertyOptional({ example: '123 Main Street', description: 'Street address' })
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
}

export class CargoDto {
  @ApiProperty({ example: 'Cotton', description: 'Cargo name/description' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 20, minimum: 0, description: 'Weight in tons' })
  @IsNumber()
  @Min(0)
  weight!: number;

  @ApiPropertyOptional({ example: 45, description: 'Volume in cubic meters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volume?: number;

  @ApiPropertyOptional({ example: 1, description: 'Number of units' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 'Pallets', description: 'Packaging type' })
  @IsOptional()
  @IsString()
  packagingType?: string;
}

export class CreateLoadDto {
  @ApiProperty({
    type: LocationDto,
    example: { country: 'UZ', city: 'Tashkent', address: 'Industrial Zone 5' },
    description: 'Loading location',
  })
  @ValidateNested()
  @Type(() => LocationDto)
  from!: LocationDto;

  @ApiProperty({
    type: LocationDto,
    example: { country: 'RU', city: 'Moscow', address: 'Warehouse District' },
    description: 'Unloading location',
  })
  @ValidateNested()
  @Type(() => LocationDto)
  to!: LocationDto;

  @ApiProperty({ example: 'TENT', description: 'Transport type (TENT, REFRIGERATOR, etc.)' })
  @IsString()
  transportType!: string;

  @ApiProperty({
    type: [String],
    example: ['TOP', 'SIDE'],
    description: 'Loading methods',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  loadingTypes!: string[];

  @ApiProperty({
    type: [CargoDto],
    example: [{ name: 'Cotton', weight: 20, volume: 45, quantity: 1 }],
    description: 'List of cargos',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CargoDto)
  cargos!: CargoDto[];

  @ApiProperty({ example: '2024-03-15', description: 'Loading date (ISO 8601)' })
  @IsDateString()
  loadingDate!: string;

  @ApiPropertyOptional({ example: '2024-03-17', description: 'Loading date range end' })
  @IsOptional()
  @IsDateString()
  loadingDateTo?: string;

  @ApiPropertyOptional({ example: '2024-03-20', description: 'Expected unloading date' })
  @IsOptional()
  @IsDateString()
  unloadingDate?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['GPS', 'TIR'],
    description: 'Required features',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['ADR1', 'ADR3'],
    description: 'ADR classification codes',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adrClasses?: string[];

  @ApiPropertyOptional({ example: -18, description: 'Minimum temperature for refrigerated cargo' })
  @IsOptional()
  @IsNumber()
  temperatureMin?: number;

  @ApiPropertyOptional({ example: -15, description: 'Maximum temperature for refrigerated cargo' })
  @IsOptional()
  @IsNumber()
  temperatureMax?: number;

  @ApiPropertyOptional({ example: 2500, description: 'Offered price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD', description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Prepayment 50%', description: 'Payment terms' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description: 'Board IDs for private visibility',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  boardIds?: string[];

  @ApiPropertyOptional({ example: true, default: true, description: 'Whether load is publicly visible' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateLoadDto {
  @ApiPropertyOptional({
    type: LocationDto,
    example: { country: 'UZ', city: 'Samarkand' },
    description: 'Loading location',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  from?: LocationDto;

  @ApiPropertyOptional({
    type: LocationDto,
    example: { country: 'KZ', city: 'Almaty' },
    description: 'Unloading location',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  to?: LocationDto;

  @ApiPropertyOptional({ example: 'REFRIGERATOR', description: 'Transport type' })
  @IsOptional()
  @IsString()
  transportType?: string;

  @ApiPropertyOptional({ type: [String], example: ['REAR'], description: 'Loading methods' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  loadingTypes?: string[];

  @ApiPropertyOptional({
    type: [CargoDto],
    example: [{ name: 'Frozen Meat', weight: 15, volume: 30 }],
    description: 'List of cargos',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CargoDto)
  cargos?: CargoDto[];

  @ApiPropertyOptional({ example: '2024-03-16', description: 'Loading date' })
  @IsOptional()
  @IsDateString()
  loadingDate?: string;

  @ApiPropertyOptional({ example: '2024-03-18', description: 'Loading date range end' })
  @IsOptional()
  @IsDateString()
  loadingDateTo?: string;

  @ApiPropertyOptional({ example: '2024-03-22', description: 'Expected unloading date' })
  @IsOptional()
  @IsDateString()
  unloadingDate?: string;

  @ApiPropertyOptional({ type: [String], example: ['GPS'], description: 'Required features' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ type: [String], example: ['ADR1'], description: 'ADR classes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adrClasses?: string[];

  @ApiPropertyOptional({ example: -20, description: 'Minimum temperature' })
  @IsOptional()
  @IsNumber()
  temperatureMin?: number;

  @ApiPropertyOptional({ example: -10, description: 'Maximum temperature' })
  @IsOptional()
  @IsNumber()
  temperatureMax?: number;

  @ApiPropertyOptional({ example: 3000, description: 'Offered price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'EUR', description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Upon delivery', description: 'Payment terms' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({ type: [String], description: 'Board IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  boardIds?: string[];

  @ApiPropertyOptional({ example: false, description: 'Whether load is publicly visible' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class ListLoadsQueryDto {
  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'TENT', description: 'Filter by transport type' })
  @IsOptional()
  @IsString()
  transportType?: string;

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

export class SearchLoadsQueryDto extends ListLoadsQueryDto {
  @ApiPropertyOptional({ example: 'UZ', description: 'Filter by origin country' })
  @IsOptional()
  @IsString()
  fromCountry?: string;

  @ApiPropertyOptional({ example: 'RU', description: 'Filter by destination country' })
  @IsOptional()
  @IsString()
  toCountry?: string;

  @ApiPropertyOptional({ example: '2024-03-01', description: 'Filter by loading date from' })
  @IsOptional()
  @IsDateString()
  loadingDateFrom?: string;

  @ApiPropertyOptional({ example: '2024-03-31', description: 'Filter by loading date to' })
  @IsOptional()
  @IsDateString()
  loadingDateTo?: string;
}
