import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsBoolean,
  IsOptional,
  IsEnum,
  Min,
  IsObject,
} from 'class-validator';
import { PlanFeature } from '../../../domain/constants/enums';
import { PlanLimitsData } from '../../../domain/value-objects/plan-limits.vo';

export class PlanLimitsDto implements PlanLimitsData {
  @ApiProperty({ description: 'Loads per month (-1 for unlimited)' })
  @IsNumber()
  loadsPerMonth!: number;

  @ApiProperty({ description: 'Trips per month (-1 for unlimited)' })
  @IsNumber()
  tripsPerMonth!: number;

  @ApiProperty({ description: 'Bids per month (-1 for unlimited)' })
  @IsNumber()
  bidsPerMonth!: number;

  @ApiProperty({ description: 'Team members limit (-1 for unlimited)' })
  @IsNumber()
  teamMembers!: number;

  @ApiProperty({ description: 'Storage in GB (-1 for unlimited)' })
  @IsNumber()
  storageGb!: number;

  @ApiProperty({ description: 'API requests per day (-1 for unlimited)' })
  @IsNumber()
  apiRequestsPerDay!: number;
}

export class CreatePlanDto {
  @ApiProperty({ description: 'Unique plan name (e.g., FREE, STARTER)' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Display name for the plan' })
  @IsString()
  displayName!: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Monthly price' })
  @IsNumber()
  @Min(0)
  priceMonthly!: number;

  @ApiProperty({ description: 'Yearly price' })
  @IsNumber()
  @Min(0)
  priceYearly!: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Plan limits', type: PlanLimitsDto })
  @IsObject()
  limits!: Partial<PlanLimitsData>;

  @ApiProperty({
    description: 'Plan features',
    enum: PlanFeature,
    isArray: true,
  })
  @IsArray()
  @IsEnum(PlanFeature, { each: true })
  features!: PlanFeature[];

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Whether this plan is popular' })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @ApiPropertyOptional({ description: 'Trial period in days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  trialDays?: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ description: 'Display name for the plan' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Monthly price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMonthly?: number;

  @ApiPropertyOptional({ description: 'Yearly price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceYearly?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Plan limits', type: PlanLimitsDto })
  @IsOptional()
  @IsObject()
  limits?: Partial<PlanLimitsData>;

  @ApiPropertyOptional({
    description: 'Plan features',
    enum: PlanFeature,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PlanFeature, { each: true })
  features?: PlanFeature[];

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Whether this plan is popular' })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @ApiPropertyOptional({ description: 'Trial period in days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  trialDays?: number;
}

export class PlanResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  priceMonthly!: number;

  @ApiProperty()
  priceYearly!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ type: PlanLimitsDto })
  limits!: PlanLimitsData;

  @ApiProperty({ enum: PlanFeature, isArray: true })
  features!: PlanFeature[];

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isPopular!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  trialDays!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ListPlansResponseDto {
  @ApiProperty({ type: [PlanResponseDto] })
  plans!: PlanResponseDto[];

  @ApiProperty()
  total!: number;
}
