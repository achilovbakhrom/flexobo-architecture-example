import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CommandBus, Public, QueryBus } from '@flexobo/core';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  AuthResponseDto,
  TokenResponseDto,
  UserResponseDto,
  UpdateUserDto,
} from '../dto/auth.dto';
import {
  RegisterUserCommand,
  LoginUserCommand,
  RefreshTokenCommand,
  LogoutUserCommand,
  UpdateUserProfileCommand,
} from '../../../application/commands';
import { GetUserByIdQuery } from '../../../application/queries';
import { JwtAuthGuard, AuthenticatedRequest } from '../guards';
import { AuthPlatform, UserType } from '../../../ports';
import { IUser } from '../../../ports/user.interface';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  async signUp(@Body() dto: RegisterDto): Promise<{ data: TokenResponseDto }> {
    const command = new RegisterUserCommand(
      dto.fio,
      dto.password,
      dto.phone_number,
      dto.telegram_id,
      dto.email,
      dto.is_privacy_policy_accepted,
      dto.is_subscribed_newsletter,
      dto.platform ? (dto.platform.toUpperCase() as AuthPlatform) : undefined,
      dto.user_type ? (dto.user_type.toUpperCase() as UserType) : undefined
    );

    const result = await this.commandBus.execute<TokenResponseDto>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return { data: result.value };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    const command = new LoginUserCommand(dto.email, dto.password);

    const result = await this.commandBus.execute<{
      user: IUser;
      tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    }>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return {
      user: this.mapToUserResponse(result.value.user),
      tokens: result.value.tokens,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
    const command = new RefreshTokenCommand(dto.refreshToken);

    const result = await this.commandBus.execute<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return result.value;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  async logout(
    @Req() req: AuthenticatedRequest
  ): Promise<{ success: boolean }> {
    const command = new LogoutUserCommand(req.user.sub, req.user.jti);

    const result = await this.commandBus.execute<void>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getProfile(@Req() req: AuthenticatedRequest): Promise<UserResponseDto> {
    const query = new GetUserByIdQuery(req.user.sub);
    const user = await this.queryBus.execute<IUser | null>(query);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToUserResponse(user);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateUserDto
  ): Promise<UserResponseDto> {
    const command = new UpdateUserProfileCommand(
      req.user.sub,
      dto.fio,
      dto.phoneNumber,
      dto.language,
      dto.avatar
    );

    const result = await this.commandBus.execute<IUser>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return this.mapToUserResponse(result.value);
  }

  private mapToUserResponse(user: IUser): UserResponseDto {
    return {
      id: user.id,
      uniqueId: user.uniqueId,
      email: user.email ?? undefined,
      phoneNumber: user.phoneNumber ?? undefined,
      telegramId: user.telegramId ?? undefined,
      fio: user.fio,
      avatar: user.avatar ?? undefined,
      role: user.role,
      userType: user.userType ?? undefined,
      status: user.status,
      language: user.language,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }
}
