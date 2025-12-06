import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ISmsService,
  SendSmsParams,
  SendOtpSmsParams,
  SendNotificationSmsParams,
  SmsResult,
} from '../../ports/sms-service.port';

type SmsProvider = 'playmobile' | 'eskiz' | 'twilio';

interface ProviderConfig {
  baseUrl: string;
  authHeader: string;
  senderId: string;
}

@Injectable()
export class SmsService implements ISmsService, OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private provider: SmsProvider = 'playmobile';
  private apiKey: string = '';
  private senderId: string = 'FLEXOBO';
  private initialized: boolean = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.provider = this.configService.get<SmsProvider>('SMS_PROVIDER', 'playmobile');
    this.apiKey = this.configService.get<string>('SMS_API_KEY', '');
    this.senderId = this.configService.get<string>('SMS_SENDER_ID', 'FLEXOBO');

    if (!this.apiKey) {
      this.logger.warn('SMS API key not configured. SMS service will be disabled.');
      return;
    }

    this.initialized = true;
    this.logger.log(`SMS service initialized with provider: ${this.provider}`);
  }

  private getProviderConfig(): ProviderConfig | null {
    switch (this.provider) {
      case 'playmobile':
        return {
          baseUrl: 'https://send.smsxabar.uz/broker-api/send',
          authHeader: `Basic ${this.apiKey}`,
          senderId: this.senderId,
        };
      case 'eskiz':
        return {
          baseUrl: 'https://notify.eskiz.uz/api/message/sms/send',
          authHeader: `Bearer ${this.apiKey}`,
          senderId: this.senderId,
        };
      case 'twilio':
        // Twilio uses different auth mechanism
        return {
          baseUrl: `https://api.twilio.com/2010-04-01/Accounts/${this.configService.get('TWILIO_ACCOUNT_SID')}/Messages.json`,
          authHeader: `Basic ${Buffer.from(`${this.configService.get('TWILIO_ACCOUNT_SID')}:${this.apiKey}`).toString('base64')}`,
          senderId: this.configService.get('TWILIO_PHONE_NUMBER', ''),
        };
      default:
        return null;
    }
  }

  async send(params: SendSmsParams): Promise<SmsResult> {
    if (!this.initialized) {
      this.logger.warn('SMS service not initialized, skipping SMS');
      return { success: false, error: 'SMS service not initialized' };
    }

    const config = this.getProviderConfig();
    if (!config) {
      return { success: false, error: 'Invalid SMS provider' };
    }

    const recipients = Array.isArray(params.to) ? params.to : [params.to];

    try {
      for (const recipient of recipients) {
        const result = await this.sendToProvider(config, recipient, params.message);
        if (!result.success) {
          return result;
        }
      }

      this.logger.log(`SMS sent successfully to ${recipients.length} recipient(s)`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  private async sendToProvider(
    config: ProviderConfig,
    phone: string,
    message: string
  ): Promise<SmsResult> {
    try {
      let response: Response;
      let body: Record<string, unknown>;

      switch (this.provider) {
        case 'playmobile':
          body = {
            messages: [
              {
                recipient: this.normalizePhone(phone),
                'message-id': `flex-${Date.now()}`,
                sms: {
                  originator: config.senderId,
                  content: {
                    text: message,
                  },
                },
              },
            ],
          };
          response = await fetch(config.baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: config.authHeader,
            },
            body: JSON.stringify(body),
          });
          break;

        case 'eskiz':
          body = {
            mobile_phone: this.normalizePhone(phone),
            message: message,
            from: config.senderId,
          };
          response = await fetch(config.baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: config.authHeader,
            },
            body: JSON.stringify(body),
          });
          break;

        case 'twilio':
          const formData = new URLSearchParams();
          formData.append('To', phone);
          formData.append('From', config.senderId);
          formData.append('Body', message);

          response = await fetch(config.baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: config.authHeader,
            },
            body: formData.toString(),
          });
          break;

        default:
          return { success: false, error: 'Unknown provider' };
      }

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`SMS provider error: ${response.status} - ${errorText}`);
        return { success: false, error: `Provider error: ${response.status}` };
      }

      const result = await response.json();
      return {
        success: true,
        messageId: result.message_id || result.sid || result.id,
      };
    } catch (error) {
      this.logger.error(`SMS send error: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  private normalizePhone(phone: string): string {
    // Remove all non-digit characters
    let normalized = phone.replace(/\D/g, '');

    // Handle Uzbekistan numbers - add 998 if needed
    if (normalized.length === 9) {
      normalized = '998' + normalized;
    }

    // Ensure it starts with country code (no + prefix for most providers)
    return normalized;
  }

  async sendOtp(params: SendOtpSmsParams): Promise<SmsResult> {
    const { to, code, expiresInMinutes, type } = params;

    const messagesByType: Record<string, string> = {
      REGISTRATION: `Flexobo: Your registration code is ${code}. Valid for ${expiresInMinutes} minutes.`,
      LOGIN: `Flexobo: Your login code is ${code}. Valid for ${expiresInMinutes} minutes.`,
      RESET_PASSWORD: `Flexobo: Your password reset code is ${code}. Valid for ${expiresInMinutes} minutes.`,
    };

    const message = messagesByType[type] || messagesByType.LOGIN;

    return this.send({
      to,
      message,
    });
  }

  async sendNotification(params: SendNotificationSmsParams): Promise<SmsResult> {
    const { to, title, message } = params;

    const fullMessage = `Flexobo: ${title}\n${message}`;

    return this.send({
      to,
      message: fullMessage,
    });
  }
}
