/**
 * Order REST Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  HttpCode,
  HttpStatus,
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
import {
  CreateOrderCommand,
  AddOrderItemCommand,
  ConfirmOrderCommand,
  CancelOrderCommand,
  ShipOrderCommand,
} from '../../../application/commands/order.commands';
import {
  GetOrderByIdQuery,
  GetOrdersByUserQuery,
  GetAllOrdersQuery,
} from '../../../application/queries/order.queries';
import { CheckoutUseCase } from '../../../application/use-cases/checkout.use-case';
import {
  CreateOrderDto,
  CreateOrderResponseDto,
  AddOrderItemDto,
  SuccessResponseDto,
  CancelOrderDto,
  ShipOrderDto,
  CheckoutDto,
  CheckoutResponseDto,
} from './dto/order.dto';

@ApiTags('Orders')
@ApiVersion('1.0.0')
@Controller('v1/orders')
@UseInterceptors(VersionInterceptor)
export class OrderController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly checkoutUseCase: CheckoutUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new order',
    description: 'Creates a new order for a specific user',
    operationId: 'createOrder',
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: CreateOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: CreateOrderDto })
  async createOrder(
    @Body() dto: CreateOrderDto
  ): Promise<CreateOrderResponseDto> {
    const orderId = `order-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    await this.commandBus.execute(new CreateOrderCommand(orderId, dto.userId));

    return { orderId };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all orders',
    description: 'Retrieves all orders with pagination support',
    operationId: 'getAllOrders',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of orders to return (default: 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of orders to skip (default: 0)',
  })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @Traced('OrderController.getAllOrders')
  async getAllOrders(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return await this.queryBus.execute(
      new GetAllOrdersQuery(
        limit ? parseInt(limit, 10) : undefined,
        offset ? parseInt(offset, 10) : undefined
      )
    );
  }

  @Get(':orderId')
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Retrieves detailed information about a specific order',
    operationId: 'getOrderById',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order ID',
    example: 'order-1234567890-abc123',
  })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Traced('OrderController.getOrder')
  async getOrder(@Param('orderId') orderId: string) {
    const order = await this.queryBus.execute(new GetOrderByIdQuery(orderId));

    if (!order) {
      return { error: 'Order not found' };
    }

    return order;
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get orders by user',
    description: 'Retrieves all orders for a specific user',
    operationId: 'getOrdersByUser',
  })
  @ApiParam({ name: 'userId', description: 'User ID', example: 'user-123' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @Traced('OrderController.getOrdersByUser')
  async getOrdersByUser(@Param('userId') userId: string) {
    return await this.queryBus.execute(new GetOrdersByUserQuery(userId));
  }

  @Post(':orderId/items')
  @ApiOperation({
    summary: 'Add item to order',
    description: 'Adds a new item to an existing order',
    operationId: 'addItemToOrder',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiBody({ type: AddOrderItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item added successfully',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Traced('OrderController.addItem')
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

  @Put(':orderId/confirm')
  @ApiOperation({
    summary: 'Confirm order',
    description: 'Confirms an order and prepares it for processing',
    operationId: 'confirmOrder',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order confirmed successfully',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Traced('OrderController.confirmOrder')
  async confirmOrder(
    @Param('orderId') orderId: string
  ): Promise<SuccessResponseDto> {
    await this.commandBus.execute(new ConfirmOrderCommand(orderId));
    return { success: true };
  }

  @Delete(':orderId')
  @ApiOperation({
    summary: 'Cancel order',
    description: 'Cancels an existing order with a reason',
    operationId: 'cancelOrder',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiBody({ type: CancelOrderDto })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Traced('OrderController.cancelOrder')
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto
  ): Promise<SuccessResponseDto> {
    await this.commandBus.execute(new CancelOrderCommand(orderId, dto.reason));
    return { success: true };
  }

  @Put(':orderId/ship')
  @ApiOperation({
    summary: 'Ship order',
    description: 'Marks an order as shipped with tracking information',
    operationId: 'shipOrder',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiBody({ type: ShipOrderDto })
  @ApiResponse({
    status: 200,
    description: 'Order shipped successfully',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Traced('OrderController.shipOrder')
  async shipOrder(
    @Param('orderId') orderId: string,
    @Body() dto: ShipOrderDto
  ): Promise<SuccessResponseDto> {
    await this.commandBus.execute(
      new ShipOrderCommand(orderId, dto.trackingNumber)
    );
    return { success: true };
  }

  @Post(':orderId/checkout')
  @ApiOperation({
    summary: 'Checkout order',
    description:
      'Processes checkout: validates order, creates payment, and confirms order',
    operationId: 'checkoutOrder',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiBody({ type: CheckoutDto })
  @ApiResponse({
    status: 200,
    description: 'Checkout completed',
    type: CheckoutResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Checkout failed' })
  @Traced('OrderController.checkout')
  async checkout(
    @Param('orderId') orderId: string,
    @Body() dto: CheckoutDto
  ): Promise<CheckoutResponseDto> {
    return this.checkoutUseCase.execute({
      orderId,
      paymentMethod: dto.paymentMethod,
      currency: dto.currency,
    });
  }
}
