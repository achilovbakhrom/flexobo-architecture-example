import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BILLING_CLIENT, IBillingClient, UsageType } from './interfaces';

export const SUBSCRIPTION_REQUIRED_KEY = 'subscription_required';
export const FEATURE_LIMIT_KEY = 'feature_limit';

export interface FeatureLimitMetadata {
  usageType: UsageType;
  quantity?: number;
  getCompanyId?: (request: unknown) => string;
}

/**
 * Decorator to require an active subscription
 */
export const RequireSubscription = () =>
  SetMetadata(SUBSCRIPTION_REQUIRED_KEY, true);

/**
 * Decorator to check feature limits before allowing an action
 */
export const CheckFeatureLimit = (
  usageType: UsageType,
  options?: { quantity?: number; getCompanyId?: (request: unknown) => string }
) =>
  SetMetadata(FEATURE_LIMIT_KEY, {
    usageType,
    quantity: options?.quantity ?? 1,
    getCompanyId: options?.getCompanyId,
  });

/**
 * Guard that checks if the user has an active subscription
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(BILLING_CLIENT) private readonly billingClient: IBillingClient
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresSubscription = this.reflector.getAllAndOverride<boolean>(
      SUBSCRIPTION_REQUIRED_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiresSubscription) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const companyId = this.getCompanyId(request);

    if (!companyId) {
      throw new ForbiddenException('Company context required');
    }

    const hasActiveSubscription =
      await this.billingClient.hasActiveSubscription(companyId);

    if (!hasActiveSubscription) {
      throw new ForbiddenException(
        'Active subscription required to perform this action'
      );
    }

    return true;
  }

  private getCompanyId(request: { user?: { companyId?: string }; headers?: { 'x-company-id'?: string } }): string | undefined {
    // Try to get company ID from user context
    if (request.user?.companyId) {
      return request.user.companyId;
    }

    // Try to get from header
    if (request.headers?.['x-company-id']) {
      return request.headers['x-company-id'];
    }

    return undefined;
  }
}

/**
 * Guard that checks feature limits before allowing an action
 */
@Injectable()
export class FeatureLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(BILLING_CLIENT) private readonly billingClient: IBillingClient
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureLimitMeta = this.reflector.getAllAndOverride<FeatureLimitMetadata>(
      FEATURE_LIMIT_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!featureLimitMeta) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const companyId = featureLimitMeta.getCompanyId
      ? featureLimitMeta.getCompanyId(request)
      : this.getCompanyId(request);

    if (!companyId) {
      throw new ForbiddenException('Company context required');
    }

    const result = await this.billingClient.checkLimit(
      companyId,
      featureLimitMeta.usageType,
      featureLimitMeta.quantity ?? 1
    );

    if (!result.allowed) {
      throw new ForbiddenException(
        result.reason ||
          `You have reached your ${featureLimitMeta.usageType} limit. Please upgrade your plan.`
      );
    }

    return true;
  }

  private getCompanyId(request: { user?: { companyId?: string }; headers?: { 'x-company-id'?: string } }): string | undefined {
    if (request.user?.companyId) {
      return request.user.companyId;
    }

    if (request.headers?.['x-company-id']) {
      return request.headers['x-company-id'];
    }

    return undefined;
  }
}
