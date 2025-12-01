import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  Failure,
} from '@flexobo/core';
import { Inject, HttpException, UnauthorizedException } from '@nestjs/common';
import {
  RegisterUserCommand,
  RegisterWithTelegramCommand,
  LoginUserCommand,
  LoginWithTelegramCommand,
} from './user.commands';
import {
  IUserRepository,
  USER_REPOSITORY,
  ITokenService,
  TOKEN_SERVICE,
  IPasswordService,
  PASSWORD_SERVICE,
  ITokenPair,
  IUser,
  ErrorCodes,
  ErrorMessages,
  UserRole,
  AuthPlatform,
} from '../../ports';
import { User } from '../../domain/user.aggregate';
import {
  IUserAggregateStore,
  USER_AGGREGATE_STORE,
} from '../../ports/user-store.port';

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
    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: IPasswordService,
    @Inject(USER_AGGREGATE_STORE)
    private readonly store: IUserAggregateStore
  ) {}

  async execute(
    command: RegisterUserCommand
  ): Promise<Result<ITokenPair, Error>> {
    try {
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

      if (command.email) {
        const existingByEmail = await this.userRepository.findByEmail(
          command.email
        );
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

      const uniqueId = await this.userRepository.generateUniqueId(command.fio);
      const passwordHash = await this.passwordService.hash(command.password);

      const user = User.create();

      user.register({
        fio: command.fio,
        uniqueId,
        passwordHash,
        phoneNumber: command.phoneNumber,
        telegramId: command.telegramId,
        email: command.email,
        isPrivacyPolicyAccepted: command.isPrivacyPolicyAccepted,
        isSubscribedNewsletter: command.isSubscribedNewsletter,
        platform: command.platform,
        userType: command.userType,
      });

      await this.store.save(user);

      const tokens = await this.tokenService.generateTokens(
        user.id,
        user.email || user.phoneNumber || user.uniqueId || '',
        user.role || UserRole.USER
      );

      return new Success(tokens);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(RegisterWithTelegramCommand)
export class RegisterWithTelegramHandler
  implements ICommandHandler<RegisterWithTelegramCommand, ITokenPair>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(USER_AGGREGATE_STORE) private readonly store: IUserAggregateStore
  ) {}

  async execute(
    command: RegisterWithTelegramCommand
  ): Promise<Result<ITokenPair, Error>> {
    try {
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

      const existingByTelegram = await this.userRepository.findByTelegramId(
        command.telegramId
      );
      if (existingByTelegram) {
        return new Failure(
          new HttpException(
            {
              statusCode: 400,
              error: ErrorCodes.TELEGRAM_EXISTS,
              message: ErrorMessages[ErrorCodes.TELEGRAM_EXISTS],
            },
            400
          )
        );
      }

      const uniqueId = await this.userRepository.generateUniqueId(command.fio);

      const user = User.create();

      user.register({
        fio: command.fio,
        uniqueId,
        passwordHash: '',
        phoneNumber: command.phoneNumber,
        telegramId: command.telegramId,
        isPrivacyPolicyAccepted: command.isPrivacyPolicyAccepted,
        isSubscribedNewsletter: command.isSubscribedNewsletter,
        platform: AuthPlatform.TELEGRAM,
        userType: command.userType,
      });

      await this.store.save(user);

      const tokens = await this.tokenService.generateTokens(
        user.id,
        user.phoneNumber || user.uniqueId || '',
        user.role || UserRole.USER
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
    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: IPasswordService,
    @Inject(USER_AGGREGATE_STORE)
    private readonly store: IUserAggregateStore
  ) {}

  async execute(command: LoginUserCommand): Promise<Result<AuthResult, Error>> {
    try {
      const repoUser = await this.userRepository.findByEmail(command.email);

      if (!repoUser) {
        return new Failure(
          new UnauthorizedException(
            ErrorMessages[ErrorCodes.INVALID_CREDENTIALS]
          )
        );
      }

      const user = await this.store.load(repoUser.id);

      if (!user) {
        return new Failure(
          new UnauthorizedException(
            ErrorMessages[ErrorCodes.INVALID_CREDENTIALS]
          )
        );
      }

      if (!user.isActive) {
        return new Failure(
          new UnauthorizedException(
            ErrorMessages[ErrorCodes.ACCOUNT_NOT_ACTIVE]
          )
        );
      }

      const isPasswordValid = await this.passwordService.compare(
        command.password,
        user.passwordHashSafe
      );

      if (!isPasswordValid) {
        return new Failure(
          new UnauthorizedException(
            ErrorMessages[ErrorCodes.INVALID_CREDENTIALS]
          )
        );
      }

      user.login();
      await this.store.save(user);

      const tokens = await this.tokenService.generateTokens(
        user.id,
        user.loginSafe,
        user.roleSafe
      );

      return new Success({ user: repoUser, tokens });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(LoginWithTelegramCommand)
export class LoginWithTelegramHandler
  implements ICommandHandler<LoginWithTelegramCommand, AuthResult>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(USER_AGGREGATE_STORE) private readonly store: IUserAggregateStore
  ) {}

  async execute(
    command: LoginWithTelegramCommand
  ): Promise<Result<AuthResult, Error>> {
    try {
      const repoUser = await this.userRepository.findByTelegramId(
        command.telegramId
      );

      if (!repoUser) {
        return new Failure(
          new UnauthorizedException(
            ErrorMessages[ErrorCodes.INVALID_TELEGRAM_ID]
          )
        );
      }

      const user = await this.store.load(repoUser.id);

      if (!user || !user.isActive) {
        return new Failure(
          new UnauthorizedException(
            ErrorMessages[ErrorCodes.ACCOUNT_NOT_ACTIVE]
          )
        );
      }

      user.login();
      await this.store.save(user);

      const tokens = await this.tokenService.generateTokens(
        user.id,
        user.loginSafe,
        user.roleSafe
      );

      return new Success({ user: repoUser, tokens });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
