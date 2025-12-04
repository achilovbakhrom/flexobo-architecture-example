import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { BillingCycle, PaymentProvider } from '../../../domain/constants/enums';

export class CreateCheckoutSessionDto {
  @IsUUID()
  subscriptionId!: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @IsString()
  successUrl!: string;

  @IsString()
  cancelUrl!: string;
}

export class CreateClickOrderDto {
  @IsUUID()
  subscriptionId!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  returnUrl!: string;
}

export class RefundPaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class PaymentResponseDto {
  id!: string;
  subscriptionId!: string;
  companyId!: string;
  amount!: number;
  currency!: string;
  status!: string;
  provider!: string;
  paymentType!: string;
  paymentMethod?: {
    type: string;
    last4?: string;
    brand?: string;
  };
  failureReason?: string;
  createdAt!: Date;
}

export class CheckoutSessionResponseDto {
  sessionId!: string;
  url!: string;
}

export class ClickOrderResponseDto {
  orderId!: string;
  paymentUrl!: string;
}

export class PaymentListResponseDto {
  items!: PaymentResponseDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}
