import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RateBookingDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Rating from 1 to 5' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({
    example: 'Great driver, punctual delivery!',
    description: 'Optional comment',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class ListBookingsQueryDto {
  @ApiPropertyOptional({ example: 'CONFIRMED', description: 'Filter by booking status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: 'customer',
    enum: ['customer', 'owner'],
    description: 'Filter role: customer or owner',
  })
  @IsOptional()
  @IsString()
  role?: 'customer' | 'owner';

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
