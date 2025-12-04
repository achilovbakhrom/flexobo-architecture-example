import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ClickProvider,
  ClickPrepareRequest,
  ClickCompleteRequest,
  ClickCallbackResponse,
} from '../../payment-providers/click.provider';
import {
  ProcessPaymentCommand,
  SucceedPaymentCommand,
  FailPaymentCommand,
} from '../../../application/commands/payment';
import {
  ActivateSubscriptionCommand,
} from '../../../application/commands/subscription';
import {
  GetPaymentByExternalIdQuery,
  PaymentDto,
} from '../../../application/queries/payment';
import {
  GetSubscriptionQuery,
  SubscriptionDto,
} from '../../../application/queries/subscription';
import { GetPlanQuery, PlanDto } from '../../../application/queries/plan';
import { PaymentProvider, PaymentStatus } from '../../../domain/constants/enums';

// Store prepare IDs in memory (in production, use Redis or database)
const prepareIdStore = new Map<string, { prepareId: number; amount: number }>();

@Controller('webhooks/click')
export class ClickWebhookController {
  private readonly logger = new Logger(ClickWebhookController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly clickProvider: ClickProvider,
  ) {}

  /**
   * PREPARE callback - Click.uz validates the order before payment
   */
  @Post('prepare')
  @HttpCode(HttpStatus.OK)
  async handlePrepare(@Body() request: ClickPrepareRequest): Promise<ClickCallbackResponse> {
    this.logger.log(
      `Click.uz PREPARE callback: trans_id=${request.click_trans_id}, merchant_trans_id=${request.merchant_trans_id}`,
    );

    try {
      // The merchant_trans_id is our subscription ID
      const subscriptionId = request.merchant_trans_id;

      // Get subscription to validate
      const subscription = await this.queryBus.execute<
        GetSubscriptionQuery,
        SubscriptionDto | null
      >(new GetSubscriptionQuery(subscriptionId));

      if (!subscription) {
        this.logger.warn(`Subscription ${subscriptionId} not found`);
        return {
          click_trans_id: request.click_trans_id,
          merchant_trans_id: request.merchant_trans_id,
          error: -5,
          error_note: 'Subscription not found',
        };
      }

      // Get plan to get expected amount
      const plan = await this.queryBus.execute<GetPlanQuery, PlanDto | null>(
        new GetPlanQuery(subscription.planId),
      );

      if (!plan) {
        return {
          click_trans_id: request.click_trans_id,
          merchant_trans_id: request.merchant_trans_id,
          error: -5,
          error_note: 'Plan not found',
        };
      }

      // Expected amount (convert to UZS if needed, for now assume UZS)
      const expectedAmount = plan.priceMonthly; // Or calculate based on billing cycle

      // Validate prepare callback
      const response = this.clickProvider.validatePrepareCallback(
        request,
        expectedAmount,
      );

      if (response.error === 0 && response.merchant_prepare_id) {
        // Store prepare ID for complete callback
        prepareIdStore.set(subscriptionId, {
          prepareId: response.merchant_prepare_id,
          amount: request.amount,
        });

        // Find and update payment status
        const payment = await this.findPaymentBySubscription(subscriptionId);
        if (payment) {
          await this.commandBus.execute(
            new ProcessPaymentCommand(payment.id, request.click_trans_id.toString()),
          );
        }

        this.logger.log(
          `PREPARE successful for subscription ${subscriptionId}, prepare_id=${response.merchant_prepare_id}`,
        );
      }

      return response;
    } catch (error) {
      this.logger.error(
        `PREPARE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        click_trans_id: request.click_trans_id,
        merchant_trans_id: request.merchant_trans_id,
        error: -9,
        error_note: 'Internal error',
      };
    }
  }

  /**
   * COMPLETE callback - Click.uz confirms the payment
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async handleComplete(@Body() request: ClickCompleteRequest): Promise<ClickCallbackResponse> {
    this.logger.log(
      `Click.uz COMPLETE callback: trans_id=${request.click_trans_id}, merchant_trans_id=${request.merchant_trans_id}`,
    );

    try {
      const subscriptionId = request.merchant_trans_id;

      // Get stored prepare data
      const prepareData = prepareIdStore.get(subscriptionId);
      if (!prepareData) {
        return {
          click_trans_id: request.click_trans_id,
          merchant_trans_id: request.merchant_trans_id,
          error: -6,
          error_note: 'Transaction not prepared',
        };
      }

      // Validate complete callback
      const response = this.clickProvider.validateCompleteCallback(
        request,
        prepareData.amount,
        prepareData.prepareId,
      );

      if (response.error === 0) {
        // Payment succeeded
        const payment = await this.findPaymentBySubscription(subscriptionId);
        if (payment) {
          await this.commandBus.execute(
            new SucceedPaymentCommand(
              payment.id,
              request.click_trans_id.toString(),
              {
                type: 'click',
              },
            ),
          );

          // Activate subscription
          await this.commandBus.execute(
            new ActivateSubscriptionCommand(
              subscriptionId,
              PaymentProvider.CLICK,
              request.click_trans_id.toString(),
            ),
          );

          this.logger.log(
            `Payment and subscription ${subscriptionId} activated via Click.uz`,
          );
        }

        // Clean up prepare data
        prepareIdStore.delete(subscriptionId);
      } else {
        // Payment failed
        const payment = await this.findPaymentBySubscription(subscriptionId);
        if (payment) {
          await this.commandBus.execute(
            new FailPaymentCommand(payment.id, response.error_note),
          );
        }
        prepareIdStore.delete(subscriptionId);
      }

      return response;
    } catch (error) {
      this.logger.error(
        `COMPLETE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        click_trans_id: request.click_trans_id,
        merchant_trans_id: request.merchant_trans_id,
        error: -9,
        error_note: 'Internal error',
      };
    }
  }

  private async findPaymentBySubscription(
    subscriptionId: string,
  ): Promise<PaymentDto | null> {
    // In a real implementation, you'd query payments by subscription ID
    // For now, we use the external ID lookup
    const payment = await this.queryBus.execute<
      GetPaymentByExternalIdQuery,
      PaymentDto | null
    >(new GetPaymentByExternalIdQuery(PaymentProvider.CLICK, subscriptionId));

    return payment;
  }
}
