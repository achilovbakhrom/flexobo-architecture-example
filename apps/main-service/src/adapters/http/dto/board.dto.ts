import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum BoardMemberRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export class CreateBoardDto {
  @ApiProperty({ example: 'UZ-RU Routes', description: 'Board name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: 'Private board for Uzbekistan to Russia freight routes',
    description: 'Board description',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBoardDto {
  @ApiPropertyOptional({ example: 'UZ-RU Routes Updated', description: 'Board name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated description for private freight routes',
    description: 'Board description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the board is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddBoardMemberDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User ID to add as member',
  })
  @IsString()
  userId!: string;

  @ApiProperty({
    enum: BoardMemberRole,
    example: 'MEMBER',
    default: BoardMemberRole.MEMBER,
    description: 'Member role',
  })
  @IsEnum(BoardMemberRole)
  role!: BoardMemberRole;
}

export class ListBoardsQueryDto {
  @ApiPropertyOptional({ example: true, description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

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
