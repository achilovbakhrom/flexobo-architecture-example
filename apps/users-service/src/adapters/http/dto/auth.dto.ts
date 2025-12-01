import {
  IsEmail,
  IsString,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../domain';
import { Transform } from 'class-transformer';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BLOCKED = 'blocked',
}

export enum UserType {
  BROKER = 'broker',
  LOAD_OWNER = 'load_owner',
  CARRIER = 'carrier',
  COMPANY_DRIVER = 'company_driver',
  OWNER_OPERATOR = 'owner_operator',
}

export type UserTypeWithoutCompanyDriver = Exclude<
  UserType,
  UserType.COMPANY_DRIVER
>;

export enum AuthPlatform {
  WEB = 'web',
  MOBILE = 'mobile',
  TELEGRAM = 'telegram',
}

export const UserTypeEnumWithoutCompanyDriver = {
  BROKER: UserType.BROKER,
  LOAD_OWNER: UserType.LOAD_OWNER,
  CARRIER: UserType.CARRIER,
  OWNER_OPERATOR: UserType.OWNER_OPERATOR,
} as const;

export class RegisterDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/^\+/, '') : value
  )
  phone_number?: string;

  @ApiProperty({ example: '121212' })
  @IsString()
  @IsOptional()
  telegram_id?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fio!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  is_privacy_policy_accepted?: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  is_subscribed_newsletter?: boolean;

  @IsEnum(AuthPlatform)
  @IsOptional()
  platform?: AuthPlatform;

  @IsEnum(UserTypeEnumWithoutCompanyDriver)
  @IsOptional()
  user_type?: UserTypeWithoutCompanyDriver;

  @ApiProperty({ example: 'example@gmail.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class TokenResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  expiresIn!: number;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  uniqueId!: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phoneNumber?: string;

  @ApiPropertyOptional()
  telegramId?: string;

  @ApiProperty()
  fio!: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiPropertyOptional()
  userType?: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  language!: string;

  @ApiProperty()
  isVerified!: boolean;

  @ApiProperty()
  createdAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty()
  user!: UserResponseDto;

  @ApiProperty()
  tokens!: TokenResponseDto;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  fio?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;
}
