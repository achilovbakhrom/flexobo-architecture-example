import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  MESSAGE_PUBLISHER,
  IMessagePublisher,
  IncomingMessage,
  BaseProjection,
  ProjectionConfig,
  EventPayload,
  IEventBuffer,
  EVENT_BUFFER,
  INotificationResolver,
} from '@flexobo/core';
import {
  ICompanyReadRepository,
  COMPANY_READ_REPOSITORY,
  CompanyReadDto,
} from '../../../ports/company.repository';
import {
  COMPANY_EVENT_TYPES,
  CompanyCreatedEventData,
  CompanyUpdatedEventData,
  CompanyVerifiedEventData,
  CompanyRejectedEventData,
  CompanySuspendedEventData,
  CompanyReactivatedEventData,
  CompanyMemberAddedEventData,
  CompanyMemberUpdatedEventData,
  CompanyMemberRemovedEventData,
} from '../../../domain/events/company.events';
import { COMPANY_NOTIFICATION_RESOLVER } from '../notification-resolvers';

type CompanyEventPayload = EventPayload<
  | CompanyCreatedEventData
  | CompanyUpdatedEventData
  | CompanyVerifiedEventData
  | CompanyRejectedEventData
  | CompanySuspendedEventData
  | CompanyReactivatedEventData
  | CompanyMemberAddedEventData
  | CompanyMemberUpdatedEventData
  | CompanyMemberRemovedEventData
  | Record<string, unknown>
>;

@Injectable()
export class CompanyProjection extends BaseProjection<
  CompanyReadDto,
  CompanyEventPayload
