import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  IEmailService,
  SendEmailParams,
  SendOtpEmailParams,
  SendInvitationEmailParams,
  SendWelcomeEmailParams,
  SendNotificationEmailParams,
  EmailRecipient,
} from '../../ports/email-service.port';
import { otpTemplate, otpPlainText } from './templates/otp.template';
import { invitationTemplate, invitationPlainText } from './templates/invitation.template';
import { welcomeTemplate, welcomePlainText } from './templates/welcome.template';
import { notificationTemplate, notificationPlainText } from './templates/notification.template';

@Injectable()
export class EmailService implements IEmailService, OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress: string = '';
  private fromName: string = 'Flexobo';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    this.fromAddress = this.configService.get<string>('EMAIL_FROM', 'noreply@flexobo.com');
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'Flexobo');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP credentials not configured. Email service will be disabled.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      // Verify connection
      await this.transporter.verify();
      this.logger.log('SMTP connection established successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize email transporter: ${error}`);
      this.transporter = null;
    }
  }

  private formatRecipients(recipients: EmailRecipient | EmailRecipient[]): string {
    const list = Array.isArray(recipients) ? recipients : [recipients];
    return list.map((r) => (r.name ? `"${r.name}" <${r.email}>` : r.email)).join(', ');
  }

  async send(params: SendEmailParams): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email transporter not initialized, skipping email');
      return false;
    }

    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${this.fromName}" <${this.fromAddress}>`,
        to: this.formatRecipients(params.to),
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
        attachments: params.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      };

      const result = await this.transporter.sendMail(mailOptions);

      this.logger.log(`Email sent successfully: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
      return false;
    }
  }

  async sendOtp(params: SendOtpEmailParams): Promise<boolean> {
    const { to, code, expiresInMinutes, type } = params;

    const subjectByType: Record<string, string> = {
      REGISTRATION: 'Complete Your Registration - Verification Code',
      LOGIN: 'Sign In Verification Code',
      RESET_PASSWORD: 'Password Reset Verification Code',
    };

    return this.send({
      to,
      subject: subjectByType[type] || 'Verification Code',
      html: otpTemplate({ code, expiresInMinutes, type }),
      text: otpPlainText({ code, expiresInMinutes, type }),
    });
  }

  async sendInvitation(params: SendInvitationEmailParams): Promise<boolean> {
    const { to, inviterName, companyName, invitationLink, role } = params;

    return this.send({
      to,
      subject: `${inviterName} invited you to join ${companyName} on Flexobo`,
      html: invitationTemplate({
        inviterName,
        companyName,
        invitationLink,
        role,
        recipientName: to.name,
      }),
      text: invitationPlainText({
        inviterName,
        companyName,
        invitationLink,
        role,
        recipientName: to.name,
      }),
    });
  }

  async sendWelcome(params: SendWelcomeEmailParams): Promise<boolean> {
    const { to, firstName } = params;

    return this.send({
      to,
      subject: 'Welcome to Flexobo!',
      html: welcomeTemplate({ firstName }),
      text: welcomePlainText({ firstName }),
    });
  }

  async sendNotification(params: SendNotificationEmailParams): Promise<boolean> {
    const { to, title, message, actionUrl, actionText } = params;

    return this.send({
      to,
      subject: title,
      html: notificationTemplate({
        title,
        message,
        actionUrl,
        actionText,
        recipientName: to.name,
      }),
      text: notificationPlainText({
        title,
        message,
        actionUrl,
        actionText,
        recipientName: to.name,
      }),
    });
  }
}
