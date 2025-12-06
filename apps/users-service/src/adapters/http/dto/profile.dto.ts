import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

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
  phoneNumber?: string;

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
}
