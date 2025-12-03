import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentProvider } from '../../domain/constants/enums';
import {
  IPaymentProvider,
  CreateCheckoutParams,
  CheckoutSession,
  PaymentStatusResult,
  RefundResult,
  WebhookValidationResult,
} from '../../ports/payment-provider.interface';

@Injectable()
export class StripeProvider implements IPaymentProvider {
  private readonly logger = new Logger(StripeProvider.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  readonly provider = PaymentProvider.STRIPE;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY', '');
    this.webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
      ''
    );

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-11-17.clover',
    });
  }

  async createCheckoutSession(
    params: CreateCheckoutParams
  ): Promise<CheckoutSession> {
    try {
      const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
        currency: params.currency.toLowerCase(),
        product_data: {
          name: params.planName,
        },
        unit_amount: Math.round(params.amount * 100), // Convert to cents
        recurring: {
          interval: params.billingCycle === 'yearly' ? 'year' : 'month',
        },
      };

      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: priceData,
            quantity: 1,
          },
        ],
        customer_email: params.customerEmail,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          subscriptionId: params.subscriptionId,
          companyId: params.companyId,
          planId: params.planId,
          ...params.metadata,
        },
      });

      return {
        sessionId: session.id,
        checkoutUrl: session.url ?? '',
        externalCustomerId: session.customer as string | undefined,
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe checkout session', error);
      throw error;
    }
  }

  async getPaymentStatus(externalId: string): Promise<PaymentStatusResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(externalId);

      let status: PaymentStatusResult['status'];
      switch (paymentIntent.status) {
        case 'succeeded':
          status = 'succeeded';
          break;
        case 'processing':
          status = 'processing';
          break;
        case 'requires_payment_method':
        case 'requires_confirmation':
        case 'requires_action':
        case 'requires_capture':
          status = 'pending';
          break;
        case 'canceled':
          status = 'failed';
          break;
        default:
          status = 'pending';
      }

      const paymentMethod = paymentIntent.payment_method;
      let paymentMethodInfo;
      if (paymentMethod && typeof paymentMethod === 'object') {
        paymentMethodInfo = {
          type: paymentMethod.type,
          last4: paymentMethod.card?.last4,
          brand: paymentMethod.card?.brand,
        };
      }

      return {
        status,
        externalId: paymentIntent.id,
        paymentMethod: paymentMethodInfo,
        failureReason:
          paymentIntent.last_payment_error?.message ?? undefined,
      };
    } catch (error) {
      this.logger.error('Failed to get payment status from Stripe', error);
      throw error;
    }
  }

  async createRefund(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<RefundResult> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentId,
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100);
      }

      if (reason) {
        refundParams.reason = 'requested_by_customer';
      }

      const refund = await this.stripe.refunds.create(refundParams);

      return {
        refundId: refund.id,
        status: refund.status === 'succeeded' ? 'succeeded' : 'pending',
        amount: refund.amount / 100,
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe refund', error);
      throw error;
    }
  }

  async cancelSubscription(externalId: string): Promise<void> {
    try {
      await this.stripe.subscriptions.cancel(externalId);
    } catch (error) {
      this.logger.error('Failed to cancel Stripe subscription', error);
      throw error;
    }
  }

  async validateWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<WebhookValidationResult> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      return {
        valid: true,
        eventId: event.id,
        eventType: event.type,
        data: event.data.object,
      };
    } catch (error) {
      this.logger.error('Stripe webhook validation failed', error);
      return {
        valid: false,
      };
    }
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return this.stripe.invoices.retrieve(invoiceId);
  }
}
