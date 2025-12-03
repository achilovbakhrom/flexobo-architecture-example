import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  Failure,
} from '@flexobo/core';
import { Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  SendOTPCommand,
  VerifyOTPCommand,
  ForgotPasswordCommand,
} from './user.commands';
import {
  IUserRepository,
  USER_REPOSITORY,
  IOTPService,
  OTP_SERVICE,
  ISmsService,
  SMS_SERVICE,
  IEmailService,
  EMAIL_SERVICE,
  IUser,
  ErrorCodes,
  ErrorMessages,
  AuthMethod,
} from '../../ports';
import { IUserAggregateStore, USER_AGGREGATE_STORE } from '../../ports/user-store.port';

export interface SendOTPResult {
  codeHash: string;
  code?: number;
}

export interface VerifyOTPResult {
  verified: boolean;
}

@CommandHandler(SendOTPCommand)
export class SendOTPHandler
  implements ICommandHandler<SendOTPCommand, SendOTPResult>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(USER_AGGREGATE_STORE)
    private readonly userAggregateStore: IUserAggregateStore,
    @Inject(OTP_SERVICE) private readonly otpService: IOTPService,
    @Inject(SMS_SERVICE) private readonly smsService: ISmsService,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService
  ) {}

  async execute(
    command: SendOTPCommand
  ): Promise<Result<SendOTPResult, Error>> {
    try {
      // Find user by phone or email
      let user: IUser | null = null;

      if (
        command.authMethod === AuthMethod.PhoneNumber &&
        command.phoneNumber
      ) {
        user = await this.userRepository.findByPhoneNumber(command.phoneNumber);
      } else if (command.authMethod === AuthMethod.Email && command.email) {
        user = await this.userRepository.findByEmail(command.email);
      }

      // User must exist to request OTP
      if (!user) {
        return new Failure(
          new NotFoundException({
            statusCode: 404,
            error: ErrorCodes.USER_NOT_FOUND,
            message: ErrorMessages[ErrorCodes.USER_NOT_FOUND],
          })
        );
      }

      // Load the user aggregate
      const userAggregate = await this.userAggregateStore.load(user.id);
      if (!userAggregate) {
        return new Failure(
          new NotFoundException({
            statusCode: 404,
            error: ErrorCodes.USER_NOT_FOUND,
            message: ErrorMessages[ErrorCodes.USER_NOT_FOUND],
          })
        );
      }

      // Generate OTP
      const { code, codeHash } = this.otpService.generateOTP();
      const expiresAt = this.otpService.getExpiresAt();

      // Request OTP on user aggregate
      userAggregate.requestOTP({
        code,
        codeHash,
        authMethod: command.authMethod,
        phoneNumber: command.phoneNumber,
        email: command.email,
        expiresAt,
      });

      // Save the aggregate
      await this.userAggregateStore.save(userAggregate);

      // Send OTP via appropriate channel
      if (
        command.authMethod === AuthMethod.PhoneNumber &&
        command.phoneNumber
      ) {
        await this.smsService.send(String(code), command.phoneNumber);
      } else if (command.authMethod === AuthMethod.Email && command.email) {
        await this.emailService.sendOTP(command.email, String(code));
      }

      return new Success({
        codeHash,
        code,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(VerifyOTPCommand)
export class VerifyOTPHandler
  implements ICommandHandler<VerifyOTPCommand, VerifyOTPResult>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(USER_AGGREGATE_STORE)
    private readonly userAggregateStore: IUserAggregateStore
  ) {}

  async execute(
    command: VerifyOTPCommand
  ): Promise<Result<VerifyOTPResult, Error>> {
    try {
      // Find user by phone or email
      let user: IUser | null = null;

      if (command.phoneNumber) {
        user = await this.userRepository.findByPhoneNumber(command.phoneNumber);
      } else if (command.email) {
        user = await this.userRepository.findByEmail(command.email);
      }

      if (!user) {
        return new Failure(
          new BadRequestException({
            statusCode: 400,
            error: ErrorCodes.INVALID_OTP,
            message: ErrorMessages[ErrorCodes.INVALID_OTP],
          })
        );
      }

      // Load user aggregate
      const userAggregate = await this.userAggregateStore.load(user.id);
      if (!userAggregate) {
        return new Failure(
          new BadRequestException({
            statusCode: 400,
            error: ErrorCodes.INVALID_OTP,
            message: ErrorMessages[ErrorCodes.INVALID_OTP],
          })
        );
      }

      // Check if OTP exists and matches
      const currentOTP = userAggregate.currentOTP;
      if (!currentOTP) {
        return new Failure(
          new BadRequestException({
            statusCode: 400,
            error: ErrorCodes.INVALID_OTP,
            message: ErrorMessages[ErrorCodes.INVALID_OTP],
          })
        );
      }

      // Validate code and hash
      if (
        currentOTP.code !== command.code ||
        currentOTP.codeHash !== command.codeHash
      ) {
        return new Failure(
          new BadRequestException({
            statusCode: 400,
            error: ErrorCodes.INVALID_OTP,
            message: ErrorMessages[ErrorCodes.INVALID_OTP],
          })
        );
      }

      // Check expiration
      if (new Date() > currentOTP.expiresAt) {
        return new Failure(
          new BadRequestException({
            statusCode: 400,
            error: ErrorCodes.OTP_EXPIRED,
            message: ErrorMessages[ErrorCodes.OTP_EXPIRED],
          })
        );
      }

      // Mark OTP as used
      userAggregate.useOTP(command.codeHash);
      await this.userAggregateStore.save(userAggregate);

      return new Success({ verified: true });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler
  implements ICommandHandler<ForgotPasswordCommand, SendOTPResult>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(USER_AGGREGATE_STORE)
    private readonly userAggregateStore: IUserAggregateStore,
    @Inject(OTP_SERVICE) private readonly otpService: IOTPService,
    @Inject(SMS_SERVICE) private readonly smsService: ISmsService,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService
  ) {}

  async execute(
    command: ForgotPasswordCommand
  ): Promise<Result<SendOTPResult, Error>> {
    try {
      // Find user by phone or email
      let user: IUser | null = null;

      if (
        command.authMethod === AuthMethod.PhoneNumber &&
        command.phoneNumber
      ) {
        user = await this.userRepository.findByPhoneNumber(command.phoneNumber);
      } else if (command.authMethod === AuthMethod.Email && command.email) {
        user = await this.userRepository.findByEmail(command.email);
      }

      if (!user) {
        return new Failure(
          new NotFoundException(ErrorMessages[ErrorCodes.USER_NOT_FOUND])
        );
      }

      // Load user aggregate
      const userAggregate = await this.userAggregateStore.load(user.id);
      if (!userAggregate) {
        return new Failure(
          new NotFoundException(ErrorMessages[ErrorCodes.USER_NOT_FOUND])
        );
      }

      // Generate OTP
      const { code, codeHash } = this.otpService.generateOTP();
      const expiresAt = this.otpService.getExpiresAt();

      // Request OTP on user aggregate
      userAggregate.requestOTP({
        code,
        codeHash,
        authMethod: command.authMethod,
        phoneNumber: command.phoneNumber,
        email: command.email,
        expiresAt,
      });

      // Save the aggregate
      await this.userAggregateStore.save(userAggregate);

      // Send OTP via appropriate channel
      if (
        command.authMethod === AuthMethod.PhoneNumber &&
        command.phoneNumber
      ) {
        await this.smsService.send(String(code), command.phoneNumber);
      } else if (command.authMethod === AuthMethod.Email && command.email) {
        await this.emailService.sendOTP(command.email, String(code));
      }

      return new Success({
        codeHash,
        code,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
