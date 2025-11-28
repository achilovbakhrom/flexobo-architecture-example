/**
 * Order DTOs for HTTP API
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsPositive, Min } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    description: 'User ID who is creating the order',
    example: 'user-123',
  })
  @IsString()
  userId!: string;
}

export class CreateOrderResponseDto {
  @ApiProperty({
    description: 'Created order ID',
    example: 'order-1234567890-abc123',
  })
  orderId!: string;
}

export class AddOrderItemDto {
  @ApiProperty({ description: 'Product ID', example: 'product-456' })
  @IsString()
  productId!: string;

  @ApiProperty({ description: 'Product name', example: 'Laptop' })
  @IsString()
  productName!: string;

  @ApiProperty({
    description: 'Quantity of the product',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: 'Price per unit', example: 999.99, minimum: 0 })
  @IsNumber()
  @IsPositive()
  price!: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  @IsString()
  currency!: string;
}

export class SuccessResponseDto {
  @ApiProperty({ description: 'Operation success status', example: true })
  success!: boolean;
}

export class CancelOrderDto {
  @ApiProperty({
    description: 'Reason for cancellation',
    example: 'Customer requested cancellation',
  })
  @IsString()
  reason!: string;
}

export class ShipOrderDto {
  @ApiProperty({
    description: 'Shipping tracking number',
    example: 'TRACK123456789',
  })
  @IsString()
  trackingNumber!: string;
}

export class CheckoutDto {
  @ApiProperty({
    description: 'Payment method',
    example: 'CREDIT_CARD',
    enum: ['CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'BANK_TRANSFER'],
  })
  @IsString()
  paymentMethod!: string;

  @ApiProperty({
    description: 'Currency for payment (optional, defaults to order currency)',
    example: 'USD',
    required: false,
  })
  @IsString()
  currency?: string;
}

export class CheckoutResponseDto {
  @ApiProperty({ description: 'Whether checkout was successful', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Order ID', example: 'order-123' })
  orderId!: string;

  @ApiProperty({
    description: 'Payment ID (if successful)',
    example: 'payment-456',
    required: false,
  })
  paymentId?: string;

  @ApiProperty({
    description: 'Error message (if failed)',
    required: false,
  })
  error?: string;
}
