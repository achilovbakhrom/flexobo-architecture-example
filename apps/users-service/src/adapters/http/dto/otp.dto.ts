import {
  IsEmail,
  IsString,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
  Validate,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { AuthMethod } from '../../../ports';
import { AuthMethodFieldRequiredValidator } from './shared.dto';

export class SendOTPDto {
  @ApiProperty({
    enum: AuthMethod,
    example: 'EMAIL',
    description: 'Authentication method (EMAIL or PHONE_NUMBER)',
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

  @ApiPropertyOptional({
    example: true,
    description: 'Set to true when sending OTP for registration (skips existing user check)',
  })
  @IsOptional()
  @IsBoolean()
  forRegistration?: boolean;

  @Validate(AuthMethodFieldRequiredValidator)
  private readonly _validateAuthMethodField?: boolean;
}

export class VerifyOTPDto {
  @ApiProperty({
    example: 123456,
    description: '6-digit OTP code received via SMS or email',
  })
  @IsNotEmpty()
  code!: number;

  @ApiProperty({
    example: 'a1b2c3d4e5f6g7h8i9j0',
    description: 'Hash received from send OTP response',
  })
  @IsString()
  @IsNotEmpty()
  codeHash!: string;

  @ApiPropertyOptional({
    example: '+998901234567',
    description: 'Phone number used for OTP (for verification)',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Email address used for OTP (for verification)',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class OTPResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6g7h8i9j0',
    description: 'Hash to be used when verifying OTP',
  })
  codeHash!: string;

  @ApiPropertyOptional({
    example: 123456,
    description: 'OTP code (only returned in dev/test environment)',
  })
  code?: number;
}

export class VerifyOTPResponseDto {
  @ApiProperty({
    example: true,
    description: 'Whether OTP verification was successful',
  })
  verified!: boolean;
}
