export interface GoogleUserInfo {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
}

export interface IGoogleAuthService {
  /**
   * Verifies a Google ID token and extracts user information
   * @param idToken - The Google ID token from the client
   * @returns GoogleUserInfo if token is valid, null otherwise
   */
  verifyIdToken(idToken: string): Promise<GoogleUserInfo | null>;
}

export const GOOGLE_AUTH_SERVICE = Symbol('IGoogleAuthService');
