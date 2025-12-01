import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  Failure,
} from '@flexobo/core';
import { Inject, NotFoundException, HttpException } from '@nestjs/common';
import {
  UpdateUserProfileCommand,
  LinkTelegramCommand,
} from './user.commands';
import {
  IUserRepository,
  USER_REPOSITORY,
  ErrorCodes,
  ErrorMessages,
} from '../../ports';
import {
  IUserAggregateStore,
  USER_AGGREGATE_STORE,
} from '../../ports/user-store.port';

@CommandHandler(UpdateUserProfileCommand)
export class UpdateUserProfileHandler
  implements ICommandHandler<UpdateUserProfileCommand, void>
{
  constructor(
    @Inject(USER_AGGREGATE_STORE) private readonly store: IUserAggregateStore
  ) {}

  async execute(
    command: UpdateUserProfileCommand
  ): Promise<Result<void, Error>> {
    try {
      const user = await this.store.load(command.userId);

      if (!user) {
        return new Failure(
          new NotFoundException(ErrorMessages[ErrorCodes.USER_NOT_FOUND])
        );
      }

      user.updateProfile({
        fio: command.fio,
        phoneNumber: command.phoneNumber,
        language: command.language,
        avatar: command.avatar,
      });

      await this.store.save(user);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(LinkTelegramCommand)
export class LinkTelegramHandler
  implements ICommandHandler<LinkTelegramCommand, void>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(USER_AGGREGATE_STORE) private readonly store: IUserAggregateStore
  ) {}

  async execute(command: LinkTelegramCommand): Promise<Result<void, Error>> {
    try {
      const repoUser = await this.userRepository.findByPhoneNumber(
        command.phoneNumber
      );

      if (!repoUser) {
        return new Failure(
          new NotFoundException(ErrorMessages[ErrorCodes.USER_NOT_FOUND])
        );
      }

      const existingByTelegram = await this.userRepository.findByTelegramId(
        command.telegramId
      );
      if (existingByTelegram && existingByTelegram.id !== repoUser.id) {
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

      const user = await this.store.load(repoUser.id);

      if (!user) {
        return new Failure(
          new NotFoundException(ErrorMessages[ErrorCodes.USER_NOT_FOUND])
        );
      }

      user.linkTelegram(command.telegramId);
      await this.store.save(user);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
