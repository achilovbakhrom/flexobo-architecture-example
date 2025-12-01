import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailService } from '../../ports';

@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(to: string, subject: string, body: string): Promise<void> {
    // TODO: Implement actual email sending via provider (SendGrid, AWS SES, etc.)
    // For now, just log the message
    this.logger.log(`Sending email to ${to}: ${subject}`);
    this.logger.debug(`Email body: ${body}`);

    // In production, integrate with actual email provider:
    // const emailApiKey = this.configService.get<string>('EMAIL_API_KEY');
    // await sendgrid.send({ to, subject, html: body });
  }

  async sendOTP(to: string, code: string): Promise<void> {
    const subject = 'Your verification code';
    const body = `Your verification code is: ${code}. It will expire in 5 minutes.`;
    await this.send(to, subject, body);
  }
}
