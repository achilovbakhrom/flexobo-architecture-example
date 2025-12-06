export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailParams {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendOtpEmailParams {
  to: EmailRecipient;
  code: string;
  expiresInMinutes: number;
  type: 'REGISTRATION' | 'LOGIN' | 'RESET_PASSWORD';
}

export interface SendInvitationEmailParams {
  to: EmailRecipient;
  inviterName: string;
  companyName: string;
  invitationLink: string;
  role: string;
}

export interface SendWelcomeEmailParams {
  to: EmailRecipient;
  firstName?: string;
}

export interface SendNotificationEmailParams {
  to: EmailRecipient;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

export interface IEmailService {
  send(params: SendEmailParams): Promise<boolean>;
  sendOtp(params: SendOtpEmailParams): Promise<boolean>;
  sendInvitation(params: SendInvitationEmailParams): Promise<boolean>;
  sendWelcome(params: SendWelcomeEmailParams): Promise<boolean>;
  sendNotification(params: SendNotificationEmailParams): Promise<boolean>;
}
