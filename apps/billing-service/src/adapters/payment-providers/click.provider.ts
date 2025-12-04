import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentProvider } from '../../domain/constants/enums';
import {
  IPaymentProvider,
  CreatePaymentOrderParams,
  PaymentOrder,
  PaymentStatusResult,
  RefundResult,
  WebhookValidationResult,
} from '../../ports/payment-provider.interface';

export interface ClickPrepareRequest {
  click_trans_id: number;
  service_id: number;
  click_paydoc_id: number;
  merchant_trans_id: string;
  amount: number;
  action: number;
  error: number;
  error_note: string;
  sign_time: string;
  sign_string: string;
}

export interface ClickCompleteRequest {
  click_trans_id: number;
  service_id: number;
  click_paydoc_id: number;
  merchant_trans_id: string;
  merchant_prepare_id: number;
  amount: number;
  action: number;
  error: number;
  error_note: string;
  sign_time: string;
  sign_string: string;
}

export interface ClickCallbackResponse {
  click_trans_id: number;
  merchant_trans_id: string;
  merchant_prepare_id?: number;
  merchant_confirm_id?: number;
  error: number;
  error_note: string;
}

@Injectable()
export class ClickProvider implements IPaymentProvider {
  private readonly logger = new Logger(ClickProvider.name);
  private readonly merchantId: string;
  private readonly serviceId: string;
  private readonly secretKey: string;
  private readonly apiUrl: string;

  readonly provider = PaymentProvider.CLICK;

  constructor(private readonly configService: ConfigService) {
    this.merchantId = this.configService.get<string>('CLICK_MERCHANT_ID', '');
    this.serviceId = this.configService.get<string>('CLICK_SERVICE_ID', '');
    this.secretKey = this.configService.get<string>('CLICK_SECRET_KEY', '');
    this.apiUrl = this.configService.get<string>(
      'CLICK_API_URL',
      'https://api.click.uz'
    );
  }

  async createPaymentOrder(
    params: CreatePaymentOrderParams
  ): Promise<PaymentOrder> {
    try {
      // Click.uz doesn't have a direct API for creating orders
      // Instead, we generate a payment URL with parameters
      const orderId = params.subscriptionId;

      // Build the payment URL
      const baseUrl = 'https://my.click.uz/services/pay';
      const queryParams = new URLSearchParams({
        service_id: this.serviceId,
        merchant_id: this.merchantId,
        amount: params.amount.toString(),
        transaction_param: orderId,
        return_url: params.returnUrl,
      });

      const paymentUrl = `${baseUrl}?${queryParams.toString()}`;

      return {
        orderId,
        paymentUrl,
      };
    } catch (error) {
      this.logger.error('Failed to create Click.uz payment order', error);
      throw error;
    }
  }

  async getPaymentStatus(externalId: string): Promise<PaymentStatusResult> {
    // Click.uz status is managed through callbacks
    // This would need to check your local database
    return {
      status: 'pending',
      externalId,
    };
  }

  async createRefund(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<RefundResult> {
    // Click.uz refunds are typically handled manually or through their merchant portal
    this.logger.warn(
      `Click.uz refund requested for ${paymentId}, amount: ${amount}, reason: ${reason}`
    );

    throw new Error('Click.uz refunds must be processed through the merchant portal');
  }

  async validateWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<WebhookValidationResult> {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

      // Validate signature
      const isValid = this.validateSignature(data, signature);

      if (!isValid) {
        return { valid: false };
      }

      return {
        valid: true,
        eventId: data.click_trans_id?.toString(),
        eventType: data.action === 0 ? 'prepare' : 'complete',
        data,
      };
    } catch (error) {
      this.logger.error('Click.uz webhook validation failed', error);
      return { valid: false };
    }
  }

