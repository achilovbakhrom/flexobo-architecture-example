import { IsBoolean, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// DTO for old API format (Record<string, string>)
export class CreateTransportTypeDto {
  @ApiProperty({
    example: {
      en: 'Truck',
      ru: 'Грузовик',
      uz: 'Yuk mashinasi',
    },
    description: 'Name translations for different languages',
  })
  @IsObject()
  name!: Record<string, string>;

  @ApiPropertyOptional({
    example: {
      en: 'Heavy duty vehicle',
      ru: 'Тяжелое транспортное средство',
      uz: "Og'ir yuk mashinasi",
    },
    description: 'Description translations for different languages',
  })
  @IsObject()
  @IsOptional()
  description?: Record<string, string>;

  @ApiPropertyOptional({
    example: true,
    description: 'Active status',
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class UpdateTransportTypeDto {
  @ApiPropertyOptional({
    example: {
      en: 'Truck',
      ru: 'Грузовик',
      uz: 'Yuk mashinasi',
    },
    description: 'Name translations for different languages',
  })
  @IsObject()
  @IsOptional()
  name?: Record<string, string>;

  @ApiPropertyOptional({
    example: {
      en: 'Heavy duty vehicle',
      ru: 'Тяжелое транспортное средство',
      uz: "Og'ir yuk mashinasi",
    },
    description: 'Description translations for different languages',
  })
  @IsObject()
  @IsOptional()
  description?: Record<string, string>;

  @ApiPropertyOptional({
    example: true,
    description: 'Active status',
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

// Response DTO for old API format
export class TransportTypeResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: 'uuid-string',
  })
  _id!: string;

  @ApiProperty({
    description: 'Translated name (based on language)',
    example: 'Truck',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Translated description (based on language)',
    example: 'Heavy duty vehicle',
  })
  description?: string;

  @ApiProperty({
    description: 'Active status',
    example: true,
  })
  is_active!: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-12-03T10:00:00Z',
  })
  created_at!: Date;
}

// Internal DTO for converting old format to new format
export class TransportTypeTranslationDto {
  @IsString()
  language!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}

// Helper functions to convert between old and new formats
export function convertOldToNewFormat(
  dto: CreateTransportTypeDto | UpdateTransportTypeDto
): {
  isActive?: boolean;
  translations: TransportTypeTranslationDto[];
} {
  const translations: TransportTypeTranslationDto[] = [];

  if (dto.name) {
    for (const [language, name] of Object.entries(dto.name)) {
      translations.push({
        language,
        name,
        description: dto.description?.[language],
      });
    }
  }

  return {
    isActive: dto.is_active,
    translations,
  };
}

export function convertNewToOldFormat(
  data: any,
  language?: string
): TransportTypeResponseDto {
  const translation = language
    ? data.translations?.find((t: any) => t.language === language)
    : data.translations?.[0];

  return {
    _id: data.id,
    name: translation?.name || '',
    description: translation?.description,
    is_active: data.isActive,
    created_at: data.createdAt,
  };
}
