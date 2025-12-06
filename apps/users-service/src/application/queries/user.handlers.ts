import { QueryHandler, IQueryHandler } from '@flexobo/core';
import { Inject } from '@nestjs/common';
import {
  GetUserByIdQuery,
  GetUsersByIdsQuery,
  ValidateTokenQuery,
  IsTokenBlacklistedQuery,
} from './user.queries';
import {
  IUserRepository,
  USER_REPOSITORY,
  ITokenRepository,
  TOKEN_REPOSITORY,
  ITokenService,
  TOKEN_SERVICE,
  IUser,
  IValidateTokenResult,
  UserStatus,
} from '../../ports';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery, IUser | null> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository
  ) {}

  async execute(query: GetUserByIdQuery): Promise<IUser | null> {
    return this.userRepository.findById(query.userId);
  }
}

@QueryHandler(GetUsersByIdsQuery)
export class GetUsersByIdsHandler implements IQueryHandler<GetUsersByIdsQuery, IUser[]> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository
  ) {}

  async execute(query: GetUsersByIdsQuery): Promise<IUser[]> {
    return this.userRepository.findByIds(query.userIds);
  }
}

@QueryHandler(ValidateTokenQuery)
export class ValidateTokenHandler
  implements IQueryHandler<ValidateTokenQuery, IValidateTokenResult>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKEN_REPOSITORY) private readonly tokenRepository: ITokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService
  ) {}

  async execute(query: ValidateTokenQuery): Promise<IValidateTokenResult> {
    try {
      const payload = this.tokenService.verifyAccessToken(query.token);

      // Check if token is blacklisted
      const blacklisted = await this.tokenRepository.isTokenBlacklisted(payload.jti);

      if (blacklisted) {
        return { valid: false, error: 'Token has been revoked' };
      }

      // Check if user exists and is active
      const user = await this.userRepository.findById(payload.sub);

      if (!user || user.status !== UserStatus.Active) {
        return { valid: false, error: 'User not found or inactive' };
      }

      return {
        valid: true,
        userId: payload.sub,
        role: payload.role,
        jti: payload.jti,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { valid: false, error: message };
    }
  }
}

@QueryHandler(IsTokenBlacklistedQuery)
export class IsTokenBlacklistedHandler
  implements IQueryHandler<IsTokenBlacklistedQuery, boolean>
{
  constructor(
    @Inject(TOKEN_REPOSITORY) private readonly tokenRepository: ITokenRepository
  ) {}

  async execute(query: IsTokenBlacklistedQuery): Promise<boolean> {
    return this.tokenRepository.isTokenBlacklisted(query.jti);
  }
}
