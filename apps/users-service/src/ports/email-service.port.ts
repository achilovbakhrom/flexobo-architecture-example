export interface IEmailService {
  send(to: string, subject: string, body: string): Promise<void>;
  sendOTP(to: string, code: string): Promise<void>;
}

export const EMAIL_SERVICE = Symbol('IEmailService');
