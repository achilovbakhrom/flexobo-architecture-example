import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BillingClientService } from './billing-client.service';
import { BILLING_CLIENT } from './interfaces';
import { SubscriptionGuard, FeatureLimitGuard } from './subscription.guard';

export interface BillingModuleOptions {
  grpcClientProvider?: Provider;
}

@Module({})
export class BillingModule {
  static forRoot(options?: BillingModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: BILLING_CLIENT,
        useClass: BillingClientService,
      },
      BillingClientService,
      SubscriptionGuard,
      FeatureLimitGuard,
    ];

    if (options?.grpcClientProvider) {
      providers.push(options.grpcClientProvider);
    }

    return {
      module: BillingModule,
      imports: [ConfigModule],
      providers,
      exports: [
        BILLING_CLIENT,
        BillingClientService,
        SubscriptionGuard,
        FeatureLimitGuard,
      ],
    };
  }
}
