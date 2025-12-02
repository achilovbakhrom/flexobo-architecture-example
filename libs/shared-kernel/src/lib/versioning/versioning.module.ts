/**
 * NestJS module for API versioning
 */

import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { VersionManager } from './version.manager';
import { MessageVersionRegistry } from './message-version.registry';
import { VersionInterceptor } from './version.interceptor';
import { VersioningStrategy, VersionMetadata } from './version.types';

/**
 * Versioning module options
 */
export interface VersioningModuleOptions {
  /**
   * Versioning strategy to use
   */
  strategy?: VersioningStrategy;

  /**
   * Default API version
   */
  defaultVersion?: string;

  /**
   * Pre-register versions
   */
  versions?: VersionMetadata[];

  /**
   * Make module global
   */
  global?: boolean;
}

@Global()
@Module({})
export class VersioningModule {
  static forRoot(options: VersioningModuleOptions = {}): DynamicModule {
    const versionManager = new VersionManager();
    const messageRegistry = new MessageVersionRegistry();

    // Set default version
    if (options.defaultVersion) {
      versionManager.setDefaultVersion(options.defaultVersion);
    }

    // Register versions
    if (options.versions) {
      options.versions.forEach((version) => {
        versionManager.registerVersion(version);
      });
    }

    const providers = [
      {
        provide: VersionManager,
        useValue: versionManager,
      } as const,
      {
        provide: MessageVersionRegistry,
        useValue: messageRegistry,
      } as const,
      {
        provide: VersionInterceptor,
        useFactory: (vm: VersionManager) => {
          return new VersionInterceptor(
            vm,
            options.strategy || VersioningStrategy.URI
          );
        },
        inject: [VersionManager],
      },
    ];

    return {
      module: VersioningModule,
      global: options.global !== false,
      providers: providers as Provider[],
      exports: providers as Provider[],
    };
  }
}
