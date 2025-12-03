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
  @ApiProperty({ enum: PostType, description: 'Type of post: LOAD or TRIP' })
  @IsEnum(PostType)
  postType!: PostType;

  @ApiProperty({ description: 'ID of the load or trip' })
  @IsString()
  postId!: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Transport IDs (required for bids on loads)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transportIds?: string[];

  @ApiProperty({ description: 'Proposed price' })
  @IsNumber()
  @Min(0)
  proposedPrice!: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Expiration date for the bid' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class CounterBidDto {
  @ApiProperty({ description: 'Counter offer price' })
  @IsNumber()
  @Min(0)
  newPrice!: number;
}

export class ListBidsByPostQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ListMyBidsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by bid status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: PostType })
  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ListReceivedBidsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by bid status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
