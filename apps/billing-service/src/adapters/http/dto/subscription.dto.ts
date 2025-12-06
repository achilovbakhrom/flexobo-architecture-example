import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { BillingCycle, SubscriptionStatus, UsageType } from '../../../domain/constants/enums';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Plan ID to subscribe to' })
  @IsString()
  planId!: string;

  @ApiProperty({ description: 'Billing cycle', enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;
}

export class ChangePlanDto {
  @ApiProperty({ description: 'New plan ID' })
  @IsString()
  newPlanId!: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Cancel immediately (true) or at period end (false)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  immediate?: boolean;
}

export class CheckUsageLimitDto {
  @ApiProperty({ description: 'Usage type to check', enum: UsageType })
  @IsEnum(UsageType)
  usageType!: UsageType;
}

export class UsageDataDto {
  @ApiProperty()
  loadsCreated?: number;

  @ApiProperty()
  tripsPosted?: number;

  @ApiProperty()
  bidsPlaced?: number;

  @ApiProperty()
  bookingsCreated?: number;

  @ApiProperty()
  teamMembersAdded?: number;

  @ApiProperty()
  filesUploaded?: number;
}

export class SubscriptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  planId!: string;

  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiProperty({ enum: BillingCycle })
  billingCycle!: BillingCycle;

  @ApiProperty()
  currentPeriodStart!: Date;

  @ApiProperty()
  currentPeriodEnd!: Date;

  @ApiPropertyOptional()
  trialEnd?: Date;

  @ApiPropertyOptional()
  paymentProvider?: string;

  @ApiProperty()
  cancelAtPeriodEnd!: boolean;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiPropertyOptional()
  cancellationReason?: string;

  @ApiProperty({ type: UsageDataDto })
  usageData!: Record<string, number>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CheckUsageLimitResponseDto {
  @ApiProperty({ description: 'Whether the action is allowed' })
  allowed!: boolean;

  @ApiProperty({ description: 'Current usage count' })
  currentUsage!: number;

  @ApiProperty({ description: 'Usage limit (-1 for unlimited)' })
  limit!: number;

  @ApiProperty({ description: 'Remaining usage (-1 for unlimited)' })
  remaining!: number;
}
