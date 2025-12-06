import { SendOtpHandler } from './send-otp.command';
import { VerifyOtpHandler } from './verify-otp.command';
import { PublishContentHandler } from './publish-content.command';
import { ValidateWebAppHandler } from './validate-webapp.command';

export * from './send-otp.command';
export * from './verify-otp.command';
export * from './publish-content.command';
export * from './validate-webapp.command';

export const CommandHandlers = [
  SendOtpHandler,
  VerifyOtpHandler,
  PublishContentHandler,
  ValidateWebAppHandler,
];
