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
import { Type, Transform } from 'class-transformer';

export class RoutePointDto {
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

  @ApiProperty()
  @IsString()
  date!: string;

  @ApiPropertyOptional({ description: 'Search radius in km (for matching)' })
  @IsOptional()
  @IsNumber()
  radius?: number;
}

export class DimensionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lengthM?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  widthM?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  heightM?: number;
}

export class TransportSnapshotDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  type!: string;

  @ApiProperty({ description: 'Capacity in tons' })
  @IsNumber()
  capacity!: number;

  @ApiPropertyOptional({ type: DimensionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  loadingTypes!: string[];

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permits?: string[];
}

export class CreateTripDto {
  @ApiProperty({ type: TransportSnapshotDto })
  @ValidateNested()
  @Type(() => TransportSnapshotDto)
  transport!: TransportSnapshotDto;

  @ApiProperty({ type: [RoutePointDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  loadingPoints!: RoutePointDto[];

  @ApiProperty({ type: [RoutePointDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  unloadingPoints!: RoutePointDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({ type: [String], description: 'Board IDs for private visibility' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  boardIds?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateTripDto {
  @ApiPropertyOptional({ type: TransportSnapshotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransportSnapshotDto)
  transport?: TransportSnapshotDto;

  @ApiPropertyOptional({ type: [RoutePointDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  loadingPoints?: RoutePointDto[];

  @ApiPropertyOptional({ type: [RoutePointDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  unloadingPoints?: RoutePointDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
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

export class ListTripsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class SearchTripsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transportType?: string;

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
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
