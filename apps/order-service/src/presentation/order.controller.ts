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

class CreateOrderDto {
  userId!: string;
}

class AddOrderItemDto {
  productId!: string;
  productName!: string;
  quantity!: number;
  price!: number;
  currency!: string;
}

class CancelOrderDto {
  reason!: string;
}

class ShipOrderDto {
  trackingNumber!: string;
}

// ============================================================
// Controller v1
// ============================================================

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
  async createOrder(@Body() dto: CreateOrderDto) {
    const orderId = `order-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    await this.commandBus.execute(new CreateOrderCommand(orderId, dto.userId));

    return { orderId };
  }

  /**
   * Get order by ID
   */
  @Get(':orderId')
  @Traced('OrderController.getOrder')
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
  async getOrdersByUser(@Param('userId') userId: string) {
    return await this.queryBus.execute(new GetOrdersByUserQuery(userId));
  }

  /**
   * Add item to order
   */
  @Post(':orderId/items')
  @Traced('OrderController.addItem')
  async addItem(
    @Param('orderId') orderId: string,
    @Body() dto: AddOrderItemDto
  ) {
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
  async confirmOrder(@Param('orderId') orderId: string) {
    await this.commandBus.execute(new ConfirmOrderCommand(orderId));
    return { success: true };
  }

  /**
   * Cancel order
   */
  @Delete(':orderId')
  @Traced('OrderController.cancelOrder')
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto
  ) {
    await this.commandBus.execute(new CancelOrderCommand(orderId, dto.reason));
    return { success: true };
  }

  /**
   * Ship order
   */
  @Put(':orderId/ship')
  @Traced('OrderController.shipOrder')
  async shipOrder(
    @Param('orderId') orderId: string,
    @Body() dto: ShipOrderDto
  ) {
    await this.commandBus.execute(
      new ShipOrderCommand(orderId, dto.trackingNumber)
    );
    return { success: true };
  }
}
