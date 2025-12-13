import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../domain';
import { TokenResponseDto } from './token.dto';
import { USER_LANGS } from './profile.dto';
import { Expose, Transform, Type } from 'class-transformer';

export class CountryResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Country ID',
  })
  @Expose()
  _id!: string;

  @ApiProperty({
    example: 'UZ',
    description: 'Country code',
  })
  @Expose()
  code!: string;

  @ApiProperty({
    example: 'Uzbekistan',
    description: 'Country name',
  })
  @Expose()
  name!: string;
}

export class UserResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique user ID (UUID)',
  })
  @Expose()
  @Transform(({ obj }) => obj.id)
  _id!: string;

  @ApiProperty({
    example: 'john_doe',
    description: 'Unique username generated from FIO',
  })
  @Expose()
  user_unique_id!: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @Expose()
  email?: string;

  @ApiPropertyOptional({
    example: '998901234567',
    description: 'User phone number',
  })
  @Expose()
  phone_number?: string;

  @ApiPropertyOptional({
    example: '123456789',
    description: 'Telegram user ID',
  })
  @Expose()
  telegram_id?: string;

  @ApiProperty({
    example: 'google id',
  })
  @Expose()
  google_id?: string | null;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  @Expose()
  fio!: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatars/user123.jpg',
    description: 'URL to user avatar image',
  })
  @Expose()
  avatar?: string;

  @ApiPropertyOptional({
    type: CountryResponseDto,
    description: 'Country information',
  })
  @Expose()
  @Type(() => CountryResponseDto)
  country?: CountryResponseDto;

  @ApiPropertyOptional({
    example: 'Tashkent',
    description: 'City name',
  })
  @Expose()
  city?: string;

  @ApiProperty({
    enum: UserRole,
    example: 'USER',
    description: 'User role (USER, ADMIN)',
  })
  @Expose()
  role!: UserRole;

  @ApiPropertyOptional({
    example: 'carrier',
    description: 'Type of user (broker, load_owner, carrier, owner_operator)',
  })
  @Expose()
  user_type?: string;

  @ApiProperty({
    example: 'ACTIVE',
    description: 'User account status',
  })
  @Expose()
  status!: string;

  @ApiProperty({
    example: 'en',
    description: 'User preferred language',
    enum: USER_LANGS,
  })
  @Expose()
  user_lang!: USER_LANGS;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether user is subscribed to newsletter',
  })
  @Expose()
  is_subscribed_newsletter?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether user has accepted privacy policy',
  })
  @Expose()
  is_privacy_policy_accepted?: boolean;

  @ApiPropertyOptional({
    example: 'web',
    description: 'Platform user registered from',
  })
  @Expose()
  platform?: string;

  @Expose()
  password_hash?: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Account creation timestamp',
  })
  @Expose()
  created_at!: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Account last update timestamp',
  })
  @Expose()
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
