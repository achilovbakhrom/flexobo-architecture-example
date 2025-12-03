import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  UserType,
  UserTypeEnumWithoutCompanyDriver,
  UserTypeWithoutCompanyDriver,
} from './shared.dto';
import { UserResponseDto } from './user-response.dto';

export class AuthWithGoogleDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIiwiYXpwIjoiMTIzNDU2Nzg5MC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsImF1ZCI6IjEyMzQ1Njc4OTAuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTc1NTI2NzYyMjgxNDQ4MDc5MjQiLCJlbWFpbCI6ImpvaG4uZG9lQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiSm9obiBEb2UiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUFBQUFBQUFBQUE9czk2LWMiLCJnaXZlbl9uYW1lIjoiSm9obiIsImZhbWlseV9uYW1lIjoiRG9lIiwibG9jYWxlIjoiZW4iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMzYwMH0.signature',
    description: 'Google ID token obtained from Google Sign-In SDK',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether user accepted privacy policy (for new registrations)',
  })
  @IsBoolean()
  @IsOptional()
  isPrivacyPolicyAccepted?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether user subscribed to newsletter (for new registrations)',
  })
  @IsBoolean()
  @IsOptional()
  isSubscribedNewsletter?: boolean;

  @ApiPropertyOptional({
    enum: UserTypeEnumWithoutCompanyDriver,
    example: UserType.Carrier,
    description: 'Type of user for new registrations (broker, load_owner, carrier, owner_operator)',
  })
  @IsEnum(UserTypeEnumWithoutCompanyDriver)
  @IsOptional()
  userType?: UserTypeWithoutCompanyDriver;
}

export class GoogleAuthTokensDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ0eXBlIjoiYWNjZXNzIn0.xyz789',
    description: 'JWT access token for API authentication',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ0eXBlIjoicmVmcmVzaCJ9.abc123',
    description: 'Refresh token for obtaining new access tokens',
  })
  refreshToken!: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'JWT ID for token tracking and blacklisting',
  })
  jti!: string;
}

export class GoogleAuthResponseDto {
  @ApiProperty({
    type: UserResponseDto,
    description: 'User profile information',
  })
  user!: UserResponseDto;

  @ApiProperty({
    type: GoogleAuthTokensDto,
    description: 'Authentication tokens',
  })
  tokens!: GoogleAuthTokensDto;

  @ApiProperty({
    example: true,
    description: 'True if a new user was created, false if existing user logged in',
  })
  isNewUser!: boolean;
}
