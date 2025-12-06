export const SMS_SERVICE = Symbol('SMS_SERVICE');

export interface SmsRecipient {
  phone: string;
  name?: string;
}

export interface SendSmsParams {
  to: string | string[];
  message: string;
}

export interface SendOtpSmsParams {
  to: string;
  code: string;
  expiresInMinutes: number;
  type: 'REGISTRATION' | 'LOGIN' | 'RESET_PASSWORD';
}

export interface SendNotificationSmsParams {
  to: string;
  title: string;
  message: string;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ISmsService {
  send(params: SendSmsParams): Promise<SmsResult>;
  sendOtp(params: SendOtpSmsParams): Promise<SmsResult>;
  sendNotification(params: SendNotificationSmsParams): Promise<SmsResult>;
}
