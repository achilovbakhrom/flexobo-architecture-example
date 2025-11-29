/**
 * Order History DTOs for HTTP API
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderHistoryResponseDto {
  @ApiProperty({ description: 'History entry ID' })
  id!: string;

  @ApiProperty({ description: 'Order ID' })
  orderId!: string;

  @ApiProperty({
    description: 'Event type',
    enum: ['OrderCreated', 'OrderItemAdded', 'OrderConfirmed', 'OrderCancelled', 'OrderShipped'],
  })
  eventType!: string;

  @ApiProperty({ description: 'Event data payload' })
  eventData!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Previous order state' })
  previousState?: string | null;

  @ApiPropertyOptional({ description: 'New order state' })
  newState?: string | null;

  @ApiPropertyOptional({ description: 'User who made the change' })
  changedBy?: string | null;

  @ApiPropertyOptional({ description: 'IP address of the request' })
  ipAddress?: string | null;

  @ApiPropertyOptional({ description: 'User agent of the request' })
  userAgent?: string | null;

  @ApiProperty({ description: 'When the event occurred' })
  occurredAt!: Date;
}

export class OrderHistoryQueryParamsDto {
  @ApiPropertyOptional({ description: 'Filter by order ID' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Filter by event type' })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO format)' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO format)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Maximum results to return' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of results to skip' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number;
}
