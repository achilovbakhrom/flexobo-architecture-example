/**
 * Payment REST Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@flexobo/core';
import { VersionInterceptor, ApiVersion } from '@flexobo/core';
import { Traced } from '@flexobo/core';
import { randomUUID } from 'crypto';
import {
  CreatePaymentCommand,
  ProcessPaymentCommand,
  CompletePaymentCommand,
  FailPaymentCommand,
  RefundPaymentCommand,
} from '../../../application/commands/payment.commands';
import {
  GetPaymentByIdQuery,
  GetPaymentsByOrderQuery,
  GetPaymentsByStatusQuery,
  GetPaymentByTransactionIdQuery,
} from '../../../application/queries/payment.queries';
import {
  CreatePaymentRequestDto,
  CreatePaymentResponseDto,
  CompletePaymentRequestDto,
  FailPaymentRequestDto,
  RefundPaymentRequestDto,
  PaymentResponseDto,
} from './dto/payment.dto';
import { SuccessResponseDto } from './dto/order.dto';
import { PaymentDto } from '../../../application/dto/payment.dto';

@ApiTags('Payments')
@ApiVersion('1.0.0')
@Controller('v1/payments')
@UseInterceptors(VersionInterceptor)
export class PaymentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new payment',
    description: 'Creates a new payment for an order',
    operationId: 'createPayment',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    type: CreatePaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: CreatePaymentRequestDto })
  @Traced('PaymentController.createPayment')
  async createPayment(
    @Body() dto: CreatePaymentRequestDto
  ): Promise<CreatePaymentResponseDto> {
    const paymentId = randomUUID();

    const result = await this.commandBus.execute(
      new CreatePaymentCommand({
        paymentId,
        orderId: dto.orderId,
        amount: dto.amount,
        currency: dto.currency,
        paymentMethod: dto.paymentMethod,
      })
    );

    if (result.isFailure) {
      throw new Error(result.error?.message || 'Failed to create payment');
    }

    return { paymentId };
  }

  @Get(':paymentId')
  @ApiOperation({
    summary: 'Get payment by ID',
    description: 'Retrieves a payment by its ID',
    operationId: 'getPaymentById',
  })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment found',
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @Traced('PaymentController.getPaymentById')
  async getPaymentById(
    @Param('paymentId') paymentId: string
  ): Promise<PaymentDto> {
    const payment = await this.queryBus.execute<PaymentDto | null>(
      new GetPaymentByIdQuery(paymentId)
    );

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  @Get('order/:orderId')
  @ApiOperation({
    summary: 'Get payments by order',
    description: 'Retrieves all payments for an order',
    operationId: 'getPaymentsByOrder',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved',
    type: [PaymentResponseDto],
  })
  @Traced('PaymentController.getPaymentsByOrder')
  async getPaymentsByOrder(
    @Param('orderId') orderId: string
  ): Promise<PaymentDto[]> {
    return this.queryBus.execute<PaymentDto[]>(
      new GetPaymentsByOrderQuery(orderId)
    );
  }

  @Get('status/:status')
  @ApiOperation({
    summary: 'Get payments by status',
    description: 'Retrieves payments by their status',
    operationId: 'getPaymentsByStatus',
  })
  @ApiParam({
    name: 'status',
    description: 'Payment status',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved',
    type: [PaymentResponseDto],
  })
  @Traced('PaymentController.getPaymentsByStatus')
  async getPaymentsByStatus(
    @Param('status') status: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<PaymentDto[]> {
    return this.queryBus.execute<PaymentDto[]>(
      new GetPaymentsByStatusQuery(status, { limit, offset })
    );
  }

  @Get('transaction/:transactionId')
  @ApiOperation({
    summary: 'Get payment by transaction ID',
    description: 'Retrieves a payment by its external transaction ID',
    operationId: 'getPaymentByTransactionId',
  })
  @ApiParam({ name: 'transactionId', description: 'External transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment found',
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @Traced('PaymentController.getPaymentByTransactionId')
  async getPaymentByTransactionId(
    @Param('transactionId') transactionId: string
  ): Promise<PaymentDto> {
    const payment = await this.queryBus.execute<PaymentDto | null>(
      new GetPaymentByTransactionIdQuery(transactionId)
    );

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  @Put(':paymentId/process')
  @ApiOperation({
    summary: 'Process payment',
    description: 'Starts processing a pending payment',
    operationId: 'processPayment',
  })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment processing started',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @Traced('PaymentController.processPayment')
  async processPayment(
    @Param('paymentId') paymentId: string
  ): Promise<SuccessResponseDto> {
    const result = await this.commandBus.execute(
      new ProcessPaymentCommand(paymentId)
    );

    if (result.isFailure) {
      throw new NotFoundException(result.error?.message || 'Payment not found');
    }

    return { success: true };
  }

  @Put(':paymentId/complete')
  @ApiOperation({
    summary: 'Complete payment',
    description: 'Marks a payment as completed with transaction ID',
    operationId: 'completePayment',
  })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiBody({ type: CompletePaymentRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Payment completed',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @Traced('PaymentController.completePayment')
  async completePayment(
    @Param('paymentId') paymentId: string,
    @Body() dto: CompletePaymentRequestDto
  ): Promise<SuccessResponseDto> {
    const result = await this.commandBus.execute(
      new CompletePaymentCommand(paymentId, dto.transactionId)
    );

    if (result.isFailure) {
      throw new NotFoundException(result.error?.message || 'Payment not found');
    }

    return { success: true };
  }

  @Put(':paymentId/fail')
  @ApiOperation({
    summary: 'Fail payment',
    description: 'Marks a payment as failed with a reason',
    operationId: 'failPayment',
  })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiBody({ type: FailPaymentRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Payment marked as failed',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @Traced('PaymentController.failPayment')
  async failPayment(
    @Param('paymentId') paymentId: string,
    @Body() dto: FailPaymentRequestDto
  ): Promise<SuccessResponseDto> {
    const result = await this.commandBus.execute(
      new FailPaymentCommand(paymentId, dto.reason)
    );

    if (result.isFailure) {
      throw new NotFoundException(result.error?.message || 'Payment not found');
    }

    return { success: true };
  }

  @Post(':paymentId/refund')
  @ApiOperation({
    summary: 'Refund payment',
    description: 'Refunds a completed payment (full or partial)',
    operationId: 'refundPayment',
  })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiBody({ type: RefundPaymentRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Payment refunded',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @Traced('PaymentController.refundPayment')
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() dto: RefundPaymentRequestDto
  ): Promise<SuccessResponseDto> {
    const result = await this.commandBus.execute(
      new RefundPaymentCommand(paymentId, dto.amount, dto.reason)
    );

    if (result.isFailure) {
      throw new NotFoundException(result.error?.message || 'Payment not found');
    }

    return { success: true };
  }
}
