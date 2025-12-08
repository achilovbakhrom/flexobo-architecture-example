import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../domain';
import { TokenResponseDto } from './token.dto';
import { USER_LANGS } from './profile.dto';

export class UserResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique user ID (UUID)',
  })
  _id!: string;

  @ApiProperty({
    example: 'john_doe',
    description: 'Unique username generated from FIO',
  })
  user_unique_id!: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  email?: string;

  @ApiPropertyOptional({
    example: '998901234567',
    description: 'User phone number',
  })
  phone_number?: string;

  @ApiPropertyOptional({
    example: '123456789',
    description: 'Telegram user ID',
  })
  telegram_id?: string;

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
  user_type?: string;

  @ApiProperty({
    example: 'ACTIVE',
    description: 'User account status',
  })
  status!: string;

  @ApiProperty({
    example: 'en',
    description: 'User preferred language',
    enum: USER_LANGS,
  })
  user_lang!: USER_LANGS;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether user is subscribed to newsletter',
  })
  is_subscribed_newsletter?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether user has accepted privacy policy',
  })
  is_privacy_policy_accepted?: boolean;

  @ApiPropertyOptional({
    example: 'web',
    description: 'Platform user registered from',
  })
  platform?: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Account creation timestamp',
  })
  created_at!: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Account last update timestamp',
  })
  updated_at!: string;
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
