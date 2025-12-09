import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler, Result, Success, Failure } from '@flexobo/core';
import { v4 as uuidv4 } from 'uuid';
import { TELEGRAM_BOT_SERVICE, ITelegramBotService } from '../../ports/telegram-bot.port';
import { OTP_REPOSITORY, IOtpRepository } from '../../ports/otp.repository';

export class SendOtpCommand implements ICommand {
  constructor(
    public readonly phone: string,
    public readonly telegramId: string,
    public readonly type: 'REGISTRATION' | 'LOGIN' | 'RESET_PASSWORD' = 'LOGIN',
    public readonly expiresInMinutes: number = 5
  ) {}
}

export interface SendOtpResult {
  success: boolean;
  otpId?: string;
  message: string;
}

@Injectable()
@CommandHandler(SendOtpCommand)
export class SendOtpHandler implements ICommandHandler<SendOtpCommand, SendOtpResult> {
  constructor(
    @Inject(TELEGRAM_BOT_SERVICE) private readonly telegramBot: ITelegramBotService,
    @Inject(OTP_REPOSITORY) private readonly otpRepository: IOtpRepository
  ) {}

  async execute(command: SendOtpCommand): Promise<Result<SendOtpResult, Error>> {
    try {
      // Check for existing pending OTP
      const existing = await this.otpRepository.findByPhone(command.phone, command.type);
      if (existing) {
        // Check if we should allow resend (e.g., after 1 minute)
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        if (existing.createdAt > oneMinuteAgo) {
          return new Success({
            success: false,
            message: 'Please wait before requesting a new code',
          });
        }
        // Mark old OTP as expired
        await this.otpRepository.updateStatus(existing.id, 'EXPIRED');
      }

      // Generate OTP code (6 digits)
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const otpId = uuidv4();
      const expiresAt = new Date(Date.now() + command.expiresInMinutes * 60 * 1000);

      // Store OTP
      await this.otpRepository.create({
        id: otpId,
        phone: command.phone,
        telegramId: command.telegramId,
        code,
        type: command.type,
        expiresAt,
      });

      // Send via Telegram
      const sent = await this.telegramBot.sendOtp({
        telegramId: command.telegramId,
        code,
        expiresInMinutes: command.expiresInMinutes,
      });

      if (!sent) {
        await this.otpRepository.updateStatus(otpId, 'FAILED');
        return new Success({
          success: false,
          message: 'Failed to send OTP via Telegram',
        });
      }

      return new Success({
        success: true,
        otpId,
        message: 'OTP sent successfully',
      });
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
