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

export enum AuthMethod {
  PHONE_NUMBER = 'PHONE_NUMBER',
  EMAIL = 'EMAIL',
}

export class SendOTPDto {
  @ApiProperty({ enum: AuthMethod, example: 'PHONE_NUMBER' })
  @IsEnum(AuthMethod)
  authMethod!: AuthMethod;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/^\+/, '') : value
  )
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Set to true when sending OTP for registration' })
  @IsOptional()
  @IsBoolean()
  forRegistration?: boolean;
}

export class VerifyOTPDto {
  @ApiProperty({ example: 123456 })
  @IsNotEmpty()
  code!: number;

  @ApiProperty({ example: 'abc123hash' })
  @IsString()
  @IsNotEmpty()
  codeHash!: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class OTPResponseDto {
  @ApiProperty()
  codeHash!: string;

  @ApiPropertyOptional({ description: 'Only returned in dev/test environment' })
  code?: number;
}

export class VerifyOTPResponseDto {
  @ApiProperty()
  verified!: boolean;
}

export class ForgotPasswordDto {
  @ApiProperty({ enum: AuthMethod, example: 'EMAIL' })
  @IsEnum(AuthMethod)
  authMethod!: AuthMethod;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/^\+/, '') : value
  )
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ enum: AuthMethod, example: 'EMAIL' })
  @IsEnum(AuthMethod)
  authMethod!: AuthMethod;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/^\+/, '') : value
  )
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  newPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  newPassword!: string;
}

export class LinkTelegramDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/^\+/, '') : value
  )
  phoneNumber!: string;

  @ApiProperty({ example: '121212' })
  @IsString()
  @IsNotEmpty()
  telegramId!: string;
}

export class RegisterWithTelegramDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/^\+/, '') : value
  )
  phoneNumber!: string;

  @ApiProperty({ example: '121212' })
  @IsString()
  @IsNotEmpty()
  telegramId!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fio!: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPrivacyPolicyAccepted?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isSubscribedNewsletter?: boolean;

  @IsEnum(UserTypeEnumWithoutCompanyDriver)
  @IsOptional()
  userType?: UserTypeWithoutCompanyDriver;
}

export class LoginWithTelegramDto {
  @ApiProperty({ example: '121212' })
  @IsString()
  @IsNotEmpty()
  telegramId!: string;
}
