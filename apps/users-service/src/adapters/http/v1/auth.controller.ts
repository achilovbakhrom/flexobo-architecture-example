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
import { CommandBus, QueryBus } from '@flexobo/core';
import {
  AuthenticatedUser,
  CurrentUser,
  Public,
  ResponseDTO,
} from '@flexobo/shared-kernel';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  AuthResponseDto,
  TokenResponseDto,
  UserResponseDto,
  UpdateUserDto,
  SendOTPDto,
  VerifyOTPDto,
  OTPResponseDto,
  VerifyOTPResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  USER_LANGS,
  LinkTelegramDto,
  RegisterWithTelegramDto,
  LoginWithTelegramDto,
  AuthWithGoogleDto,
  GoogleAuthResponseDto,
} from '../dto';
import {
  RegisterUserCommand,
  RegisterWithTelegramCommand,
  LoginUserCommand,
  LoginWithTelegramCommand,
  RefreshTokenCommand,
  LogoutUserCommand,
  UpdateUserProfileCommand,
  SendOTPCommand,
  VerifyOTPCommand,
  ForgotPasswordCommand,
  ResetPasswordCommand,
  ChangePasswordCommand,
  LinkTelegramCommand,
  AuthWithGoogleCommand,
  GoogleAuthResult,
} from '../../../application/commands';
import { GetUserByIdQuery } from '../../../application/queries';
import { JwtAuthGuard, AuthenticatedRequest } from '../guards';
import { UserType } from '../../../ports';
import { IUser, AuthMethod } from '../../../ports/user.interface';

