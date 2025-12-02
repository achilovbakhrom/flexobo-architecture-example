/**
 * Authentication Module
 */

import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService, JwtConfig } from './jwt.service';
import { PasswordService } from './password.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

export interface AuthModuleOptions {
  /**
   * JWT configuration
   */
  jwt: JwtConfig;

  /**
   * Enable global authentication guard
   */
  globalGuard?: boolean;

  /**
   * Make module global
   */
  global?: boolean;
}

@Global()
@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleOptions): DynamicModule {
    const jwtService = new JwtService(options.jwt);

    const providers: Provider[] = [
      {
        provide: JwtService,
        useValue: jwtService,
      },
      PasswordService,
      JwtAuthGuard,
      RolesGuard,
    ];

    // Add global guard if enabled
    if (options.globalGuard) {
      providers.push({
        provide: APP_GUARD,
        useClass: JwtAuthGuard,
      });
      providers.push({
        provide: APP_GUARD,
        useClass: RolesGuard,
      });
    }

    return {
      module: AuthModule,
      global: options.global !== false,
      providers,
      exports: [JwtService, PasswordService, JwtAuthGuard, RolesGuard],
    };
  }
}
