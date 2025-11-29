/**
 * Product REST Controller
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
  CreateProductCommand,
  UpdateProductCommand,
  DeleteProductCommand,
  UpdateProductStockCommand,
} from '../../../application/commands/product.commands';
import {
  GetProductByIdQuery,
  GetProductBySkuQuery,
  GetProductsByCategoryQuery,
  GetActiveProductsQuery,
  SearchProductsQuery,
} from '../../../application/queries/product.queries';
import {
  CreateProductRequestDto,
  CreateProductResponseDto,
  UpdateProductRequestDto,
  UpdateStockRequestDto,
  ProductResponseDto,
} from './dto/product.dto';
import { SuccessResponseDto } from './dto/order.dto';
import { ProductDto } from '../../../application/dto/product.dto';

@ApiTags('Products')
@ApiVersion('1.0.0')
@Controller('v1/products')
@UseInterceptors(VersionInterceptor)
export class ProductController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new product',
    description: 'Creates a new product in the catalog',
    operationId: 'createProduct',
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: CreateProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: CreateProductRequestDto })
  @Traced('ProductController.createProduct')
  async createProduct(
    @Body() dto: CreateProductRequestDto
  ): Promise<CreateProductResponseDto> {
    const productId = randomUUID();

    const result = await this.commandBus.execute(
      new CreateProductCommand({
        productId,
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        priceAmount: dto.priceAmount,
        currency: dto.currency,
        stockLevel: dto.stockLevel,
        imageUrl: dto.imageUrl,
      })
    );

    if (result.isFailure) {
      throw new Error(result.error?.message || 'Failed to create product');
    }

    return { productId };
  }

  @Get(':productId')
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieves a product by its ID',
    operationId: 'getProductById',
  })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @Traced('ProductController.getProductById')
  async getProductById(
    @Param('productId') productId: string
  ): Promise<ProductDto> {
    const product = await this.queryBus.execute<ProductDto | null>(
      new GetProductByIdQuery(productId)
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  @Get('sku/:sku')
  @ApiOperation({
    summary: 'Get product by SKU',
    description: 'Retrieves a product by its SKU',
    operationId: 'getProductBySku',
  })
  @ApiParam({ name: 'sku', description: 'Product SKU' })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @Traced('ProductController.getProductBySku')
  async getProductBySku(@Param('sku') sku: string): Promise<ProductDto> {
    const product = await this.queryBus.execute<ProductDto | null>(
      new GetProductBySkuQuery(sku)
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  @Get('category/:category')
  @ApiOperation({
    summary: 'Get products by category',
    description: 'Retrieves all products in a category',
    operationId: 'getProductsByCategory',
  })
  @ApiParam({ name: 'category', description: 'Product category' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved',
    type: [ProductResponseDto],
  })
  @Traced('ProductController.getProductsByCategory')
  async getProductsByCategory(
    @Param('category') category: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<ProductDto[]> {
    return this.queryBus.execute<ProductDto[]>(
      new GetProductsByCategoryQuery(category, limit, offset)
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get active products',
    description: 'Retrieves all active products',
    operationId: 'getActiveProducts',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved',
    type: [ProductResponseDto],
  })
  @Traced('ProductController.getActiveProducts')
  async getActiveProducts(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<ProductDto[]> {
    return this.queryBus.execute<ProductDto[]>(
      new GetActiveProductsQuery(limit, offset)
    );
  }

  @Get('search/:query')
  @ApiOperation({
    summary: 'Search products',
    description: 'Searches products by name',
    operationId: 'searchProducts',
  })
  @ApiParam({ name: 'query', description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: [ProductResponseDto],
  })
  @Traced('ProductController.searchProducts')
  async searchProducts(
    @Param('query') query: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<ProductDto[]> {
    return this.queryBus.execute<ProductDto[]>(
      new SearchProductsQuery(query, limit, offset)
    );
  }

  @Put(':productId')
  @ApiOperation({
    summary: 'Update product',
    description: 'Updates an existing product',
    operationId: 'updateProduct',
  })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiBody({ type: UpdateProductRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Product updated',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @Traced('ProductController.updateProduct')
  async updateProduct(
    @Param('productId') productId: string,
    @Body() dto: UpdateProductRequestDto
  ): Promise<SuccessResponseDto> {
    const result = await this.commandBus.execute(
      new UpdateProductCommand(productId, dto)
    );

    if (result.isFailure) {
      throw new NotFoundException(result.error?.message || 'Product not found');
    }

    return { success: true };
  }

  @Put(':productId/stock')
  @ApiOperation({
    summary: 'Update product stock',
    description: 'Updates the stock level of a product',
    operationId: 'updateProductStock',
  })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiBody({ type: UpdateStockRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Stock updated',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @Traced('ProductController.updateProductStock')
  async updateProductStock(
    @Param('productId') productId: string,
    @Body() dto: UpdateStockRequestDto
  ): Promise<SuccessResponseDto> {
    const result = await this.commandBus.execute(
      new UpdateProductStockCommand(productId, dto.quantity)
    );

    if (result.isFailure) {
      throw new NotFoundException(result.error?.message || 'Product not found');
    }

    return { success: true };
  }

  @Delete(':productId')
  @ApiOperation({
    summary: 'Delete product',
    description: 'Deletes a product from the catalog',
    operationId: 'deleteProduct',
  })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product deleted',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @Traced('ProductController.deleteProduct')
  async deleteProduct(
    @Param('productId') productId: string
  ): Promise<SuccessResponseDto> {
    const result = await this.commandBus.execute(
      new DeleteProductCommand(productId)
    );

    if (result.isFailure) {
      throw new NotFoundException(result.error?.message || 'Product not found');
    }

    return { success: true };
  }
}
