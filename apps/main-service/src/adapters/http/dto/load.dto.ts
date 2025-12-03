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
  @ApiProperty()
  @IsString()
  country!: string;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class CargoDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  weight!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  volume?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packagingType?: string;
}

export class CreateLoadDto {
  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  from!: LocationDto;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  to!: LocationDto;

  @ApiProperty()
  @IsString()
  transportType!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  loadingTypes!: string[];

  @ApiProperty({ type: [CargoDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CargoDto)
  cargos!: CargoDto[];

  @ApiProperty()
  @IsDateString()
  loadingDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  loadingDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  unloadingDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adrClasses?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  temperatureMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  temperatureMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  boardIds?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateLoadDto {
  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  from?: LocationDto;

  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  to?: LocationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transportType?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  loadingTypes?: string[];

  @ApiPropertyOptional({ type: [CargoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CargoDto)
  cargos?: CargoDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  loadingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  loadingDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  unloadingDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adrClasses?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  temperatureMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  temperatureMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  boardIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class ListLoadsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transportType?: string;

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

export class SearchLoadsQueryDto extends ListLoadsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  loadingDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  loadingDateTo?: string;
}
