import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISmsService } from '../../ports';

@Injectable()
export class SmsService implements ISmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(message: string, phoneNumber: string): Promise<void> {
    this.logger.log(`Sending SMS to ${phoneNumber}: ${message}`);

    // const smsApiKey = this.configService.get<string>('SMS_API_KEY');
    // const smsApiUrl = this.configService.get<string>('SMS_API_URL');
    // await axios.post(smsApiUrl, { to: phoneNumber, message }, { headers: { 'Authorization': `Bearer ${smsApiKey}` } });
  }
}
