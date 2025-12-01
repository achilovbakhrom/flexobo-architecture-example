import { ITokenPayload, ITokenPair } from './user.interface';

export interface ITokenService {
  generateTokens(userId: string, email: string, role: string): Promise<ITokenPair>;
  verifyAccessToken(token: string): ITokenPayload;
  verifyRefreshToken(token: string): ITokenPayload;
  decodeToken(token: string): ITokenPayload | null;
}

export const TOKEN_SERVICE = Symbol('ITokenService');
