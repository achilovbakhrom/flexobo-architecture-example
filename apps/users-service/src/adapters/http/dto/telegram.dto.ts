import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  UserType,
  UserTypeEnumWithoutCompanyDriver,
  UserTypeWithoutCompanyDriver,
} from './shared.dto';

export class LinkTelegramDto {
  @ApiProperty({
    example: '+998901234567',
    description: 'Phone number associated with existing account',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/^\+/, '') : value
  )
  phoneNumber!: string;

  @ApiProperty({
    example: '123456789',
    description: 'Telegram user ID to link',
  })
  @IsString()
  @IsNotEmpty()
  telegramId!: string;
}

export class RegisterWithTelegramDto {
  @ApiProperty({
    example: '+998901234567',
    description: 'Phone number for the new account',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/^\+/, '') : value
  )
  phoneNumber!: string;

  @ApiProperty({
    example: '123456789',
    description: 'Telegram user ID',
  })
  @IsString()
  @IsNotEmpty()
  telegramId!: string;

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
  isPrivacyPolicyAccepted?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether user subscribed to newsletter',
  })
  @IsBoolean()
  @IsOptional()
  isSubscribedNewsletter?: boolean;

  @ApiPropertyOptional({
    enum: UserTypeEnumWithoutCompanyDriver,
    example: UserType.Carrier,
    description: 'Type of user (broker, load_owner, carrier, owner_operator)',
  })
  @IsEnum(UserTypeEnumWithoutCompanyDriver)
  @IsOptional()
  userType?: UserTypeWithoutCompanyDriver;
}

export class LoginWithTelegramDto {
  @ApiProperty({
    example: '123456789',
    description: 'Telegram user ID for authentication',
  })
  @IsString()
  @IsNotEmpty()
  telegramId!: string;
}
