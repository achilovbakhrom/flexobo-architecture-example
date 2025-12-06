import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, Result, Success, Failure } from '@flexobo/core';
import {
  RegisterDeviceTokenCommand,
  RemoveDeviceTokenCommand,
} from './notification.commands';
import {
  DEVICE_TOKEN_REPOSITORY,
  IDeviceTokenRepository,
} from '../../ports/device-token.repository';
import { DevicePlatform } from '../../domain/constants/enums';

@Injectable()
@CommandHandler(RegisterDeviceTokenCommand)
export class RegisterDeviceTokenHandler
  implements ICommandHandler<RegisterDeviceTokenCommand, void>
{
  private readonly logger = new Logger(RegisterDeviceTokenHandler.name);

  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokenRepository: IDeviceTokenRepository
  ) {}

  async execute(command: RegisterDeviceTokenCommand): Promise<Result<void, Error>> {
    try {
      this.logger.debug(
        `Registering device token for user ${command.userId}: ${command.platform}`
      );

      const existing = await this.deviceTokenRepository.findByToken(command.token);

      if (existing) {
        if (existing.userId !== command.userId) {
          await this.deviceTokenRepository.deleteByToken(command.token);
          await this.deviceTokenRepository.save({
            userId: command.userId,
            token: command.token,
            platform: command.platform as DevicePlatform,
          });
        } else {
          await this.deviceTokenRepository.updateLastUsed(command.token);
        }
      } else {
        await this.deviceTokenRepository.save({
          userId: command.userId,
          token: command.token,
          platform: command.platform as DevicePlatform,
        });
      }

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

@Injectable()
@CommandHandler(RemoveDeviceTokenCommand)
export class RemoveDeviceTokenHandler
  implements ICommandHandler<RemoveDeviceTokenCommand, void>
{
  private readonly logger = new Logger(RemoveDeviceTokenHandler.name);

  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokenRepository: IDeviceTokenRepository
  ) {}

  async execute(command: RemoveDeviceTokenCommand): Promise<Result<void, Error>> {
    try {
      this.logger.debug(`Removing device token: ${command.token.substring(0, 20)}...`);
      await this.deviceTokenRepository.deleteByToken(command.token);
      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

export const DeviceTokenCommandHandlers = [
  RegisterDeviceTokenHandler,
  RemoveDeviceTokenHandler,
];