  /**
   * Validate PREPARE callback from Click.uz
   */
  validatePrepareCallback(
    request: ClickPrepareRequest,
    expectedAmount: number
  ): ClickCallbackResponse {
    // Validate signature
    const signString = this.generateSignString(
      request.click_trans_id,
      request.service_id,
      this.secretKey,
      request.merchant_trans_id,
      request.amount,
      request.action,
      request.sign_time
    );

    if (signString !== request.sign_string) {
      return {
        click_trans_id: request.click_trans_id,
        merchant_trans_id: request.merchant_trans_id,
        error: -1,
        error_note: 'Invalid signature',
      };
    }

    // Validate amount
    if (request.amount !== expectedAmount) {
      return {
        click_trans_id: request.click_trans_id,
        merchant_trans_id: request.merchant_trans_id,
        error: -2,
        error_note: 'Incorrect amount',
      };
    }

    // Validate action (should be 0 for prepare)
    if (request.action !== 0) {
      return {
        click_trans_id: request.click_trans_id,
        merchant_trans_id: request.merchant_trans_id,
        error: -3,
        error_note: 'Invalid action',
      };
    }

    // Success
    return {
      click_trans_id: request.click_trans_id,
      merchant_trans_id: request.merchant_trans_id,
      merchant_prepare_id: Date.now(), // Use timestamp as prepare ID
      error: 0,
      error_note: 'Success',
    };
  }

  /**
   * Validate COMPLETE callback from Click.uz
   */
  validateCompleteCallback(
    request: ClickCompleteRequest,
    expectedAmount: number,
    expectedPrepareId: number
  ): ClickCallbackResponse {
    // Validate signature
    const signString = this.generateSignString(
      request.click_trans_id,
      request.service_id,
      this.secretKey,
      request.merchant_trans_id,
      request.merchant_prepare_id,
      request.amount,
      request.action,
      request.sign_time
    );

    if (signString !== request.sign_string) {
      return {
        click_trans_id: request.click_trans_id,
        merchant_trans_id: request.merchant_trans_id,
        error: -1,
        error_note: 'Invalid signature',
      };
    }

    // Validate prepare ID
    if (request.merchant_prepare_id !== expectedPrepareId) {
      return {
        click_trans_id: request.click_trans_id,
        merchant_trans_id: request.merchant_trans_id,
        error: -4,
        error_note: 'Invalid prepare ID',
      };
    }

    // Validate amount
    if (request.amount !== expectedAmount) {
      return {
        click_trans_id: request.click_trans_id,
        merchant_trans_id: request.merchant_trans_id,
        error: -2,
        error_note: 'Incorrect amount',
      };
    }

    // Check if Click.uz reported an error
    if (request.error !== 0) {
      return {
        click_trans_id: request.click_trans_id,
        merchant_trans_id: request.merchant_trans_id,
        error: request.error,
        error_note: request.error_note,
      };
    }

    // Success
    return {
      click_trans_id: request.click_trans_id,
      merchant_trans_id: request.merchant_trans_id,
      merchant_confirm_id: Date.now(),
      error: 0,
      error_note: 'Success',
    };
  }

  private validateSignature(
    data: ClickPrepareRequest | ClickCompleteRequest,
    expectedSignature: string
  ): boolean {
    const signString = this.generateSignString(
      data.click_trans_id,
      data.service_id,
      this.secretKey,
      data.merchant_trans_id,
      'merchant_prepare_id' in data ? data.merchant_prepare_id : undefined,
      data.amount,
      data.action,
      data.sign_time
    );
    return signString === expectedSignature;
  }

  private generateSignString(
    clickTransId: number,
    serviceId: number,
    secretKey: string,
    merchantTransId: string,
    merchantPrepareIdOrAmount?: number,
    amountOrAction?: number,
    actionOrSignTime?: number | string,
    signTime?: string
  ): string {
    let stringToHash: string;

    if (typeof actionOrSignTime === 'string') {
      // Prepare request format
      stringToHash = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${merchantPrepareIdOrAmount}${amountOrAction}${actionOrSignTime}`;
    } else {
      // Complete request format
      stringToHash = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${merchantPrepareIdOrAmount}${amountOrAction}${actionOrSignTime}${signTime}`;
    }

    return crypto.createHash('md5').update(stringToHash).digest('hex');
  }
}
