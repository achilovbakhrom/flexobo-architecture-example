import { ICommand } from '@flexobo/core';
import { AuthMethod, AuthPlatform, UserType } from '../../ports';

export class RegisterUserCommand implements ICommand {
  constructor(
    public readonly fio: string,
    public readonly password: string,
    public readonly phoneNumber?: string,
    public readonly telegramId?: string,
    public readonly email?: string,
    public readonly isPrivacyPolicyAccepted?: boolean,
    public readonly isSubscribedNewsletter?: boolean,
    public readonly platform?: AuthPlatform,
    public readonly userType?: UserType
  ) {}
}

export class RegisterWithTelegramCommand implements ICommand {
  constructor(
    public readonly fio: string,
    public readonly phoneNumber: string,
    public readonly telegramId: string,
    public readonly isPrivacyPolicyAccepted?: boolean,
    public readonly isSubscribedNewsletter?: boolean,
    public readonly userType?: UserType
  ) {}
}

export class LoginUserCommand implements ICommand {
  constructor(
    public readonly email: string,
    public readonly password: string
  ) {}
}

export class LoginWithTelegramCommand implements ICommand {
  constructor(public readonly telegramId: string) {}
}

export class RefreshTokenCommand implements ICommand {
  constructor(public readonly refreshToken: string) {}
}

export class LogoutUserCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly jti: string
  ) {}
}

export class UpdateUserProfileCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly fio?: string,
    public readonly phoneNumber?: string,
    public readonly language?: string,
    public readonly avatar?: string
  ) {}
}

// OTP Commands
export class SendOTPCommand implements ICommand {
  constructor(
    public readonly authMethod: AuthMethod,
    public readonly phoneNumber?: string,
    public readonly email?: string,
    public readonly forRegistration?: boolean
  ) {}
}

export class VerifyOTPCommand implements ICommand {
  constructor(
    public readonly code: number,
    public readonly codeHash: string,
    public readonly phoneNumber?: string,
    public readonly email?: string
  ) {}
}

// Password Commands
export class ForgotPasswordCommand implements ICommand {
  constructor(
    public readonly authMethod: AuthMethod,
    public readonly email?: string,
    public readonly phoneNumber?: string
  ) {}
}

export class ResetPasswordCommand implements ICommand {
  constructor(
    public readonly authMethod: AuthMethod,
    public readonly newPassword: string,
    public readonly email?: string,
    public readonly phoneNumber?: string
  ) {}
}

export class ChangePasswordCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly oldPassword: string | undefined,
    public readonly newPassword: string
  ) {}
}

// Telegram Commands
export class LinkTelegramCommand implements ICommand {
  constructor(
    public readonly phoneNumber: string,
    public readonly telegramId: string
  ) {}
}

// Google Commands
export class AuthWithGoogleCommand implements ICommand {
  constructor(
    public readonly idToken: string,
    public readonly isPrivacyPolicyAccepted?: boolean,
    public readonly isSubscribedNewsletter?: boolean,
    public readonly userType?: UserType
  ) {}
}
