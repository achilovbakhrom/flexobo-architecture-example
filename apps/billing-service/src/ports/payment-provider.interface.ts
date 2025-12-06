import { PaymentProvider } from '../domain/constants/enums';
import { PaymentMethodInfo } from '../domain/events/payment.events';

export const STRIPE_PROVIDER = Symbol('STRIPE_PROVIDER');
export const CLICK_PROVIDER = Symbol('CLICK_PROVIDER');

export interface CreateCheckoutParams {
  subscriptionId: string;
  companyId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  externalCustomerId?: string;
}

export interface CreatePaymentOrderParams {
  subscriptionId: string;
  companyId: string;
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  metadata?: Record<string, string>;
}

export interface PaymentOrder {
  orderId: string;
  paymentUrl: string;
}

export interface PaymentStatusResult {
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  externalId?: string;
  paymentMethod?: PaymentMethodInfo;
  failureReason?: string;
}

export interface RefundResult {
  refundId: string;
  status: 'pending' | 'succeeded' | 'failed';
  amount: number;
}

export interface WebhookValidationResult {
  valid: boolean;
  eventId?: string;
  eventType?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

export interface IPaymentProvider {
  readonly provider: PaymentProvider;

  // For Stripe: Create checkout session
  createCheckoutSession?(params: CreateCheckoutParams): Promise<CheckoutSession>;

  // For Click.uz: Create payment order
  createPaymentOrder?(params: CreatePaymentOrderParams): Promise<PaymentOrder>;

  getPaymentStatus(externalId: string): Promise<PaymentStatusResult>;
  createRefund(paymentId: string, amount?: number, reason?: string): Promise<RefundResult>;
  cancelSubscription?(externalId: string): Promise<void>;

  // Webhook validation
  validateWebhook(payload: string | Buffer, signature: string): Promise<WebhookValidationResult>;
}
