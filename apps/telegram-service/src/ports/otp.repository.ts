export const OTP_REPOSITORY = Symbol('OTP_REPOSITORY');

export interface OtpReadDto {
  id: string;
  phone: string;
  telegramId: string | null;
  code: string;
  type: string;
  status: string;
  attempts: number;
  expiresAt: Date;
  verifiedAt: Date | null;
  createdAt: Date;
}

export interface IOtpRepository {
  findById(id: string): Promise<OtpReadDto | null>;
  findByPhone(phone: string, type?: string): Promise<OtpReadDto | null>;
  findByTelegramId(telegramId: string, type?: string): Promise<OtpReadDto | null>;
  create(data: {
    id: string;
    phone: string;
    telegramId?: string;
    code: string;
    type: string;
    expiresAt: Date;
  }): Promise<void>;
  updateStatus(id: string, status: string, verifiedAt?: Date): Promise<void>;
  incrementAttempts(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}
