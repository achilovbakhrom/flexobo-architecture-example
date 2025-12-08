import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  Failure,
} from '@flexobo/core';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { AuthWithGoogleCommand } from './user.commands';
import {
  IUserRepository,
  USER_REPOSITORY,
  ITokenService,
  TOKEN_SERVICE,
  IUser,
  ErrorCodes,
  ErrorMessages,
  UserRole,
  AuthPlatform,
  IGoogleAuthService,
  GOOGLE_AUTH_SERVICE,
  ITokenPair,
} from '../../ports';
import { User } from '../../domain/user.aggregate';
import {
  IUserAggregateStore,
  USER_AGGREGATE_STORE,
} from '../../ports/user-store.port';

export interface GoogleAuthResult {
  user: IUser;
  tokens: ITokenPair;
  isNewUser: boolean;
}

@CommandHandler(AuthWithGoogleCommand)
export class AuthWithGoogleHandler
  implements ICommandHandler<AuthWithGoogleCommand, GoogleAuthResult>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(GOOGLE_AUTH_SERVICE)
    private readonly googleAuthService: IGoogleAuthService,
    @Inject(USER_AGGREGATE_STORE) private readonly store: IUserAggregateStore
  ) {}

  async execute(
    command: AuthWithGoogleCommand
  ): Promise<Result<GoogleAuthResult, Error>> {
    try {
      // Verify Google token and get user info
      const googleUserInfo = await this.googleAuthService.verifyIdToken(
        command.idToken
      );

      if (!googleUserInfo) {
        return new Failure(
          new UnauthorizedException(
            'Invalid Google token. Please provide a valid ID token (JWT format), not an access token. ' +
              'ID tokens are obtained from Google Sign-In and have 3 segments separated by dots.'
          )
        );
      }

      // Check if user exists by Google ID
      let existingUser = await this.userRepository.findByGoogleId(
        googleUserInfo.googleId
      );

      // If not found by Google ID, check by email
      if (!existingUser && googleUserInfo.email) {
        existingUser = await this.userRepository.findByEmail(
          googleUserInfo.email
        );
      }

      let isNewUser = false;
      let repoUser: IUser;

      if (existingUser) {
        // Existing user - login
        const user = await this.store.load(existingUser.id);

        if (!user) {
          return new Failure(
            new UnauthorizedException(
              ErrorMessages[ErrorCodes.INVALID_CREDENTIALS]
            )
          );
        }

        if (!user.isActive) {
          return new Failure(
            new UnauthorizedException(
              ErrorMessages[ErrorCodes.ACCOUNT_NOT_ACTIVE]
            )
          );
        }

        // Link Google account if not already linked
        if (!existingUser.googleId) {
          user.linkGoogle(googleUserInfo.googleId);
        }

        user.login();

        const tokens = await this.tokenService.generateTokens(
          user.id,
          user.loginIdentifier,
          user.role
        );

        // Track access token in User aggregate
        user.issueAccessToken(tokens.jti);
        await this.store.save(user);

        repoUser = existingUser;

        return new Success({
          user: repoUser,
          tokens,
          isNewUser: false,
        });
      } else {
        // New user - register
        isNewUser = true;

        const fio =
          `${googleUserInfo.firstName} ${googleUserInfo.lastName}`.trim();
        const uniqueId = await this.userRepository.generateUniqueId(fio);

        const user = User.create();

        user.register({
          fio,
          uniqueId,
          passwordHash: '', // No password for Google auth
          googleId: googleUserInfo.googleId,
          email: googleUserInfo.email,
          isPrivacyPolicyAccepted: command.isPrivacyPolicyAccepted,
          isSubscribedNewsletter: command.isSubscribedNewsletter,
          platform: AuthPlatform.Google,
          userType: command.userType,
        });

        const tokens = await this.tokenService.generateTokens(
          user.id,
          user.email || user.uniqueId || '',
          user.role || UserRole.User
        );

        // Track access token in User aggregate
        user.issueAccessToken(tokens.jti);
        await this.store.save(user);

        // Fetch the created user for response
        const createdUser = await this.userRepository.findByGoogleId(
          googleUserInfo.googleId
        );

        if (!createdUser) {
          // Return basic user info from aggregate if read model not yet synced
          repoUser = {
            id: user.id,
            uniqueId: user.uniqueId || uniqueId,
            email: googleUserInfo.email,
            phoneNumber: null,
            telegramId: null,
            googleId: googleUserInfo.googleId,
            passwordHash: '',
            fio,
            avatar: googleUserInfo.picture || null,
            role: UserRole.User,
            userType: command.userType || null,
            status: user.status!,
            language: 'en',
            isPrivacyPolicyAccepted: command.isPrivacyPolicyAccepted || false,
            isSubscribedNewsletter: command.isSubscribedNewsletter || false,
            platform: AuthPlatform.Google,
            isVerified: true, // Google accounts are verified
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        } else {
          repoUser = createdUser;
        }

        return new Success({
          user: repoUser,
          tokens,
          isNewUser: true,
        });
      }
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
