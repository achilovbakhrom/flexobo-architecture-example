/**
 * Order History REST Controller
 *
 * Provides read-only endpoints for querying order audit history.
 */

import {
  Controller,
  Get,
  Param,
  Query,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VersionInterceptor, ApiVersion } from '@flexobo/core';
import { Traced } from '@flexobo/core';
import { Inject } from '@nestjs/common';
import {
  IOrderHistoryRepository,
  ORDER_HISTORY_REPOSITORY,
} from '../../../ports/order-history.repository.port';
import {
  OrderHistoryResponseDto,
  OrderHistoryQueryParamsDto,
} from './dto/order-history.dto';

@ApiTags('Order History')
@ApiVersion('1.0.0')
@Controller('v1/order-history')
@UseInterceptors(VersionInterceptor)
export class OrderHistoryController {
  constructor(
    @Inject(ORDER_HISTORY_REPOSITORY)
    private readonly historyRepository: IOrderHistoryRepository
  ) {}

  @Get('order/:orderId')
  @ApiOperation({
    summary: 'Get order history',
    description: 'Retrieves the complete audit history for an order',
    operationId: 'getOrderHistory',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Order history retrieved',
    type: [OrderHistoryResponseDto],
  })
  @Traced('OrderHistoryController.getOrderHistory')
  async getOrderHistory(
    @Param('orderId') orderId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<OrderHistoryResponseDto[]> {
    return this.historyRepository.findByOrderId(orderId, { limit, offset });
  }

  @Get('event-type/:eventType')
  @ApiOperation({
    summary: 'Get history by event type',
    description: 'Retrieves all history entries for a specific event type',
    operationId: 'getHistoryByEventType',
  })
  @ApiParam({
    name: 'eventType',
    description: 'Event type',
    enum: [
      'OrderCreated',
      'OrderItemAdded',
      'OrderConfirmed',
      'OrderCancelled',
      'OrderShipped',
    ],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'History entries retrieved',
    type: [OrderHistoryResponseDto],
  })
  @Traced('OrderHistoryController.getHistoryByEventType')
  async getHistoryByEventType(
    @Param('eventType') eventType: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<OrderHistoryResponseDto[]> {
    return this.historyRepository.findByEventType(eventType, { limit, offset });
  }

  @Get('query')
  @ApiOperation({
    summary: 'Query order history',
    description: 'Advanced query for order history with multiple filters',
    operationId: 'queryOrderHistory',
  })
  @ApiQuery({ name: 'orderId', required: false, type: String })
  @ApiQuery({ name: 'eventType', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'History entries retrieved',
    type: [OrderHistoryResponseDto],
  })
  @Traced('OrderHistoryController.queryOrderHistory')
  async queryOrderHistory(
    @Query() params: OrderHistoryQueryParamsDto
  ): Promise<OrderHistoryResponseDto[]> {
    return this.historyRepository.query({
      orderId: params.orderId,
      eventType: params.eventType,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      limit: params.limit,
      offset: params.offset,
    });
  }

  @Get(':historyId')
  @ApiOperation({
    summary: 'Get history entry by ID',
    description: 'Retrieves a specific history entry by its ID',
    operationId: 'getHistoryEntryById',
  })
  @ApiParam({ name: 'historyId', description: 'History entry ID' })
  @ApiResponse({
    status: 200,
    description: 'History entry found',
    type: OrderHistoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'History entry not found' })
  @Traced('OrderHistoryController.getHistoryEntryById')
  async getHistoryEntryById(
    @Param('historyId') historyId: string
  ): Promise<OrderHistoryResponseDto> {
    const entry = await this.historyRepository.findById(historyId);

    if (!entry) {
      throw new NotFoundException('History entry not found');
    }

    return entry;
  }

  @Get('order/:orderId/latest')
  @ApiOperation({
    summary: 'Get latest history entry',
    description: 'Retrieves the most recent history entry for an order',
    operationId: 'getLatestHistoryEntry',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Latest history entry',
    type: OrderHistoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No history found' })
  @Traced('OrderHistoryController.getLatestHistoryEntry')
  async getLatestHistoryEntry(
    @Param('orderId') orderId: string
  ): Promise<OrderHistoryResponseDto> {
    const entry = await this.historyRepository.findLatestByOrderId(orderId);

    if (!entry) {
      throw new NotFoundException('No history found for this order');
    }

    return entry;
  }

  @Get('order/:orderId/count')
  @ApiOperation({
    summary: 'Get history count',
    description: 'Returns the number of history entries for an order',
    operationId: 'getHistoryCount',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'History count',
    schema: { type: 'object', properties: { count: { type: 'number' } } },
  })
  @Traced('OrderHistoryController.getHistoryCount')
  async getHistoryCount(
    @Param('orderId') orderId: string
  ): Promise<{ count: number }> {
    const count = await this.historyRepository.countByOrderId(orderId);
    return { count };
  }
}
