import {
  Controller,
  Post,
  Headers,
  Req,
  RawBodyRequest,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@flexobo/core';
import { Request } from 'express';
import { StripeProvider } from '../../payment-providers/stripe.provider';
import {
  ProcessPaymentCommand,
  SucceedPaymentCommand,
  FailPaymentCommand,
} from '../../../application/commands/payment';
import {
  ActivateSubscriptionCommand,
  CancelSubscriptionCommand,
} from '../../../application/commands/subscription';
import {
  GetPaymentByExternalIdQuery,
  PaymentDto,
} from '../../../application/queries/payment';
import { PaymentProvider, PaymentStatus } from '../../../domain/constants/enums';

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      customer?: string;
      subscription?: string;
      payment_intent?: string;
      amount_paid?: number;
      currency?: string;
      status?: string;
      metadata?: Record<string, string>;
      payment_method_details?: {
        type: string;
        card?: {
          brand: string;
          last4: string;
        };
      };
      last_payment_error?: {
        message: string;
      };
    };
  };
}

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly stripeProvider: StripeProvider,
  ) {}

  @Post()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    // Validate webhook signature
    const validation = await this.stripeProvider.validateWebhook(
      req.rawBody,
      signature,
    );

    if (!validation.valid) {
      this.logger.warn('Invalid Stripe webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = validation.data as StripeWebhookEvent;
    this.logger.log(`Received Stripe webhook: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event);
          break;

        case 'invoice.paid':
          await this.handleInvoicePaid(event);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing webhook ${event.type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw - we still acknowledge receipt
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(event: StripeWebhookEvent): Promise<void> {
    const session = event.data.object;
    const subscriptionId = session.metadata?.subscriptionId;

    if (!subscriptionId) {
      this.logger.warn('Checkout completed without subscriptionId metadata');
      return;
    }

    // Activate subscription
    const activateResult = await this.commandBus.execute(
      new ActivateSubscriptionCommand(
        subscriptionId,
        PaymentProvider.STRIPE,
        session.subscription ?? session.id,
      ),
    );

    if (activateResult.isFailure) {
      this.logger.error(`Failed to activate subscription ${subscriptionId}: ${activateResult.error}`);
      return;
    }

    this.logger.log(`Subscription ${subscriptionId} activated via Stripe checkout`);
  }

  private async handleInvoicePaid(event: StripeWebhookEvent): Promise<void> {
    const invoice = event.data.object;
    const paymentIntentId = invoice.payment_intent;

    if (!paymentIntentId) {
      return;
    }

    // Find payment by external ID
    const payment = await this.queryBus.execute<PaymentDto | null>(
      new GetPaymentByExternalIdQuery(PaymentProvider.STRIPE, paymentIntentId),
    );

    if (payment && payment.status !== PaymentStatus.SUCCEEDED) {
      const succeedResult = await this.commandBus.execute(
        new SucceedPaymentCommand(payment.id, paymentIntentId),
      );
      if (succeedResult.isFailure) {
        this.logger.error(`Failed to succeed payment ${payment.id}: ${succeedResult.error}`);
        return;
      }
      this.logger.log(`Payment ${payment.id} marked as succeeded from invoice.paid`);
    }
  }

  private async handleInvoicePaymentFailed(event: StripeWebhookEvent): Promise<void> {
    const invoice = event.data.object;
    const paymentIntentId = invoice.payment_intent;

    if (!paymentIntentId) {
      return;
    }

    const payment = await this.queryBus.execute<PaymentDto | null>(
      new GetPaymentByExternalIdQuery(PaymentProvider.STRIPE, paymentIntentId),
    );

    if (payment) {
      const reason =
        invoice.last_payment_error?.message ?? 'Payment failed';
      const failResult = await this.commandBus.execute(new FailPaymentCommand(payment.id, reason));
      if (failResult.isFailure) {
        this.logger.error(`Failed to mark payment ${payment.id} as failed: ${failResult.error}`);
        return;
      }
      this.logger.log(`Payment ${payment.id} marked as failed: ${reason}`);
    }
  }

  private async handleSubscriptionUpdated(event: StripeWebhookEvent): Promise<void> {
    const subscription = event.data.object;
    this.logger.log(
      `Subscription ${subscription.id} updated, status: ${subscription.status}`,
    );
    // Handle subscription updates (plan changes, status changes) if needed
  }

  private async handleSubscriptionDeleted(event: StripeWebhookEvent): Promise<void> {
    const subscription = event.data.object;
    const subscriptionId = subscription.metadata?.subscriptionId;

    if (subscriptionId) {
      const cancelResult = await this.commandBus.execute(
        new CancelSubscriptionCommand({
          subscriptionId,
          immediate: false,
          reason: 'Cancelled via Stripe',
        }),
      );
      if (cancelResult.isFailure) {
        this.logger.error(`Failed to cancel subscription ${subscriptionId}: ${cancelResult.error}`);
        return;
      }
      this.logger.log(`Subscription ${subscriptionId} cancelled via Stripe webhook`);
    }
  }

  private async handlePaymentIntentSucceeded(event: StripeWebhookEvent): Promise<void> {
    const paymentIntent = event.data.object;

    const payment = await this.queryBus.execute<PaymentDto | null>(
      new GetPaymentByExternalIdQuery(PaymentProvider.STRIPE, paymentIntent.id),
    );

    if (payment && payment.status !== PaymentStatus.SUCCEEDED) {
      const paymentMethod = paymentIntent.payment_method_details;
      const succeedResult = await this.commandBus.execute(
        new SucceedPaymentCommand(payment.id, paymentIntent.id, {
          type: paymentMethod?.type ?? 'unknown',
          last4: paymentMethod?.card?.last4,
          brand: paymentMethod?.card?.brand,
        }),
      );
      if (succeedResult.isFailure) {
        this.logger.error(`Failed to succeed payment ${payment.id}: ${succeedResult.error}`);
        return;
      }
      this.logger.log(`Payment ${payment.id} succeeded`);
    }
  }

  private async handlePaymentIntentFailed(event: StripeWebhookEvent): Promise<void> {
    const paymentIntent = event.data.object;

    const payment = await this.queryBus.execute<PaymentDto | null>(
      new GetPaymentByExternalIdQuery(PaymentProvider.STRIPE, paymentIntent.id),
    );

    if (payment) {
      const reason =
        paymentIntent.last_payment_error?.message ?? 'Payment failed';
      const failResult = await this.commandBus.execute(new FailPaymentCommand(payment.id, reason));
      if (failResult.isFailure) {
        this.logger.error(`Failed to fail payment ${payment.id}: ${failResult.error}`);
        return;
      }
      this.logger.log(`Payment ${payment.id} failed: ${reason}`);
    }
  }
}
