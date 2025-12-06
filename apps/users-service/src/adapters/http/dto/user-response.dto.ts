import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../domain';
import { TokenResponseDto } from './token.dto';

export class UserResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique user ID (UUID)',
  })
  id!: string;

  @ApiProperty({
    example: 'john_doe',
    description: 'Unique username generated from FIO',
  })
  uniqueId!: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  email?: string;

  @ApiPropertyOptional({
    example: '998901234567',
    description: 'User phone number',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: '123456789',
    description: 'Telegram user ID',
  })
  telegramId?: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  fio!: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatars/user123.jpg',
    description: 'URL to user avatar image',
  })
  avatar?: string;

  @ApiProperty({
    enum: UserRole,
    example: 'USER',
    description: 'User role (USER, ADMIN)',
  })
  role!: UserRole;

  @ApiPropertyOptional({
    example: 'carrier',
    description: 'Type of user (broker, load_owner, carrier, owner_operator)',
  })
  userType?: string;

  @ApiProperty({
    example: 'ACTIVE',
    description: 'User account status',
  })
  status!: string;

  @ApiProperty({
    example: 'en',
    description: 'User preferred language',
  })
  language!: string;

  @ApiProperty({
    example: true,
    description: 'Whether user email/phone is verified',
  })
  isVerified!: boolean;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Account creation timestamp',
  })
  createdAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({
    type: UserResponseDto,
    description: 'User profile information',
  })
  user!: UserResponseDto;

  @ApiProperty({
    type: TokenResponseDto,
    description: 'Authentication tokens',
  })
  tokens!: TokenResponseDto;
}
