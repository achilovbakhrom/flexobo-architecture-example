import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  ITelegramBotService,
  SendOtpParams,
  PublishContentParams,
} from '../../ports/telegram-bot.port';

// Type definitions for Telegraf (we'll use fetch for simplicity)
interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

interface TelegramMessage {
  message_id: number;
}

@Injectable()
export class TelegramBotService implements ITelegramBotService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly botToken: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegram.botToken') || '';
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async onModuleInit() {
    if (!this.botToken) {
      this.logger.warn('Telegram bot token not configured');
      return;
    }

    try {
      const me = await this.callApi<{ id: number; username: string }>('getMe');
      if (me) {
        this.logger.log(`Telegram bot initialized: @${me.username}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize Telegram bot', error);
    }
  }

  async onModuleDestroy() {
    // Cleanup if needed
  }

  async sendOtp(params: SendOtpParams): Promise<boolean> {
    if (!this.botToken) {
      this.logger.warn('Telegram bot token not configured, cannot send OTP');
      return false;
    }

    try {
      const message = `🔐 Your verification code: *${params.code}*\n\nThis code will expire in ${params.expiresInMinutes} minutes.\n\n_Do not share this code with anyone._`;

      const result = await this.callApi<TelegramMessage>('sendMessage', {
        chat_id: params.telegramId,
        text: message,
        parse_mode: 'Markdown',
      });

      return !!result;
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${params.telegramId}`, error);
      return false;
    }
  }

  async publishToChannel(params: PublishContentParams): Promise<{ messageId: string } | null> {
    if (!this.botToken) {
      this.logger.warn('Telegram bot token not configured, cannot publish');
      return null;
    }

    try {
      // Format the message
      const emoji = params.type === 'LOAD' ? '📦' : '🚚';
      const typeLabel = params.type === 'LOAD' ? 'New Load' : 'Available Trip';

      let message = `${emoji} *${typeLabel}*\n\n`;
      message += `*${params.title}*\n`;
      message += `${params.description}\n\n`;

      // Add details
      for (const [key, value] of Object.entries(params.details)) {
        message += `• ${key}: ${value}\n`;
      }

      if (params.link) {
        message += `\n🔗 [View Details](${params.link})`;
      }

      const result = await this.callApi<TelegramMessage>('sendMessage', {
        chat_id: params.channelId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      });

      if (result) {
        return { messageId: result.message_id.toString() };
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to publish to channel ${params.channelId}`, error);
      return null;
    }
  }

  async deleteMessage(channelId: string, messageId: string): Promise<boolean> {
    if (!this.botToken) {
      return false;
    }

    try {
      await this.callApi('deleteMessage', {
        chat_id: channelId,
        message_id: parseInt(messageId, 10),
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete message ${messageId} from ${channelId}`, error);
      return false;
    }
  }

  async validateWebAppData(initData: string): Promise<{
    valid: boolean;
    telegramId?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }> {
    if (!this.botToken) {
      return { valid: false };
    }

    try {
      // Parse initData
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');

      if (!hash) {
        return { valid: false };
      }

      // Remove hash from params for validation
      params.delete('hash');

      // Sort parameters alphabetically
      const sortedParams = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Create HMAC-SHA256
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(this.botToken)
        .digest();

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(sortedParams)
        .digest('hex');

      if (calculatedHash !== hash) {
        return { valid: false };
      }

      // Parse user data
      const userJson = params.get('user');
      if (!userJson) {
        return { valid: true };
      }

      const user = JSON.parse(userJson);
      return {
        valid: true,
        telegramId: user.id?.toString(),
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
      };
    } catch (error) {
      this.logger.error('Failed to validate WebApp data', error);
      return { valid: false };
    }
  }

  private async callApi<T>(method: string, params?: Record<string, unknown>): Promise<T | null> {
    try {
      const response = await fetch(`${this.apiUrl}/${method}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: params ? JSON.stringify(params) : undefined,
      });

      const data = (await response.json()) as TelegramResponse<T>;

      if (!data.ok) {
        this.logger.error(`Telegram API error: ${data.description}`);
        return null;
      }

      return data.result || null;
    } catch (error) {
      this.logger.error(`Telegram API call failed: ${method}`, error);
      return null;
    }
  }
}
