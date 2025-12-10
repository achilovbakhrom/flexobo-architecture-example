import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  AuthPlatform,
  UserType,
  UserTypeEnumWithoutCompanyDriver,
  UserTypeWithoutCompanyDriver,
} from './shared.dto';

export class RegisterDto {
  @ApiPropertyOptional({
    example: '+998901234567',
    description: 'Phone number (optional, + prefix will be stripped)',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/^\+/, '') : value
  )
  phone_number?: string;

  @ApiPropertyOptional({
    example: '123456789',
    description: 'Telegram user ID (optional)',
  })
  @IsString()
  @IsOptional()
  telegram_id?: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  @IsString()
  @IsNotEmpty()
  fio!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether user accepted privacy policy',
  })
  @IsBoolean()
  @IsOptional()
  is_privacy_policy_accepted?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether user subscribed to newsletter',
  })
  @IsBoolean()
  @IsOptional()
  is_subscribed_newsletter?: boolean;

  @ApiPropertyOptional({
    enum: AuthPlatform,
    example: AuthPlatform.Web,
    description: 'Platform from which user is registering',
  })
  @IsEnum(AuthPlatform)
  @IsOptional()
  platform?: AuthPlatform;

  @ApiPropertyOptional({
    enum: UserTypeEnumWithoutCompanyDriver,
    example: UserType.Carrier,
    description: 'Type of user (broker, load_owner, carrier, owner_operator)',
  })
  @IsEnum(UserTypeEnumWithoutCompanyDriver)
  @IsOptional()
  user_type?: UserTypeWithoutCompanyDriver;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Email address (optional)',
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Country ID (UUID)',
  })
  @IsString()
  @IsOptional()
  country_id?: string;

  @ApiPropertyOptional({
    example: 'Tashkent',
    description: 'City name',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password (minimum 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password!: string;
}
