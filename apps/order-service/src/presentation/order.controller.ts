/**
 * Order REST controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsPositive, Min } from 'class-validator';
import { CommandBus, QueryBus } from '@flexobo/core';
import { VersionInterceptor, ApiVersion } from '@flexobo/core';
import { Traced } from '@flexobo/core';
import {
  CreateOrderCommand,
  AddOrderItemCommand,
  ConfirmOrderCommand,
  CancelOrderCommand,
  ShipOrderCommand,
} from '../application/commands/order.commands';
import {
  GetOrderByIdQuery,
  GetOrdersByUserQuery,
} from '../application/queries/order.queries';

// ============================================================
// DTOs
// ============================================================

export class CreateOrderDto {
  @ApiProperty({ description: 'User ID who is creating the order', example: 'user-123' })
  @IsString()
  userId!: string;
}

export class CreateOrderResponseDto {
  @ApiProperty({ description: 'Created order ID', example: 'order-1234567890-abc123' })
  orderId!: string;
}

export class AddOrderItemDto {
  @ApiProperty({ description: 'Product ID', example: 'product-456' })
  @IsString()
  productId!: string;

  @ApiProperty({ description: 'Product name', example: 'Laptop' })
  @IsString()
  productName!: string;

  @ApiProperty({ description: 'Quantity of the product', example: 2, minimum: 1 })
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
  @ApiProperty({ description: 'Reason for cancellation', example: 'Customer requested cancellation' })
  @IsString()
  reason!: string;
}

export class ShipOrderDto {
  @ApiProperty({ description: 'Shipping tracking number', example: 'TRACK123456789' })
  @IsString()
  trackingNumber!: string;
}

// ============================================================
// Controller v1
// ============================================================

@ApiTags('Orders')
@ApiVersion('1.0.0')
@Controller('v1/orders')
@UseInterceptors(VersionInterceptor)
export class OrderController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  /**
   * Create new order
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Traced('OrderController.createOrder')
  @ApiOperation({
    summary: 'Create a new order',
    description: 'Creates a new order for a specific user',
    operationId: 'createOrder'
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: CreateOrderResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: CreateOrderDto })
  async createOrder(@Body() dto: CreateOrderDto): Promise<CreateOrderResponseDto> {
    const orderId = `order-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    await this.commandBus.execute(new CreateOrderCommand(orderId, dto.userId));

    return { orderId };
  }

  /**
   * Get order by ID
   */
  @Get(':orderId')
  @Traced('OrderController.getOrder')
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Retrieves detailed information about a specific order',
    operationId: 'getOrderById'
  })
  @ApiParam({ name: 'orderId', description: 'Order ID', example: 'order-1234567890-abc123' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrder(@Param('orderId') orderId: string) {
    const order = await this.queryBus.execute(new GetOrderByIdQuery(orderId));

    if (!order) {
      return { error: 'Order not found' };
    }

    return order;
  }

  /**
   * Get orders by user
   */
  @Get('user/:userId')
  @Traced('OrderController.getOrdersByUser')
  @ApiOperation({
    summary: 'Get orders by user',
    description: 'Retrieves all orders for a specific user',
    operationId: 'getOrdersByUser'
  })
  @ApiParam({ name: 'userId', description: 'User ID', example: 'user-123' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async getOrdersByUser(@Param('userId') userId: string) {
    return await this.queryBus.execute(new GetOrdersByUserQuery(userId));
  }

  /**
   * Add item to order
   */
  @Post(':orderId/items')
  @Traced('OrderController.addItem')
  @ApiOperation({
    summary: 'Add item to order',
    description: 'Adds a new item to an existing order',
    operationId: 'addItemToOrder'
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiBody({ type: AddOrderItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item added successfully',
    type: SuccessResponseDto
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async addItem(
    @Param('orderId') orderId: string,
    @Body() dto: AddOrderItemDto
  ): Promise<SuccessResponseDto> {
    await this.commandBus.execute(
      new AddOrderItemCommand(
        orderId,
        dto.productId,
        dto.productName,
        dto.quantity,
        dto.price,
        dto.currency
      )
    );

    return { success: true };
  }

  /**
   * Confirm order
   */
  @Put(':orderId/confirm')
  @Traced('OrderController.confirmOrder')
  @ApiOperation({
    summary: 'Confirm order',
    description: 'Confirms an order and prepares it for processing',
    operationId: 'confirmOrder'
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order confirmed successfully',
    type: SuccessResponseDto
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async confirmOrder(@Param('orderId') orderId: string): Promise<SuccessResponseDto> {
    await this.commandBus.execute(new ConfirmOrderCommand(orderId));
    return { success: true };
  }

  /**
   * Cancel order
   */
  @Delete(':orderId')
  @Traced('OrderController.cancelOrder')
  @ApiOperation({
    summary: 'Cancel order',
    description: 'Cancels an existing order with a reason',
    operationId: 'cancelOrder'
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiBody({ type: CancelOrderDto })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
    type: SuccessResponseDto
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto
  ): Promise<SuccessResponseDto> {
    await this.commandBus.execute(new CancelOrderCommand(orderId, dto.reason));
    return { success: true };
  }

  /**
   * Ship order
   */
  @Put(':orderId/ship')
  @Traced('OrderController.shipOrder')
  @ApiOperation({
    summary: 'Ship order',
    description: 'Marks an order as shipped with tracking information',
    operationId: 'shipOrder'
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiBody({ type: ShipOrderDto })
  @ApiResponse({
    status: 200,
    description: 'Order shipped successfully',
    type: SuccessResponseDto
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async shipOrder(
    @Param('orderId') orderId: string,
    @Body() dto: ShipOrderDto
  ): Promise<SuccessResponseDto> {
    await this.commandBus.execute(
      new ShipOrderCommand(orderId, dto.trackingNumber)
    );
    return { success: true };
  }
}
