import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import {
  IGoogleAuthService,
  GoogleUserInfo,
} from '../../ports/google-auth-service.port';

@Injectable()
export class GoogleAuthService implements IGoogleAuthService {
  private readonly oAuth2Client: OAuth2Client;
  private readonly clientId: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('google.clientId', '');
    if (!this.clientId) {
      console.warn(
        '⚠️  Google OAuth is not configured. Set GOOGLE_CLIENT_ID environment variable.'
      );
    }
    this.oAuth2Client = new OAuth2Client(this.clientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleUserInfo | null> {
    if (!this.clientId) {
      console.error('Google OAuth: Missing GOOGLE_CLIENT_ID configuration');
      return null;
    }

    // Validate token format - ID tokens are JWTs with 3 parts separated by dots
    const tokenParts = idToken.split('.');
    if (tokenParts.length !== 3) {
      console.error(
        'Invalid token format: Expected ID token (JWT), but received an access token or malformed token.',
        '\nID tokens have 3 segments (header.payload.signature).',
        '\nAccess tokens are opaque strings and cannot be used for authentication.',
        '\nPlease send the ID token from the Google Sign-In response.'
      );
      return null;
    }

    try {
      const ticket = await this.oAuth2Client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        return null;
      }

      const googleId = payload.sub;
      const email = payload.email;
      const firstName = payload.given_name || '';
      const lastName = payload.family_name || '';
      const picture = payload.picture;

      if (!googleId || !email) {
        return null;
      }

      return {
        googleId,
        email,
        firstName,
        lastName,
        picture,
      };
    } catch (error) {
      console.error('Google token verification failed:', error);
      return null;
    }
  }
}
