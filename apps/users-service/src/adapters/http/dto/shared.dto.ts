import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  isEmail,
} from 'class-validator';
import {
  AuthMethod,
  UserStatus as PortUserStatus,
  UserType as PortUserType,
  AuthPlatform as PortAuthPlatform,
} from '../../../ports';

// Re-export enums from ports to ensure consistency
export const UserStatus = PortUserStatus;
export type UserStatus = PortUserStatus;

export const UserType = PortUserType;
export type UserType = PortUserType;

export const AuthPlatform = PortAuthPlatform;
export type AuthPlatform = PortAuthPlatform;

export const PHONE_NUMBER_REGEX = /^\d{7,15}$/;

interface AuthMethodValidationResult {
  isValid: boolean;
  errorMessage: string;
}

@ValidatorConstraint({ name: 'authMethodFieldRequired', async: false })
export class AuthMethodFieldRequiredValidator
  implements ValidatorConstraintInterface
{
  private validationError = '';

  validate(_value: unknown, args: ValidationArguments): boolean {
    const object = args.object as {
      authMethod?: AuthMethod;
      phoneNumber?: string;
      email?: string;
    };
    const result = this.validateAuthMethodField(object);
    this.validationError = result.errorMessage;
    return result.isValid;
  }

  defaultMessage(): string {
    return this.validationError || 'Invalid authMethod';
  }

  private validateAuthMethodField(object: {
    authMethod?: AuthMethod;
    phoneNumber?: string;
    email?: string;
  }): AuthMethodValidationResult {
    if (object.authMethod === AuthMethod.PhoneNumber) {
      return this.validatePhoneNumber(object.phoneNumber);
    }

    if (object.authMethod === AuthMethod.Email) {
      return this.validateEmail(object.email);
    }

    return {
      isValid: false,
      errorMessage: 'Invalid authMethod',
    };
  }

  private validatePhoneNumber(
    phoneNumber?: string
  ): AuthMethodValidationResult {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      return {
        isValid: false,
        errorMessage: 'phoneNumber is required when authMethod is phone_number',
      };
    }

    const normalizedPhone = phoneNumber.trim().replace(/^\+/, '');

    if (!PHONE_NUMBER_REGEX.test(normalizedPhone)) {
      return {
        isValid: false,
        errorMessage: 'phoneNumber must be a valid phone number (7-15 digits)',
      };
    }

    return { isValid: true, errorMessage: '' };
  }

  private validateEmail(email?: string): AuthMethodValidationResult {
    if (!email || email.trim().length === 0) {
      return {
        isValid: false,
        errorMessage: 'email is required when authMethod is email',
      };
    }

    const trimmedEmail = email.trim();

    if (!isEmail(trimmedEmail)) {
      return {
        isValid: false,
        errorMessage: 'email must be a valid email address',
      };
    }

    return { isValid: true, errorMessage: '' };
  }
}

export type UserTypeWithoutCompanyDriver = Exclude<
  UserType,
  typeof UserType.CompanyDriver
>;

export const UserTypeEnumWithoutCompanyDriver = {
  Broker: UserType.Broker,
  LoadOwner: UserType.LoadOwner,
  Carrier: UserType.Carrier,
  OwnerOperator: UserType.OwnerOperator,
} as const;