@ApiTags('Auth')
@ApiBearerAuth()
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
  @ResponseDTO(TokenResponseDto)
  async signUp(@Body() dto: RegisterDto): Promise<{ data: TokenResponseDto }> {
    const command = new RegisterUserCommand(
      dto.fio,
      dto.password,
      dto.phone_number,
      dto.telegram_id,
      dto.email,
      dto.is_privacy_policy_accepted,
      dto.is_subscribed_newsletter,
      dto.platform,
      dto.user_type
    );

    const result = await this.commandBus.execute<TokenResponseDto>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return { data: result.value };
  }

  @Public()
  @Post('signup/telegram')
  @ApiOperation({ summary: 'Register a new user via Telegram' })
  @ResponseDTO(TokenResponseDto)
  async signUpWithTelegram(
    @Body() dto: RegisterWithTelegramDto
  ): Promise<{ data: TokenResponseDto }> {
    const command = new RegisterWithTelegramCommand(
      dto.fio,
      dto.phoneNumber,
      dto.telegramId,
      dto.isPrivacyPolicyAccepted,
      dto.isSubscribedNewsletter,
      dto.userType ? (dto.userType.toUpperCase() as UserType) : undefined
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
  @ResponseDTO(AuthResponseDto)
  async login(@Body() dto: LoginDto) {
    const command = new LoginUserCommand(dto.email, dto.password);

    const result = await this.commandBus.execute<{
      user: IUser;
      tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    }>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return {
      data: { user: result.value.user, tokens: result.value.tokens },
    };
  }

  @Public()
  @Post('login/telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user via Telegram' })
  @ResponseDTO(AuthResponseDto)
  async loginWithTelegram(@Body() dto: LoginWithTelegramDto) {
    const command = new LoginWithTelegramCommand(dto.telegramId);

    const result = await this.commandBus.execute<{
      user: IUser;
      tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    }>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return {
      data: { user: result.value.user, tokens: result.value.tokens },
    };
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate with Google',
    description:
      'Sign in or sign up using Google ID token. Creates new user if not exists.',
  })
  @ResponseDTO(GoogleAuthResponseDto)
  async authWithGoogle(@Body() dto: AuthWithGoogleDto) {
    const command = new AuthWithGoogleCommand(
      dto.idToken,
      dto.isPrivacyPolicyAccepted,
      dto.isSubscribedNewsletter,
      dto.userType ? (dto.userType.toUpperCase() as UserType) : undefined
    );

    const result = await this.commandBus.execute<GoogleAuthResult>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return {
      data: {
        user: result.value.user,
        tokens: result.value.tokens,
        is_new_user: result.value.isNewUser,
      },
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ResponseDTO(TokenResponseDto)
  async refresh(@Body() dto: RefreshTokenDto) {
    const command = new RefreshTokenCommand(dto.refreshToken);

    const result = await this.commandBus.execute<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return { data: result.value };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
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

  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP code' })
  @ApiResponse({ status: 200, type: OTPResponseDto })
  async sendOTP(@Body() dto: SendOTPDto): Promise<{ data: OTPResponseDto }> {
    console.log('DTO received in sendOTP:', dto);
    const command = new SendOTPCommand(
      dto.authMethod as AuthMethod,
      dto.phoneNumber,
      dto.email,
      dto.forRegistration
    );

    const result = await this.commandBus.execute<{
      codeHash: string;
      code?: number;
    }>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return { data: result.value };
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code' })
  @ApiResponse({ status: 200, type: VerifyOTPResponseDto })
  async verifyOTP(@Body() dto: VerifyOTPDto): Promise<VerifyOTPResponseDto> {
    console.log('DTO received in verifyOTP:', dto);
    const command = new VerifyOTPCommand(
      dto.code,
      dto.codeHash,
      dto.phoneNumber,
      dto.email
    );

    const result = await this.commandBus.execute<{ verified: boolean }>(
      command
    );

    if (result.isFailure) {
      throw result.error;
    }

    return result.value;
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, type: OTPResponseDto })
  @ResponseDTO(OTPResponseDto)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto
  ): Promise<{ data: OTPResponseDto }> {
    const command = new ForgotPasswordCommand(
      dto.authMethod as AuthMethod,
      dto.phoneNumber,
      dto.email
    );

    const result = await this.commandBus.execute<{
      codeHash: string;
      code?: number;
    }>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return { data: result.value };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password after OTP verification' })
  @ApiResponse({ status: 200 })
  async resetPassword(
    @Body() dto: ResetPasswordDto
  ): Promise<{ success: boolean }> {
    const command = new ResetPasswordCommand(
      dto.authMethod as AuthMethod,
      dto.newPassword,
      dto.phoneNumber,
      dto.email
    );

    const result = await this.commandBus.execute<void>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return { success: true };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200 })
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto
  ): Promise<{ success: boolean }> {
    const command = new ChangePasswordCommand(
      req.user.sub,
      dto.old_password,
      dto.new_password
    );

    const result = await this.commandBus.execute<void>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return { success: true };
  }

  @Post('link-telegram')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Link Telegram account to existing user' })
  @ApiResponse({ status: 200 })
  async linkTelegram(
    @Body() dto: LinkTelegramDto
  ): Promise<{ success: boolean }> {
    const command = new LinkTelegramCommand(dto.phoneNumber, dto.telegramId);

    const result = await this.commandBus.execute<void>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ResponseDTO(UserResponseDto)
  async getProfile(@CurrentUser() currentUser: AuthenticatedUser) {
    const query = new GetUserByIdQuery(currentUser.sub);

    const user = await this.queryBus.execute<IUser | null>(query);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { data: user };
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current user profile' })
  @ResponseDTO(UserResponseDto)
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateUserDto
  ): Promise<{ data: IUser }> {
    const command = new UpdateUserProfileCommand(
      req.user.sub,
      dto.fio,
      dto.phonr_number,
      dto.language,
      dto.avatar
    );

    const result = await this.commandBus.execute<void>(command);

    if (result.isFailure) {
      throw result.error;
    }

    // Fetch updated user profile
    const query = new GetUserByIdQuery(req.user.sub);
    const user = await this.queryBus.execute<IUser | null>(query);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { data: user };
  }
}
