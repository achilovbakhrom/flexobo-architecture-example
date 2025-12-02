import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  Failure,
} from '@flexobo/core';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { RefreshTokenCommand, LogoutUserCommand } from './user.commands';
import {
  ITokenRepository,
  TOKEN_REPOSITORY,
  ITokenService,
  TOKEN_SERVICE,
  ITokenPair,
  ErrorCodes,
  ErrorMessages,
  TokenBlacklistReasons,
  TokenConfig,
} from '../../ports';
import {
  IUserAggregateStore,
  USER_AGGREGATE_STORE,
} from '../../ports/user-store.port';

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler
  implements ICommandHandler<RefreshTokenCommand, ITokenPair>
{
  constructor(
    @Inject(TOKEN_REPOSITORY)
    private readonly tokenRepository: ITokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService
  ) {}

  async execute(
    command: RefreshTokenCommand
  ): Promise<Result<ITokenPair, Error>> {
    try {
      let payload;
      try {
        payload = this.tokenService.verifyRefreshToken(command.refreshToken);
      } catch {
        return new Failure(
          new UnauthorizedException(
            ErrorMessages[ErrorCodes.INVALID_REFRESH_TOKEN]
          )
        );
      }

      const storedToken = await this.tokenRepository.findRefreshToken(
        command.refreshToken
      );

      if (!storedToken) {
        return new Failure(
          new UnauthorizedException(
            ErrorMessages[ErrorCodes.INVALID_REFRESH_TOKEN]
          )
        );
      }

      if (storedToken.revokedAt) {
        return new Failure(
          new UnauthorizedException(
            ErrorMessages[ErrorCodes.REFRESH_TOKEN_REVOKED]
          )
        );
      }

      await this.tokenRepository.revokeRefreshToken(storedToken.id);

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
export class LogoutUserHandler
  implements ICommandHandler<LogoutUserCommand, void>
{
  constructor(
    @Inject(TOKEN_REPOSITORY) private readonly tokenRepository: ITokenRepository,
    @Inject(USER_AGGREGATE_STORE) private readonly store: IUserAggregateStore
  ) {}

  async execute(command: LogoutUserCommand): Promise<Result<void, Error>> {
    try {
      const user = await this.store.load(command.userId);

      if (user) {
        user.logout();
        await this.store.save(user);
      }

      const expiresAt = new Date();
      expiresAt.setHours(
        expiresAt.getHours() + TokenConfig.BLACKLIST_EXPIRY_HOURS
      );

      await this.tokenRepository.blacklistToken(
        command.jti,
        TokenBlacklistReasons.LOGOUT,
        expiresAt
      );

      await this.tokenRepository.revokeAllUserRefreshTokens(command.userId);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
