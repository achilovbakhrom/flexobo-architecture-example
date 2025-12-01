export interface ISmsService {
  send(message: string, phoneNumber: string): Promise<void>;
}

export const SMS_SERVICE = Symbol('ISmsService');
