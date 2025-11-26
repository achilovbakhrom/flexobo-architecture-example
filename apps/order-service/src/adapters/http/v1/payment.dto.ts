/**
 * Payment DTOs for HTTP API
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class CreatePaymentRequestDto {
  @ApiProperty({ description: 'Order ID', example: 'order-123' })
  @IsString()
  orderId!: string;

  @ApiProperty({ description: 'Payment amount', example: 99.99 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  @IsString()
  currency!: string;

  @ApiProperty({
    description: 'Payment method',
    example: 'CREDIT_CARD',
    enum: ['CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'BANK_TRANSFER'],
  })
  @IsString()
  paymentMethod!: string;
}

export class CreatePaymentResponseDto {
  @ApiProperty({ description: 'Created payment ID', example: 'uuid-here' })
  paymentId!: string;
}

export class CompletePaymentRequestDto {
  @ApiProperty({ description: 'External transaction ID from payment provider', example: 'txn_12345' })
  @IsString()
  transactionId!: string;
}

export class FailPaymentRequestDto {
  @ApiProperty({ description: 'Reason for failure', example: 'Insufficient funds' })
  @IsString()
  reason!: string;
}

export class RefundPaymentRequestDto {
  @ApiProperty({ description: 'Refund amount', example: 50.00 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ description: 'Reason for refund', example: 'Customer requested refund' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment ID' })
  id!: string;

  @ApiProperty({ description: 'Order ID' })
  orderId!: string;

  @ApiProperty({ description: 'Payment amount' })
  amount!: number;

  @ApiProperty({ description: 'Currency code' })
  currency!: string;

  @ApiProperty({
    description: 'Payment status',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'],
  })
  status!: string;

  @ApiProperty({ description: 'Payment method' })
  paymentMethod!: string;

  @ApiPropertyOptional({ description: 'External transaction ID' })
  transactionId?: string | null;

  @ApiPropertyOptional({ description: 'Failure reason' })
  failureReason?: string | null;

  @ApiPropertyOptional({ description: 'Refunded amount' })
  refundedAmount?: number | null;

  @ApiPropertyOptional({ description: 'Processing timestamp' })
  processedAt?: Date | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;
}
