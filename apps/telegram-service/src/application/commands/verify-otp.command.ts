import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler, Result, Success, Failure } from '@flexobo/core';
import { OTP_REPOSITORY, IOtpRepository } from '../../ports/otp.repository';

export class VerifyOtpCommand implements ICommand {
  constructor(
    public readonly phone: string,
    public readonly code: string,
    public readonly type?: string
  ) {}
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
}

const MAX_ATTEMPTS = 5;

@Injectable()
@CommandHandler(VerifyOtpCommand)
export class VerifyOtpHandler implements ICommandHandler<VerifyOtpCommand, VerifyOtpResult> {
  constructor(
    @Inject(OTP_REPOSITORY) private readonly otpRepository: IOtpRepository
  ) {}

  async execute(command: VerifyOtpCommand): Promise<Result<VerifyOtpResult, Error>> {
    try {
      // Find pending OTP
      const otp = await this.otpRepository.findByPhone(command.phone, command.type);

      if (!otp) {
        return new Success({
          success: false,
          message: 'No pending verification code found',
        });
      }

      // Check if expired
      if (otp.expiresAt < new Date()) {
        await this.otpRepository.updateStatus(otp.id, 'EXPIRED');
        return new Success({
          success: false,
          message: 'Verification code has expired',
        });
      }

      // Check attempts
      if (otp.attempts >= MAX_ATTEMPTS) {
        await this.otpRepository.updateStatus(otp.id, 'EXPIRED');
        return new Success({
          success: false,
          message: 'Too many failed attempts',
        });
      }

      // Verify code
      if (otp.code !== command.code) {
        await this.otpRepository.incrementAttempts(otp.id);
        return new Success({
          success: false,
          message: 'Invalid verification code',
        });
      }

      // Mark as verified
      await this.otpRepository.updateStatus(otp.id, 'VERIFIED', new Date());

      return new Success({
        success: true,
        message: 'Code verified successfully',
      });
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
