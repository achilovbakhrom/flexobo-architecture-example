import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  Failure,
} from '@flexobo/core';
import { Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ChangePasswordCommand, ResetPasswordCommand } from './user.commands';
import {
  IUserRepository,
  USER_REPOSITORY,
  ITokenRepository,
  TOKEN_REPOSITORY,
  IPasswordService,
  PASSWORD_SERVICE,
  IUser,
  ErrorCodes,
  ErrorMessages,
  AuthMethod,
} from '../../ports';
import {
  IUserAggregateStore,
  USER_AGGREGATE_STORE,
} from '../../ports/user-store.port';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler
  implements ICommandHandler<ChangePasswordCommand, void>
{
  constructor(
    @Inject(USER_AGGREGATE_STORE) private readonly store: IUserAggregateStore,
    @Inject(PASSWORD_SERVICE) private readonly passwordService: IPasswordService
  ) {}

  async execute(
    command: ChangePasswordCommand
  ): Promise<Result<void, Error>> {
    try {
      const user = await this.store.load(command.userId);

      if (!user) {
        return new Failure(
          new NotFoundException(ErrorMessages[ErrorCodes.USER_NOT_FOUND])
        );
      }

      // Check if user has existing password (not a Google/OAuth user)
      const hasExistingPassword = user.passwordHash && user.passwordHash.trim().length > 0;

      if (hasExistingPassword) {
        // User already has password, validate old password
        if (!command.oldPassword) {
          return new Failure(
            new BadRequestException('Old password is required when changing existing password')
          );
        }

        const isOldPasswordValid = await this.passwordService.compare(
          command.oldPassword,
          user.passwordHash
        );

        if (!isOldPasswordValid) {
          return new Failure(
            new BadRequestException(ErrorMessages[ErrorCodes.INVALID_OLD_PASSWORD])
          );
        }
      }
      // For Google/OAuth users (no existing password), old_password is not required

      const passwordHash = await this.passwordService.hash(command.newPassword);

      user.changePassword(passwordHash);
      await this.store.save(user);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler
  implements ICommandHandler<ResetPasswordCommand, void>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(USER_AGGREGATE_STORE) private readonly store: IUserAggregateStore,
    @Inject(PASSWORD_SERVICE) private readonly passwordService: IPasswordService,
    @Inject(TOKEN_REPOSITORY) private readonly tokenRepository: ITokenRepository
  ) {}

  async execute(
    command: ResetPasswordCommand
  ): Promise<Result<void, Error>> {
    try {
      let repoUser: IUser | null = null;

      if (command.authMethod === AuthMethod.PhoneNumber && command.phoneNumber) {
        repoUser = await this.userRepository.findByPhoneNumber(command.phoneNumber);
      } else if (command.authMethod === AuthMethod.Email && command.email) {
        repoUser = await this.userRepository.findByEmail(command.email);
      }

      if (!repoUser) {
        return new Failure(
          new NotFoundException(ErrorMessages[ErrorCodes.USER_NOT_FOUND])
        );
      }

      const user = await this.store.load(repoUser.id);

      if (!user) {
        return new Failure(
          new NotFoundException(ErrorMessages[ErrorCodes.USER_NOT_FOUND])
        );
      }

      const passwordHash = await this.passwordService.hash(command.newPassword);

      user.resetPassword(passwordHash);
      await this.store.save(user);

      await this.tokenRepository.revokeAllUserRefreshTokens(repoUser.id);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
