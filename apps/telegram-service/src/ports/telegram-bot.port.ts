export const TELEGRAM_BOT_SERVICE = Symbol('TELEGRAM_BOT_SERVICE');

export interface SendOtpParams {
  telegramId: string;
  code: string;
  expiresInMinutes: number;
}

export interface PublishContentParams {
  channelId: string;
  type: 'LOAD' | 'TRIP';
  title: string;
  description: string;
  details: Record<string, string>;
  link?: string;
}

export interface ITelegramBotService {
  sendOtp(params: SendOtpParams): Promise<boolean>;
  publishToChannel(params: PublishContentParams): Promise<{ messageId: string } | null>;
  deleteMessage(channelId: string, messageId: string): Promise<boolean>;
  validateWebAppData(initData: string): Promise<{
    valid: boolean;
    telegramId?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }>;
}
