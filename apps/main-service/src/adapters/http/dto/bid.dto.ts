import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostType } from '../../../domain/constants/enums';

export class CreateBidDto {
  @ApiProperty({
    enum: PostType,
    example: 'LOAD',
    description: 'Type of post: LOAD or TRIP',
  })
  @IsEnum(PostType)
  postType!: PostType;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID of the load or trip',
  })
  @IsString()
  postId!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
    description: 'Transport IDs (required for bids on loads)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transportIds?: string[];

  @ApiProperty({ example: 1500, description: 'Proposed price' })
  @IsNumber()
  @Min(0)
  proposedPrice!: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD', description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    example: '2024-03-20T12:00:00Z',
    description: 'Expiration date for the bid (ISO 8601)',
  })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class CounterBidDto {
  @ApiProperty({ example: 1350, description: 'Counter offer price' })
  @IsNumber()
  @Min(0)
  newPrice!: number;
}

export class ListBidsByPostQueryDto {
  @ApiPropertyOptional({ example: 'PENDING', description: 'Filter by bid status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ListMyBidsQueryDto {
  @ApiPropertyOptional({ example: 'PENDING', description: 'Filter by bid status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: PostType, example: 'LOAD', description: 'Filter by post type' })
  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ListReceivedBidsQueryDto {
  @ApiPropertyOptional({ example: 'PENDING', description: 'Filter by bid status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
