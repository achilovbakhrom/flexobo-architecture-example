import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  Failure,
} from '@flexobo/core';
import {
  Inject,
  HttpException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import {
  RegisterUserCommand,
  LoginUserCommand,
  RefreshTokenCommand,
  LogoutUserCommand,
  UpdateUserProfileCommand,
} from './user.commands';
import {
  IUserRepository,
  USER_REPOSITORY,
  ITokenRepository,
  TOKEN_REPOSITORY,
  ITokenService,
  TOKEN_SERVICE,
  IPasswordService,
  PASSWORD_SERVICE,
  ITokenPair,
  IUser,
  UserStatus,
  ErrorCodes,
  ErrorMessages,
  TokenBlacklistReasons,
  TokenConfig,
} from '../../ports';

export interface AuthResult {
  user: IUser;
  tokens: ITokenPair;
}

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler
  implements ICommandHandler<RegisterUserCommand, ITokenPair>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(PASSWORD_SERVICE) private readonly passwordService: IPasswordService
  ) {}

  async execute(command: RegisterUserCommand): Promise<Result<ITokenPair, Error>> {
    try {
      // Check if phone number exists
      if (command.phoneNumber) {
        const existingByPhone = await this.userRepository.findByPhoneNumber(
          command.phoneNumber
        );
        if (existingByPhone) {
          return new Failure(
            new HttpException(
              {
                statusCode: 400,
                error: ErrorCodes.PHONE_EXISTS,
                message: ErrorMessages[ErrorCodes.PHONE_EXISTS],
              },
              400
            )
          );
        }
      }

      // Check if email exists
      if (command.email) {
        const existingByEmail = await this.userRepository.findByEmail(command.email);
        if (existingByEmail) {
          return new Failure(
            new HttpException(
              {
                statusCode: 400,
                error: ErrorCodes.EMAIL_EXISTS,
                message: ErrorMessages[ErrorCodes.EMAIL_EXISTS],
              },
              400
            )
          );
        }
      }

      // Generate unique ID from FIO
      const uniqueId = await this.userRepository.generateUniqueId(command.fio);

      // Hash password
      const passwordHash = await this.passwordService.hash(command.password);

      // Create user
      const user = await this.userRepository.create({
        uniqueId,
        fio: command.fio,
        passwordHash,
        phoneNumber: command.phoneNumber,
        telegramId: command.telegramId,
        email: command.email,
        isPrivacyPolicyAccepted: command.isPrivacyPolicyAccepted,
        isSubscribedNewsletter: command.isSubscribedNewsletter,
        platform: command.platform,
        userType: command.userType,
      });

      // Generate tokens
      const tokens = await this.tokenService.generateTokens(
        user.id,
        user.email || user.phoneNumber || user.uniqueId,
        user.role
      );

      return new Success(tokens);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(LoginUserCommand)
export class LoginUserHandler
  implements ICommandHandler<LoginUserCommand, AuthResult>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(PASSWORD_SERVICE) private readonly passwordService: IPasswordService
  ) {}

  async execute(command: LoginUserCommand): Promise<Result<AuthResult, Error>> {
    try {
      const user = await this.userRepository.findByEmail(command.email);

      if (!user) {
        return new Failure(
          new UnauthorizedException(ErrorMessages[ErrorCodes.INVALID_CREDENTIALS])
        );
      }

      if (user.status !== UserStatus.ACTIVE) {
        return new Failure(
          new UnauthorizedException(ErrorMessages[ErrorCodes.ACCOUNT_NOT_ACTIVE])
        );
      }

      const isPasswordValid = await this.passwordService.compare(
        command.password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        return new Failure(
          new UnauthorizedException(ErrorMessages[ErrorCodes.INVALID_CREDENTIALS])
        );
      }

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Generate tokens
      const tokens = await this.tokenService.generateTokens(
        user.id,
        user.email || user.phoneNumber || user.uniqueId,
        user.role
      );

      return new Success({ user, tokens });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler
  implements ICommandHandler<RefreshTokenCommand, ITokenPair>
{
  constructor(
    @Inject(TOKEN_REPOSITORY) private readonly tokenRepository: ITokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService
  ) {}

  async execute(command: RefreshTokenCommand): Promise<Result<ITokenPair, Error>> {
    try {
      // 1. Verify refresh token JWT signature and get payload
      let payload;
      try {
        payload = this.tokenService.verifyRefreshToken(command.refreshToken);
      } catch {
        return new Failure(
          new UnauthorizedException(ErrorMessages[ErrorCodes.INVALID_REFRESH_TOKEN])
        );
      }

      // 2. Check if refresh token exists in DB and is not revoked
      const storedToken = await this.tokenRepository.findRefreshToken(
        command.refreshToken
      );

      if (!storedToken) {
        return new Failure(
          new UnauthorizedException(ErrorMessages[ErrorCodes.INVALID_REFRESH_TOKEN])
        );
      }

      if (storedToken.revokedAt) {
        return new Failure(
          new UnauthorizedException(ErrorMessages[ErrorCodes.REFRESH_TOKEN_REVOKED])
        );
      }

      // 3. Revoke old refresh token (rotation)
      await this.tokenRepository.revokeRefreshToken(storedToken.id);

      // 4. Generate new token pair
      const tokens = await this.tokenService.generateTokens(
        payload.sub,
        payload.email || '',
        payload.role
      );

      return new Success(tokens);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(LogoutUserCommand)
export class LogoutUserHandler implements ICommandHandler<LogoutUserCommand, void> {
  constructor(
    @Inject(TOKEN_REPOSITORY) private readonly tokenRepository: ITokenRepository
  ) {}

  async execute(command: LogoutUserCommand): Promise<Result<void, Error>> {
    try {
      // Blacklist the current access token
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + TokenConfig.BLACKLIST_EXPIRY_HOURS);

      await this.tokenRepository.blacklistToken(
        command.jti,
        TokenBlacklistReasons.LOGOUT,
        expiresAt
      );

      // Revoke all refresh tokens for this user
      await this.tokenRepository.revokeAllUserRefreshTokens(command.userId);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(UpdateUserProfileCommand)
export class UpdateUserProfileHandler
  implements ICommandHandler<UpdateUserProfileCommand, IUser>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository
  ) {}

  async execute(command: UpdateUserProfileCommand): Promise<Result<IUser, Error>> {
    try {
      const user = await this.userRepository.findById(command.userId);

      if (!user) {
        return new Failure(
          new NotFoundException(ErrorMessages[ErrorCodes.USER_NOT_FOUND])
        );
      }

      const updatedUser = await this.userRepository.update(command.userId, {
        fio: command.fio,
        phoneNumber: command.phoneNumber,
        language: command.language,
        avatar: command.avatar,
      });

      return new Success(updatedUser);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
