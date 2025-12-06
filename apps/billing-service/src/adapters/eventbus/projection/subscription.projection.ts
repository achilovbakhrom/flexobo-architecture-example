import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma.module';
import {
  SubscriptionCreatedEventData,
  SubscriptionActivatedEventData,
  SubscriptionPlanChangedEventData,
  UsageRecordedEventData,
  SubscriptionCancellationScheduledEventData,
  SubscriptionCancelledEventData,
  SubscriptionRenewedEventData,
  SubscriptionPastDueEventData,
  SubscriptionExpiredEventData,
} from '../../../domain/events/subscription.events';
import { SubscriptionStatus } from '../../../domain/constants/enums';

interface ProjectedEvent<T> {
  aggregateId: string;
  data: T;
  version: number;
  timestamp: Date;
}

@Injectable()
export class SubscriptionProjection implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionProjection.name);

  constructor(@Inject('PrismaService') private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log('SubscriptionProjection initialized');
  }

  @OnEvent('subscription.created')
  async handleSubscriptionCreated(
    event: ProjectedEvent<SubscriptionCreatedEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting SubscriptionCreatedEvent for ${event.aggregateId}`,
    );

    const data = event.data;

    await this.prisma.subscriptionReadModel.create({
      data: {
        id: data.subscriptionId,
        companyId: data.companyId,
        planId: data.planId,
        status: data.status,
        billingCycle: data.billingCycle,
        currentPeriodStart: new Date(data.currentPeriodStart),
        currentPeriodEnd: new Date(data.currentPeriodEnd),
        trialEnd: data.trialEnd ? new Date(data.trialEnd) : null,
        cancelAtPeriodEnd: false,
        usageData: {},
        version: event.version,
      },
    });
  }

  @OnEvent('subscription.activated')
  async handleSubscriptionActivated(
    event: ProjectedEvent<SubscriptionActivatedEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting SubscriptionActivatedEvent for ${event.aggregateId}`,
    );

    const data = event.data;

    await this.prisma.subscriptionReadModel.update({
      where: { id: data.subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        paymentProvider: data.paymentProvider,
        externalId: data.externalId,
        version: event.version,
      },
    });
  }

  @OnEvent('subscription.plan_changed')
  async handleSubscriptionPlanChanged(
    event: ProjectedEvent<SubscriptionPlanChangedEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting SubscriptionPlanChangedEvent for ${event.aggregateId}`,
    );

    const data = event.data;

    await this.prisma.subscriptionReadModel.update({
      where: { id: data.subscriptionId },
      data: {
        planId: data.newPlanId,
        version: event.version,
      },
    });
  }

  @OnEvent('subscription.usage_recorded')
  async handleUsageRecorded(
    event: ProjectedEvent<UsageRecordedEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting UsageRecordedEvent for ${event.aggregateId}`,
    );

    const data = event.data;

    // Get current usage data
    const subscription = await this.prisma.subscriptionReadModel.findUnique({
      where: { id: data.subscriptionId },
    });

    if (!subscription) {
      this.logger.warn(
        `Subscription ${data.subscriptionId} not found for usage update`,
      );
      return;
    }

    const currentUsage = subscription.usageData as Record<string, number>;
    const newUsage = {
      ...currentUsage,
      [data.usageType]: (currentUsage[data.usageType] ?? 0) + data.quantity,
    };

    await this.prisma.subscriptionReadModel.update({
      where: { id: data.subscriptionId },
      data: {
        usageData: newUsage,
        version: event.version,
      },
    });

    // Also log to usage log for audit
    await this.prisma.usageLogReadModel.create({
      data: {
        subscriptionId: data.subscriptionId,
        companyId: data.companyId,
        usageType: data.usageType,
        quantity: data.quantity,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    });
  }

  @OnEvent('subscription.cancellation_scheduled')
  async handleCancellationScheduled(
    event: ProjectedEvent<SubscriptionCancellationScheduledEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting SubscriptionCancellationScheduledEvent for ${event.aggregateId}`,
    );

    const data = event.data;

    await this.prisma.subscriptionReadModel.update({
      where: { id: data.subscriptionId },
      data: {
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        cancellationReason: data.reason,
        version: event.version,
      },
    });
  }

  @OnEvent('subscription.cancelled')
  async handleSubscriptionCancelled(
    event: ProjectedEvent<SubscriptionCancelledEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting SubscriptionCancelledEvent for ${event.aggregateId}`,
    );

    const data = event.data;

    await this.prisma.subscriptionReadModel.update({
      where: { id: data.subscriptionId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(data.cancelledAt),
        cancellationReason: data.reason,
        version: event.version,
      },
    });
  }

  @OnEvent('subscription.renewed')
  async handleSubscriptionRenewed(
    event: ProjectedEvent<SubscriptionRenewedEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting SubscriptionRenewedEvent for ${event.aggregateId}`,
    );

    const data = event.data;

    await this.prisma.subscriptionReadModel.update({
      where: { id: data.subscriptionId },
      data: {
        currentPeriodStart: new Date(data.newPeriodStart),
        currentPeriodEnd: new Date(data.newPeriodEnd),
        usageData: {}, // Reset usage for new period
        version: event.version,
      },
    });
  }

  @OnEvent('subscription.past_due')
  async handleSubscriptionPastDue(
    event: ProjectedEvent<SubscriptionPastDueEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting SubscriptionPastDueEvent for ${event.aggregateId}`,
    );

    await this.prisma.subscriptionReadModel.update({
      where: { id: event.data.subscriptionId },
      data: {
        status: SubscriptionStatus.PAST_DUE,
        version: event.version,
      },
    });
  }

  @OnEvent('subscription.expired')
  async handleSubscriptionExpired(
    event: ProjectedEvent<SubscriptionExpiredEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting SubscriptionExpiredEvent for ${event.aggregateId}`,
    );

    await this.prisma.subscriptionReadModel.update({
      where: { id: event.data.subscriptionId },
      data: {
        status: SubscriptionStatus.EXPIRED,
        version: event.version,
      },
    });
  }
}
