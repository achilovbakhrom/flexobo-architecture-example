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
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  radius?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class SearchFiltersDto {
  @ApiPropertyOptional({ type: LocationFilterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationFilterDto)
  origin?: LocationFilterDto;

  @ApiPropertyOptional({ type: LocationFilterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationFilterDto)
  destination?: LocationFilterDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  loadTypes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transportTypes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weightMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weightMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  volumeMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  volumeMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priceMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priceMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  adr?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  loadingTypes?: string[];
}

export class CreateSavedSearchDto {
  @ApiProperty({ description: 'Name for this saved search' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: SavedSearchTypeDto, description: 'Type of search (LOAD or TRIP)' })
  @IsEnum(SavedSearchTypeDto)
  searchType!: SavedSearchTypeDto;

  @ApiProperty({ type: SearchFiltersDto, description: 'Search filters' })
  @IsObject()
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  filters!: SearchFiltersDto;

  @ApiPropertyOptional({ description: 'Whether to notify when new matches are found' })
  @IsOptional()
  @IsBoolean()
  notifyOnNew?: boolean;
}

export class UpdateSavedSearchDto {
  @ApiPropertyOptional({ description: 'Name for this saved search' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ type: SearchFiltersDto, description: 'Search filters' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  filters?: SearchFiltersDto;

  @ApiPropertyOptional({ description: 'Whether to notify when new matches are found' })
  @IsOptional()
  @IsBoolean()
  notifyOnNew?: boolean;
}
