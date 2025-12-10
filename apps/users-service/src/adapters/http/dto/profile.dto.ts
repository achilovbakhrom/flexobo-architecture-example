import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum USER_LANGS {
  UZ = 'uz',
  RU = 'ru',
  EN = 'en',
}

export class UpdateUserLanguageDto {
  @ApiProperty({
    example: 'en',
    description: 'Language code (en, ru, uz)',
    enum: USER_LANGS,
  })
  @IsEnum(USER_LANGS)
  lang!: USER_LANGS;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Full name to update',
  })
  @IsOptional()
  @IsString()
  fio?: string;

  @ApiPropertyOptional({
    example: '+998901234567',
    description: 'Phone number to update (+ prefix will be stripped)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/^\+/, '') : value
  )
  phonr_number?: string;

  @ApiPropertyOptional({
    example: 'en',
    description: 'Preferred language code (en, ru, uz)',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatars/user123.jpg',
    description: 'URL to avatar image',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Country ID to update',
  })
  @IsOptional()
  @IsString()
  country_id?: string;

  @ApiPropertyOptional({
    example: 'Tashkent',
    description: 'City name to update',
  })
  @IsOptional()
  @IsString()
  city?: string;
}