> {
  constructor(
    @Inject(COMPANY_READ_REPOSITORY)
    private readonly companyRepo: ICompanyReadRepository,
    @Inject(MESSAGE_CONSUMER)
    rabbitMQConsumer: RabbitMQConsumer,
    @Optional()
    @Inject(EVENT_BUFFER)
    eventBuffer: IEventBuffer | null,
    @Optional()
    @Inject(MESSAGE_PUBLISHER)
    messagePublisher: IMessagePublisher | null,
    @Optional()
    @Inject(COMPANY_NOTIFICATION_RESOLVER)
    notificationResolver: INotificationResolver<CompanyEventPayload> | null
  ) {
    super(rabbitMQConsumer, CompanyProjection.name, eventBuffer, messagePublisher, notificationResolver);
  }

  protected getConfig(): ProjectionConfig {
    return {
      queueName: 'main-service.company.projection',
      routingKeys: ['company.#'],
      durable: true,
      maxRetries: 3,
      prefetchCount: 10,
      lockTtlMs: 5000,
    };
  }

  protected override async getCurrentModelVersion(
    aggregateId: string
  ): Promise<number> {
    const entity = await this.companyRepo.findById(aggregateId);
    return entity?.version ?? 0;
  }

  protected override async applyEvent(
    event: CompanyEventPayload
  ): Promise<void> {
    switch (event.type) {
      case COMPANY_EVENT_TYPES.CREATED:
        await this.onCompanyCreated(
          event as EventPayload<CompanyCreatedEventData>
        );
        break;
      case COMPANY_EVENT_TYPES.UPDATED:
        await this.onCompanyUpdated(
          event as EventPayload<CompanyUpdatedEventData>
        );
        break;
      case COMPANY_EVENT_TYPES.VERIFIED:
        await this.onCompanyVerified(
          event as EventPayload<CompanyVerifiedEventData>
        );
        break;
      case COMPANY_EVENT_TYPES.REJECTED:
        await this.onCompanyRejected(
          event as EventPayload<CompanyRejectedEventData>
        );
        break;
      case COMPANY_EVENT_TYPES.SUSPENDED:
        await this.onCompanySuspended(
          event as EventPayload<CompanySuspendedEventData>
        );
        break;
      case COMPANY_EVENT_TYPES.REACTIVATED:
        await this.onCompanyReactivated(
          event as EventPayload<CompanyReactivatedEventData>
        );
        break;
      case COMPANY_EVENT_TYPES.MEMBER_ADDED:
        await this.onMemberAdded(
          event as EventPayload<CompanyMemberAddedEventData>
        );
        break;
      case COMPANY_EVENT_TYPES.MEMBER_UPDATED:
        await this.onMemberUpdated(
          event as EventPayload<CompanyMemberUpdatedEventData>
        );
        break;
      case COMPANY_EVENT_TYPES.MEMBER_REMOVED:
        await this.onMemberRemoved(
          event as EventPayload<CompanyMemberRemovedEventData>
        );
        break;
      case COMPANY_EVENT_TYPES.DELETED:
        await this.onCompanyDeleted(event);
        break;
      default:
        this.logger.warn(`Unknown company event type: ${event.type}`);
    }
  }

  protected async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as CompanyEventPayload;
    await this.applyEvent(payload);
  }

  private async onCompanyCreated(
    event: EventPayload<CompanyCreatedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkCreateIdempotency(existing, event);

    const { data } = event;
    await this.companyRepo.save({
      id: event.aggregateId,
      ownerId: data.ownerId,
      name: data.name,
      type: data.type,
      status: 'PENDING',
      description: data.description,
      logo: data.logo,
      phone: data.phone,
      email: data.email,
      address: data.address,
      country: data.country,
      city: data.city,
      taxId: data.taxId,
      website: data.website,
      members: [],
      isActive: true,
      version: event.version,
      createdAt: new Date(event.occurredAt),
      updatedAt: new Date(event.occurredAt),
    });

    // Add owner as member
    await this.companyRepo.addMember(event.aggregateId, {
      id: `${event.aggregateId}-owner`,
      userId: data.ownerId,
      role: 'OWNER',
      isActive: true,
      joinedAt: new Date(event.occurredAt),
    });
  }

  private async onCompanyUpdated(
    event: EventPayload<CompanyUpdatedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    await this.companyRepo.save({
      ...existing!,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.logo !== undefined && { logo: data.logo }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.taxId !== undefined && { taxId: data.taxId }),
      ...(data.website !== undefined && { website: data.website }),
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onCompanyVerified(
    event: EventPayload<CompanyVerifiedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    await this.companyRepo.save({
      ...existing!,
      status: 'VERIFIED',
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onCompanyRejected(
    event: EventPayload<CompanyRejectedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    await this.companyRepo.save({
      ...existing!,
      status: 'REJECTED',
      isActive: false,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onCompanySuspended(
    event: EventPayload<CompanySuspendedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    await this.companyRepo.save({
      ...existing!,
      status: 'SUSPENDED',
      isActive: false,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onCompanyReactivated(
    event: EventPayload<CompanyReactivatedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    await this.companyRepo.save({
      ...existing!,
      status: 'VERIFIED',
      isActive: true,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onMemberAdded(
    event: EventPayload<CompanyMemberAddedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    await this.companyRepo.addMember(event.aggregateId, {
      id: data.memberId,
      userId: data.userId,
      role: data.role,
      isActive: true,
      joinedAt: new Date(event.occurredAt),
    });

    // Update version
    await this.companyRepo.save({
      ...existing!,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onMemberUpdated(
    event: EventPayload<CompanyMemberUpdatedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    await this.companyRepo.updateMember(
      event.aggregateId,
      data.memberId,
      data.role
    );

    // Update version
    await this.companyRepo.save({
      ...existing!,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onMemberRemoved(
    event: EventPayload<CompanyMemberRemovedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    await this.companyRepo.removeMember(event.aggregateId, data.memberId);

    // Update version
    await this.companyRepo.save({
      ...existing!,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onCompanyDeleted(event: CompanyEventPayload): Promise<void> {
    await this.companyRepo.delete(event.aggregateId);
  }
}
