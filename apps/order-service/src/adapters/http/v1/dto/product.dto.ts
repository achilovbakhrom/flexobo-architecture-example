/**
 * Product DTOs for HTTP API
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsBoolean,
  IsObject,
  Min,
} from 'class-validator';

export class CreateProductRequestDto {
  @ApiProperty({ description: 'Product SKU (unique identifier)', example: 'LAPTOP-001' })
  @IsString()
  sku!: string;

  @ApiProperty({ description: 'Product name', example: 'MacBook Pro 14"' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Product description', example: 'Apple MacBook Pro with M3 chip' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Product category', example: 'Electronics' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Price amount', example: 1999.99 })
  @IsNumber()
  @IsPositive()
  priceAmount!: number;

  @ApiPropertyOptional({ description: 'Currency code', example: 'USD', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Initial stock level', example: 100, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stockLevel?: number;

  @ApiPropertyOptional({ description: 'Product image URL', example: 'https://example.com/image.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { color: 'Space Gray' } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class CreateProductResponseDto {
  @ApiProperty({ description: 'Created product ID', example: 'uuid-here' })
  productId!: string;
}

export class UpdateProductRequestDto {
  @ApiPropertyOptional({ description: 'Product name', example: 'MacBook Pro 16"' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Product category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Price amount' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  priceAmount?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Stock level' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stockLevel?: number;

  @ApiPropertyOptional({ description: 'Whether product is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Product image URL' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateStockRequestDto {
  @ApiProperty({ description: 'New stock quantity', example: 50 })
  @IsNumber()
  @Min(0)
  quantity!: number;
}

export class ProductResponseDto {
  @ApiProperty({ description: 'Product ID' })
  id!: string;

  @ApiProperty({ description: 'Product SKU' })
  sku!: string;

  @ApiProperty({ description: 'Product name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Product description' })
  description?: string | null;

  @ApiPropertyOptional({ description: 'Product category' })
  category?: string | null;

  @ApiProperty({ description: 'Price amount' })
  priceAmount!: number;

  @ApiProperty({ description: 'Currency code' })
  currency!: string;

  @ApiProperty({ description: 'Stock level' })
  stockLevel!: number;

  @ApiProperty({ description: 'Whether product is active' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: 'Product image URL' })
  imageUrl?: string | null;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;
}
