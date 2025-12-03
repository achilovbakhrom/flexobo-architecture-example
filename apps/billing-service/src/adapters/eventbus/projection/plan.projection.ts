import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma.module';
import {
  PlanCreatedEventData,
  PlanUpdatedEventData,
  PlanActivatedEventData,
  PlanDeactivatedEventData,
} from '../../../domain/events/plan.events';

interface ProjectedEvent<T> {
  aggregateId: string;
  data: T;
  version: number;
  timestamp: Date;
}

@Injectable()
export class PlanProjection implements OnModuleInit {
  private readonly logger = new Logger(PlanProjection.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log('PlanProjection initialized');
  }

  @OnEvent('plan.created')
  async handlePlanCreated(
    event: ProjectedEvent<PlanCreatedEventData>,
  ): Promise<void> {
    this.logger.debug(`Projecting PlanCreatedEvent for ${event.aggregateId}`);

    const data = event.data;

    await this.prisma.planReadModel.create({
      data: {
        id: data.planId,
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        priceMonthly: data.priceMonthly,
        priceYearly: data.priceYearly,
        currency: data.currency,
        limits: JSON.parse(JSON.stringify(data.limits)),
        features: data.features,
        sortOrder: data.sortOrder,
        isPopular: data.isPopular,
        isActive: true,
        trialDays: data.trialDays,
        version: event.version,
      },
    });
  }

  @OnEvent('plan.updated')
  async handlePlanUpdated(
    event: ProjectedEvent<PlanUpdatedEventData>,
  ): Promise<void> {
    this.logger.debug(`Projecting PlanUpdatedEvent for ${event.aggregateId}`);

    const data = event.data;

    const updateData: Record<string, unknown> = {
      version: event.version,
    };

    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priceMonthly !== undefined) updateData.priceMonthly = data.priceMonthly;
    if (data.priceYearly !== undefined) updateData.priceYearly = data.priceYearly;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.limits !== undefined) updateData.limits = JSON.parse(JSON.stringify(data.limits));
    if (data.features !== undefined) updateData.features = data.features;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isPopular !== undefined) updateData.isPopular = data.isPopular;
    if (data.trialDays !== undefined) updateData.trialDays = data.trialDays;

    await this.prisma.planReadModel.update({
      where: { id: data.planId },
      data: updateData,
    });
  }

  @OnEvent('plan.activated')
  async handlePlanActivated(
    event: ProjectedEvent<PlanActivatedEventData>,
  ): Promise<void> {
    this.logger.debug(`Projecting PlanActivatedEvent for ${event.aggregateId}`);

    await this.prisma.planReadModel.update({
      where: { id: event.data.planId },
      data: {
        isActive: true,
        version: event.version,
      },
    });
  }

  @OnEvent('plan.deactivated')
  async handlePlanDeactivated(
    event: ProjectedEvent<PlanDeactivatedEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting PlanDeactivatedEvent for ${event.aggregateId}`,
    );

    await this.prisma.planReadModel.update({
      where: { id: event.data.planId },
      data: {
        isActive: false,
        version: event.version,
      },
    });
  }
}
