/**
 * Inventory Controller
 *
 * HTTP API for managing inventory (stock) in the Admin Panel.
 * Products need inventory records to be reserved when orders are confirmed.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Inject,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiProperty,
} from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { CommandBus } from '@flexobo/core';
import {
  CreateInventoryCommand,
  AddStockCommand,
} from '../application/commands/inventory.commands';
import {
  IInventoryReadModelRepository,
  INVENTORY_READ_MODEL_REPOSITORY,
  InventoryReadModelDto,
  InventoryWithReservationsDto,
} from '../ports/inventory-read-model.port';
import { randomUUID } from 'crypto';

class CreateInventoryDto {
  @ApiProperty({
    description: 'Unique identifier for the product',
    example: 'prod-123',
  })
  @IsString()
  productId!: string;

  @ApiProperty({
    description: 'Stock Keeping Unit - unique product code',
    example: 'SKU-WIDGET-001',
  })
  @IsString()
  sku!: string;

  @ApiProperty({
    description: 'Human-readable product name',
    example: 'Blue Widget',
  })
  @IsString()
  productName!: string;

  @ApiProperty({
    description: 'Initial stock quantity (defaults to 0)',
    example: 100,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialStock?: number;
}

class AddStockDto {
  @ApiProperty({
    description: 'Quantity to add to inventory',
    example: 50,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    description: 'Reason for adding stock (e.g., restock, return)',
    example: 'Monthly restock from supplier',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

class CreateInventoryResponseDto {
  @ApiProperty({
    description: 'Generated inventory ID',
    example: 'inv-550e8400-e29b-41d4-a716-446655440000',
  })
  inventoryId!: string;
}

class SuccessResponseDto {
  @ApiProperty({ description: 'Operation success status', example: true })
  success!: boolean;
}

class InventoryListResponseDto {
  @ApiProperty({ description: 'List of inventory items', type: 'array' })
  inventory!: InventoryReadModelDto[];
}

@ApiTags('Inventory')
@Controller('api/v1/inventory')
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(
    private readonly commandBus: CommandBus,
    @Inject(INVENTORY_READ_MODEL_REPOSITORY)
    private readonly inventoryRepository: IInventoryReadModelRepository
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create inventory for a product',
    description:
      'Creates a new inventory record for a product. Products must have inventory records before stock can be reserved for orders.',
  })
  @ApiResponse({
    status: 201,
    description: 'Inventory created successfully',
    type: CreateInventoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or creation failed' })
  async createInventory(
    @Body() dto: CreateInventoryDto
  ): Promise<{ inventoryId: string }> {
    const inventoryId = `inv-${randomUUID()}`;

    const command = new CreateInventoryCommand(
      inventoryId,
      dto.productId,
      dto.sku,
      dto.productName,
      dto.initialStock ?? 0
    );

    const result = await this.commandBus.execute(command);

    if (result.isFailure) {
      this.logger.error(`Failed to create inventory: ${result.error?.message}`);
      throw new HttpException(
        result.error?.message || 'Failed to create inventory',
        HttpStatus.BAD_REQUEST
      );
    }

    this.logger.log(
      `Created inventory ${inventoryId} for product ${dto.productId}`
    );

    return { inventoryId };
  }

  @Put(':inventoryId/stock')
  @ApiOperation({
    summary: 'Add stock to inventory',
    description: 'Increases the stock quantity for an existing inventory item.',
  })
  @ApiParam({
    name: 'inventoryId',
    description: 'Inventory ID',
    example: 'inv-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock added successfully',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or operation failed' })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  async addStock(
    @Param('inventoryId') inventoryId: string,
    @Body() dto: AddStockDto
  ): Promise<{ success: boolean }> {
    const command = new AddStockCommand(inventoryId, dto.quantity, dto.reason);

    const result = await this.commandBus.execute(command);

    if (result.isFailure) {
      this.logger.error(`Failed to add stock: ${result.error?.message}`);
      throw new HttpException(
        result.error?.message || 'Failed to add stock',
        HttpStatus.BAD_REQUEST
      );
    }

    this.logger.log(`Added ${dto.quantity} stock to inventory ${inventoryId}`);

    return { success: true };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all inventory items',
    description: 'Retrieves a paginated list of all inventory items.',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of items to return',
    example: 50,
    required: false,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of items to skip for pagination',
    example: 0,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'List of inventory items',
    type: InventoryListResponseDto,
  })
  async getAllInventory(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<{ inventory: InventoryReadModelDto[] }> {
    const inventory = await this.inventoryRepository.findAll(
      limit ?? 50,
      offset ?? 0
    );
    return { inventory };
  }

  @Get(':inventoryId')
  @ApiOperation({
    summary: 'Get inventory by ID',
    description:
      'Retrieves a single inventory item by its ID, including active reservations.',
  })
  @ApiParam({
    name: 'inventoryId',
    description: 'Inventory ID',
    example: 'inv-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory item with reservations',
  })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  async getInventoryById(
    @Param('inventoryId') inventoryId: string
  ): Promise<InventoryWithReservationsDto> {
    const inventory = await this.inventoryRepository.findById(inventoryId);

    if (!inventory) {
      throw new HttpException('Inventory not found', HttpStatus.NOT_FOUND);
    }

    return inventory;
  }

  @Get('product/:productId')
  @ApiOperation({
    summary: 'Get inventory by product ID',
    description:
      'Retrieves inventory information for a specific product, including reservations.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product ID',
    example: 'prod-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory item with reservations',
  })
  @ApiResponse({ status: 404, description: 'Inventory not found for product' })
  async getInventoryByProductId(
    @Param('productId') productId: string
  ): Promise<InventoryWithReservationsDto> {
    const inventory = await this.inventoryRepository.findByProductId(productId);

    if (!inventory) {
      throw new HttpException(
        'Inventory not found for product',
        HttpStatus.NOT_FOUND
      );
    }

    return inventory;
  }

  @Get('alerts/low-stock')
  @ApiOperation({
    summary: 'Get low stock alerts',
    description:
      'Retrieves inventory items with available stock below the specified threshold.',
  })
  @ApiQuery({
    name: 'threshold',
    description: 'Stock level threshold (default: 10)',
    example: 10,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'List of low stock inventory items',
    type: InventoryListResponseDto,
  })
  async getLowStock(
    @Query('threshold') threshold?: number
  ): Promise<{ inventory: InventoryReadModelDto[] }> {
    const inventory = await this.inventoryRepository.findLowStock(
      threshold ?? 10
    );
    return { inventory };
  }
}
