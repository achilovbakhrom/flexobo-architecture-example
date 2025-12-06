import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  ValidateNested,
  IsNumber,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SavedSearchTypeDto {
  LOAD = 'LOAD',
  TRIP = 'TRIP',
}

export class LocationFilterDto {
  @ApiPropertyOptional({ example: 'UZ', description: 'Country code (ISO 2-letter)' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: 'Tashkent', description: 'City name' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 50, description: 'Search radius in km' })
  @IsOptional()
  @IsNumber()
  radius?: number;

  @ApiPropertyOptional({ example: 41.2995, description: 'Latitude coordinate' })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 69.2401, description: 'Longitude coordinate' })
  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class SearchFiltersDto {
  @ApiPropertyOptional({
    type: LocationFilterDto,
    example: { countryCode: 'UZ', city: 'Tashkent', radius: 50 },
    description: 'Origin location filter',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationFilterDto)
  origin?: LocationFilterDto;

  @ApiPropertyOptional({
    type: LocationFilterDto,
    example: { countryCode: 'RU', city: 'Moscow', radius: 100 },
    description: 'Destination location filter',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationFilterDto)
  destination?: LocationFilterDto;

  @ApiPropertyOptional({
    type: [String],
    example: ['GENERAL', 'REFRIGERATED'],
    description: 'Load/cargo types',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  loadTypes?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['TENT', 'REFRIGERATOR'],
    description: 'Transport types',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transportTypes?: string[];

  @ApiPropertyOptional({ example: 5, description: 'Minimum weight in tons' })
  @IsOptional()
  @IsNumber()
  weightMin?: number;

  @ApiPropertyOptional({ example: 20, description: 'Maximum weight in tons' })
  @IsOptional()
  @IsNumber()
  weightMax?: number;

  @ApiPropertyOptional({ example: 30, description: 'Minimum volume in m³' })
  @IsOptional()
  @IsNumber()
  volumeMin?: number;

  @ApiPropertyOptional({ example: 90, description: 'Maximum volume in m³' })
  @IsOptional()
  @IsNumber()
  volumeMax?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Minimum price' })
  @IsOptional()
  @IsNumber()
  priceMin?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Maximum price' })
  @IsOptional()
  @IsNumber()
  priceMax?: number;

  @ApiPropertyOptional({ example: 'USD', description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '2024-03-01', description: 'Date from (ISO 8601)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2024-03-31', description: 'Date to (ISO 8601)' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ example: true, description: 'Filter for ADR (hazardous materials) cargo' })
  @IsOptional()
  @IsBoolean()
  adr?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['TOP', 'SIDE'],
    description: 'Loading types',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  loadingTypes?: string[];
}

export class CreateSavedSearchDto {
  @ApiProperty({ example: 'UZ to RU refrigerated cargo', description: 'Name for this saved search' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    enum: SavedSearchTypeDto,
    example: 'LOAD',
    description: 'Type of search (LOAD or TRIP)',
  })
  @IsEnum(SavedSearchTypeDto)
  searchType!: SavedSearchTypeDto;

  @ApiProperty({
    type: SearchFiltersDto,
    example: {
      origin: { countryCode: 'UZ', city: 'Tashkent' },
      destination: { countryCode: 'RU', city: 'Moscow' },
      transportTypes: ['REFRIGERATOR'],
      weightMin: 10,
      weightMax: 20,
    },
    description: 'Search filters',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  filters!: SearchFiltersDto;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Whether to notify when new matches are found',
  })
  @IsOptional()
  @IsBoolean()
  notifyOnNew?: boolean;
}

export class UpdateSavedSearchDto {
  @ApiPropertyOptional({
    example: 'Updated UZ to RU search',
    description: 'Name for this saved search',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    type: SearchFiltersDto,
    example: {
      origin: { countryCode: 'UZ', city: 'Samarkand' },
      destination: { countryCode: 'RU', city: 'Moscow' },
      weightMin: 5,
    },
    description: 'Search filters',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  filters?: SearchFiltersDto;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether to notify when new matches are found',
  })
  @IsOptional()
  @IsBoolean()
  notifyOnNew?: boolean;
}
