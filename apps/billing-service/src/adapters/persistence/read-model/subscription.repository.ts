import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.module';
import { PaymentProvider, SubscriptionStatus, UsageType } from '../../../domain/constants/enums';
import {
  ISubscriptionReadRepository,
  SubscriptionReadData,
} from '../../../ports/subscription.repository';

@Injectable()
export class SubscriptionReadRepository implements ISubscriptionReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<SubscriptionReadData | null> {
    const subscription = await this.prisma.subscriptionReadModel.findUnique({
      where: { id },
    });

    if (!subscription) {
      return null;
    }

    return this.toDto(subscription);
  }

  async findByCompanyId(companyId: string): Promise<SubscriptionReadData | null> {
    const subscription = await this.prisma.subscriptionReadModel.findUnique({
      where: { companyId },
    });

    if (!subscription) {
      return null;
    }

    return this.toDto(subscription);
  }

  async findByExternalId(
    provider: PaymentProvider,
    externalId: string,
  ): Promise<SubscriptionReadData | null> {
    const subscription = await this.prisma.subscriptionReadModel.findFirst({
      where: {
        paymentProvider: provider,
        externalId,
      },
    });

    if (!subscription) {
      return null;
    }

    return this.toDto(subscription);
  }

  async findExpiring(beforeDate: Date): Promise<SubscriptionReadData[]> {
    const subscriptions = await this.prisma.subscriptionReadModel.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: {
          lte: beforeDate,
        },
        cancelAtPeriodEnd: false,
      },
      orderBy: { currentPeriodEnd: 'asc' },
    });

    return subscriptions.map((sub) => this.toDto(sub));
  }

  async findByStatus(status: SubscriptionStatus): Promise<SubscriptionReadData[]> {
    const subscriptions = await this.prisma.subscriptionReadModel.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map((sub) => this.toDto(sub));
  }

  async save(subscription: SubscriptionReadData): Promise<void> {
    await this.prisma.subscriptionReadModel.upsert({
      where: { id: subscription.id },
      create: {
        id: subscription.id,
        companyId: subscription.companyId,
        planId: subscription.planId,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEnd: subscription.trialEnd,
        paymentProvider: subscription.paymentProvider,
        externalId: subscription.externalId,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelledAt: subscription.cancelledAt,
        cancellationReason: subscription.cancellationReason,
        usageData: subscription.usageData as object,
        version: subscription.version,
      },
      update: {
        companyId: subscription.companyId,
        planId: subscription.planId,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEnd: subscription.trialEnd,
        paymentProvider: subscription.paymentProvider,
        externalId: subscription.externalId,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelledAt: subscription.cancelledAt,
        cancellationReason: subscription.cancellationReason,
        usageData: subscription.usageData as object,
        version: subscription.version,
      },
    });
  }

  async update(id: string, data: Partial<SubscriptionReadData>): Promise<void> {
    await this.prisma.subscriptionReadModel.update({
      where: { id },
      data: {
        ...data,
        usageData: data.usageData ? (data.usageData as object) : undefined,
      },
    });
  }

  async incrementUsage(id: string, usageType: UsageType, quantity: number): Promise<void> {
    const subscription = await this.prisma.subscriptionReadModel.findUnique({
      where: { id },
    });

    if (!subscription) {
      return;
    }

    const usageData = (subscription.usageData as Record<string, number>) || {};
    usageData[usageType] = (usageData[usageType] || 0) + quantity;

    await this.prisma.subscriptionReadModel.update({
      where: { id },
      data: { usageData },
    });
  }

  async resetUsage(id: string): Promise<void> {
    await this.prisma.subscriptionReadModel.update({
      where: { id },
      data: { usageData: {} },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDto(subscription: any): SubscriptionReadData {
    return {
      id: subscription.id,
      companyId: subscription.companyId,
      planId: subscription.planId,
      status: subscription.status as SubscriptionStatus,
      billingCycle: subscription.billingCycle,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEnd: subscription.trialEnd,
      paymentProvider: subscription.paymentProvider as PaymentProvider | undefined,
      externalId: subscription.externalId,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      cancelledAt: subscription.cancelledAt,
      cancellationReason: subscription.cancellationReason,
      usageData: subscription.usageData as Record<string, number>,
      version: subscription.version,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }
}
