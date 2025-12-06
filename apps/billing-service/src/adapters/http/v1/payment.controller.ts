import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@flexobo/shared-kernel';
import { PaymentProvider, PaymentType, BillingCycle } from '../../../domain/constants/enums';
import {
  InitiatePaymentCommand,
  RefundPaymentCommand,
} from '../../../application/commands/payment';
import {
  GetPaymentQuery,
  ListPaymentsByCompanyQuery,
  PaymentDto,
  PaymentListResult,
} from '../../../application/queries/payment';
import {
  GetSubscriptionByCompanyQuery,
  SubscriptionDto,
} from '../../../application/queries/subscription';
import { GetPlanQuery, PlanDto } from '../../../application/queries/plan';
import { StripeProvider } from '../../payment-providers/stripe.provider';
import { ClickProvider } from '../../payment-providers/click.provider';
import {
  CreateCheckoutSessionDto,
  CreateClickOrderDto,
  RefundPaymentDto,
  PaymentResponseDto,
  PaymentListResponseDto,
  CheckoutSessionResponseDto,
  ClickOrderResponseDto,
} from '../dto/payment.dto';

@Controller('v1/payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly stripeProvider: StripeProvider,
    private readonly clickProvider: ClickProvider,
  ) {}

  @Post('create-checkout')
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CheckoutSessionResponseDto> {
    if (!user.companyId) {
      throw new BadRequestException('User must have a company');
    }

    // Get subscription
    const subscription = await this.queryBus.execute<
      GetSubscriptionByCompanyQuery,
      SubscriptionDto | null
    >(new GetSubscriptionByCompanyQuery(user.companyId));

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.id !== dto.subscriptionId) {
      throw new ForbiddenException('Cannot access this subscription');
    }

    // Get plan for pricing
    const plan = await this.queryBus.execute<GetPlanQuery, PlanDto | null>(
      new GetPlanQuery(subscription.planId),
    );

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const amount =
      dto.billingCycle === BillingCycle.YEARLY
        ? plan.priceYearly
        : plan.priceMonthly;

    const billingCycleParam: 'monthly' | 'yearly' =
      dto.billingCycle === BillingCycle.YEARLY ? 'yearly' : 'monthly';

    // Create Stripe checkout session
    const session = await this.stripeProvider.createCheckoutSession({
      subscriptionId: subscription.id,
      companyId: user.companyId,
      planId: subscription.planId,
      amount,
      currency: plan.currency,
      planName: plan.displayName,
      billingCycle: billingCycleParam,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      customerEmail: user.email,
    });

    // Initiate payment record
    await this.commandBus.execute(
      new InitiatePaymentCommand(
        uuidv4(),
        subscription.id,
        user.companyId,
        amount,
        plan.currency,
        PaymentProvider.STRIPE,
        PaymentType.SUBSCRIPTION,
        session.sessionId,
      ),
    );

    return {
      sessionId: session.sessionId,
      url: session.checkoutUrl,
    };
  }

  @Post('create-click-order')
  async createClickOrder(
    @Body() dto: CreateClickOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClickOrderResponseDto> {
    if (!user.companyId) {
      throw new BadRequestException('User must have a company');
    }

    // Get subscription
    const subscription = await this.queryBus.execute<
      GetSubscriptionByCompanyQuery,
      SubscriptionDto | null
    >(new GetSubscriptionByCompanyQuery(user.companyId));

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.id !== dto.subscriptionId) {
      throw new ForbiddenException('Cannot access this subscription');
    }

    // Create Click.uz payment order
    const order = await this.clickProvider.createPaymentOrder({
      subscriptionId: subscription.id,
      companyId: user.companyId,
      amount: dto.amount,
      currency: 'UZS',
      description: `Subscription payment for ${subscription.id}`,
      returnUrl: dto.returnUrl,
    });

    // Initiate payment record
    await this.commandBus.execute(
      new InitiatePaymentCommand(
        uuidv4(),
        subscription.id,
        user.companyId,
        dto.amount,
        'UZS',
        PaymentProvider.CLICK,
        PaymentType.SUBSCRIPTION,
        order.orderId,
      ),
    );

    return {
      orderId: order.orderId,
      paymentUrl: order.paymentUrl,
    };
  }

  @Get()
  async listPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ): Promise<PaymentResponseDto[]> {
    if (!user.companyId) {
      throw new BadRequestException('User must have a company');
    }

    const payments = await this.queryBus.execute<
      ListPaymentsByCompanyQuery,
      PaymentDto[]
    >(new ListPaymentsByCompanyQuery(user.companyId, limit));

    return payments.map(this.toPaymentResponse);
  }

  @Get(':id')
  async getPayment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentResponseDto> {
    const payment = await this.queryBus.execute<GetPaymentQuery, PaymentDto | null>(
      new GetPaymentQuery(id),
    );

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.companyId !== user.companyId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Cannot access this payment');
    }

    return this.toPaymentResponse(payment);
  }

  @Post(':id/refund')
  async refundPayment(
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentResponseDto> {
    const payment = await this.queryBus.execute<GetPaymentQuery, PaymentDto | null>(
      new GetPaymentQuery(id),
    );

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.companyId !== user.companyId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Cannot refund this payment');
    }

    // Process refund via provider
    if (payment.provider === PaymentProvider.STRIPE && payment.externalId) {
      await this.stripeProvider.createRefund(
        payment.externalId,
        dto.amount,
        dto.reason,
      );
    } else if (payment.provider === PaymentProvider.CLICK) {
      // Click.uz refunds are manual
      throw new ForbiddenException(
        'Click.uz refunds must be processed through the merchant portal',
      );
    }

    // Update payment record
    await this.commandBus.execute(
      new RefundPaymentCommand(id, dto.amount, dto.reason),
    );

    const updatedPayment = await this.queryBus.execute<
      GetPaymentQuery,
      PaymentDto | null
    >(new GetPaymentQuery(id));

    return this.toPaymentResponse(updatedPayment!);
  }

  private toPaymentResponse(payment: PaymentDto): PaymentResponseDto {
    return {
      id: payment.id,
      subscriptionId: payment.subscriptionId,
      companyId: payment.companyId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      paymentType: payment.paymentType,
      paymentMethod: payment.paymentMethod,
      failureReason: payment.failureReason,
      createdAt: payment.createdAt,
    };
  }
}
