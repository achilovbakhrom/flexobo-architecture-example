import {
  IsEmail,
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { AuthMethod } from '../../../ports';

export class ForgotPasswordDto {
  @ApiProperty({
    enum: AuthMethod,
    example: 'EMAIL',
    description: 'Authentication method to receive reset OTP (EMAIL or PHONE_NUMBER)',
  })
  @IsEnum(AuthMethod)
  authMethod!: AuthMethod;

  @ApiPropertyOptional({
    example: '+998901234567',
    description: 'Phone number (required when authMethod is PHONE_NUMBER)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/^\+/, '') : value
  )
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Email address (required when authMethod is EMAIL)',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    enum: AuthMethod,
    example: 'EMAIL',
    description: 'Authentication method used for password reset',
  })
  @IsEnum(AuthMethod)
  authMethod!: AuthMethod;

  @ApiPropertyOptional({
    example: '+998901234567',
    description: 'Phone number (required when authMethod is PHONE_NUMBER)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/^\+/, '') : value
  )
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Email address (required when authMethod is EMAIL)',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'NewSecurePass123!',
    description: 'New password (minimum 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  newPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldSecurePass123!',
    description: 'Current password for verification',
  })
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @ApiProperty({
    example: 'NewSecurePass456!',
    description: 'New password (minimum 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  newPassword!: string;
}
