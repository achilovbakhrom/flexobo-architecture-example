import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RefreshTokenDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidHlwZSI6InJlZnJlc2gifQ.abc123',
    description: 'Refresh token obtained from login response',
  })
  @IsString()
  refreshToken!: string;
}

export class TokenResponseDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidHlwZSI6ImFjY2VzcyJ9.xyz789',
    description: 'JWT access token for API authentication',
  })
  @Expose()
  access_token!: string;

  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidHlwZSI6InJlZnJlc2gifQ.abc123',
    description: 'Refresh token for obtaining new access tokens',
  })
  @Expose()
  refresh_token!: string;

  @ApiProperty({
    example: 900,
    description: 'Access token expiration time in seconds',
  })
  @Expose()
  expires_in!: number;
}
