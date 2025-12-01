import { IOTP, AuthMethod } from './user.interface';

export interface CreateOTPData {
  code: number;
  codeHash: string;
  authMethod: AuthMethod;
  phoneNumber?: string;
  email?: string;
  expiresAt: Date;
}

export interface FindOTPParams {
  code: number;
  codeHash: string;
  phoneNumber?: string;
  email?: string;
}

export interface IOTPRepository {
  create(data: CreateOTPData): Promise<IOTP>;
  findByCodeAndHash(params: FindOTPParams): Promise<IOTP | null>;
  delete(id: string): Promise<void>;
  deleteExpired(): Promise<void>;
}

export const OTP_REPOSITORY = Symbol('IOTPRepository');
