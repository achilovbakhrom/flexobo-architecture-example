import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CountryResponseDto {
  @ApiProperty({ example: 'uuid-123', description: 'Unique identifier' })
  id!: string;

  @ApiProperty({
    example: 'UZ',
    description: 'ISO 3166-1 alpha-2 country code',
  })
  code!: string;

  @ApiProperty({
    example: 'Uzbekistan',
    description: 'Country name in English',
  })
  name!: string;

  @ApiPropertyOptional({
    example: 'Узбекистан',
    description: 'Country name in Russian',
  })
  nameRu?: string;

  @ApiPropertyOptional({
    example: "O'zbekiston",
    description: 'Country name in Uzbek',
  })
  nameUz?: string;

  @ApiProperty({ example: '+998', description: 'International phone code' })
  phoneCode!: string;

  @ApiProperty({ example: true, description: 'Whether the country is active' })
  isActive!: boolean;
}

export class LanguageResponseDto {
  @ApiProperty({ example: 'uuid-123', description: 'Unique identifier' })
  id!: string;

  @ApiProperty({ example: 'uz', description: 'ISO 639-1 language code' })
  code!: string;

  @ApiProperty({ example: 'Uzbek', description: 'Language name in English' })
  name!: string;

  @ApiPropertyOptional({
    example: "O'zbek",
    description: 'Language name in native script',
  })
  nativeName?: string;

  @ApiProperty({ example: true, description: 'Whether the language is active' })
  isActive!: boolean;
}

export class CurrencyResponseDto {
  @ApiProperty({ example: 'uuid-123', description: 'Unique identifier' })
  id!: string;

  @ApiProperty({ example: 'UZS', description: 'ISO 4217 currency code' })
  code!: string;

  @ApiProperty({ example: 'Uzbekistani Som', description: 'Currency name' })
  name!: string;

  @ApiProperty({ example: "so'm", description: 'Currency symbol' })
  symbol!: string;

  @ApiProperty({
    example: 12500.5,
    description: 'Exchange rate to base currency',
  })
  rate!: number;

  @ApiProperty({ example: true, description: 'Whether the currency is active' })
  isActive!: boolean;
}

export class ReferenceItemResponseDto {
  @ApiProperty({ example: 'uuid-123', description: 'Unique identifier' })
  id!: string;

  @ApiProperty({ example: 'GENERAL', description: 'Reference item code' })
  code!: string;

  @ApiProperty({ example: 'General Cargo', description: 'Name in English' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Генеральный груз',
    description: 'Name in Russian',
  })
  nameRu?: string;

  @ApiPropertyOptional({ example: 'Umumiy yuk', description: 'Name in Uzbek' })
  nameUz?: string;

  @ApiPropertyOptional({
    example: 'Standard cargo without special requirements',
    description: 'Description',
  })
  description?: string;

  @ApiProperty({ example: true, description: 'Whether the item is active' })
  isActive!: boolean;
}
