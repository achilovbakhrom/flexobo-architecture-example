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
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  SendOTPCommand,
  VerifyOTPCommand,
  ForgotPasswordCommand,
} from './user.commands';
import {
  IUserRepository,
  USER_REPOSITORY,
  IOTPRepository,
  OTP_REPOSITORY,
  IOTPService,
  OTP_SERVICE,
  ISmsService,
  SMS_SERVICE,
  IEmailService,
  EMAIL_SERVICE,
  IUser,
  ErrorCodes,
  ErrorMessages,
} from '../../ports';

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
    @Inject(OTP_REPOSITORY) private readonly otpRepository: IOTPRepository,
    @Inject(OTP_SERVICE) private readonly otpService: IOTPService,
    @Inject(SMS_SERVICE) private readonly smsService: ISmsService,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService
  ) {}

  async execute(command: SendOTPCommand): Promise<Result<SendOTPResult, Error>> {
    try {
      if (command.forRegistration) {
        if (command.authMethod === 'PHONE_NUMBER' && command.phoneNumber) {
          const existing = await this.userRepository.findByPhoneNumber(
            command.phoneNumber
          );
          if (existing) {
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
        } else if (command.authMethod === 'EMAIL' && command.email) {
          const existing = await this.userRepository.findByEmail(command.email);
          if (existing) {
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
      }

      const { code, codeHash } = this.otpService.generateOTP();
      const expiresAt = this.otpService.getExpiresAt();

      await this.otpRepository.create({
        code,
        codeHash,
        authMethod: command.authMethod,
        phoneNumber: command.phoneNumber,
        email: command.email,
        expiresAt,
      });

      if (command.authMethod === 'PHONE_NUMBER' && command.phoneNumber) {
        await this.smsService.send(String(code), command.phoneNumber);
      } else if (command.authMethod === 'EMAIL' && command.email) {
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
    @Inject(OTP_REPOSITORY) private readonly otpRepository: IOTPRepository
  ) {}

  async execute(
    command: VerifyOTPCommand
  ): Promise<Result<VerifyOTPResult, Error>> {
    try {
      const otp = await this.otpRepository.findByCodeAndHash({
        code: command.code,
        codeHash: command.codeHash,
        phoneNumber: command.phoneNumber,
        email: command.email,
      });

      if (!otp) {
        return new Failure(
          new BadRequestException({
            statusCode: 400,
            error: ErrorCodes.INVALID_OTP,
            message: ErrorMessages[ErrorCodes.INVALID_OTP],
          })
        );
      }

      if (new Date() > otp.expiresAt) {
        await this.otpRepository.delete(otp.id);
        return new Failure(
          new BadRequestException({
            statusCode: 400,
            error: ErrorCodes.OTP_EXPIRED,
            message: ErrorMessages[ErrorCodes.OTP_EXPIRED],
          })
        );
      }

      await this.otpRepository.delete(otp.id);

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
    @Inject(OTP_REPOSITORY) private readonly otpRepository: IOTPRepository,
    @Inject(OTP_SERVICE) private readonly otpService: IOTPService,
    @Inject(SMS_SERVICE) private readonly smsService: ISmsService,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService
  ) {}

  async execute(
    command: ForgotPasswordCommand
  ): Promise<Result<SendOTPResult, Error>> {
    try {
      let user: IUser | null = null;

      if (command.authMethod === 'PHONE_NUMBER' && command.phoneNumber) {
        user = await this.userRepository.findByPhoneNumber(command.phoneNumber);
      } else if (command.authMethod === 'EMAIL' && command.email) {
        user = await this.userRepository.findByEmail(command.email);
      }

      if (!user) {
        return new Failure(
          new NotFoundException(ErrorMessages[ErrorCodes.USER_NOT_FOUND])
        );
      }

      const { code, codeHash } = this.otpService.generateOTP();
      const expiresAt = this.otpService.getExpiresAt();

      await this.otpRepository.create({
        code,
        codeHash,
        authMethod: command.authMethod,
        phoneNumber: command.phoneNumber,
        email: command.email,
        expiresAt,
      });

      if (command.authMethod === 'PHONE_NUMBER' && command.phoneNumber) {
        await this.smsService.send(String(code), command.phoneNumber);
      } else if (command.authMethod === 'EMAIL' && command.email) {
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
