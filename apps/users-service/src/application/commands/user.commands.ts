import { ICommand } from '@flexobo/core';
import { AuthPlatform, UserType } from '../../ports';

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

export class LoginUserCommand implements ICommand {
  constructor(
    public readonly email: string,
    public readonly password: string
  ) {}
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
