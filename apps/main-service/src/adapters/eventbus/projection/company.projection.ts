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
  CompanyDocumentAddedEventData,
  CompanyDocumentRemovedEventData,
  CompanyRatingUpdatedEventData,
  CompanyStatusHistoryItem,
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
  | CompanyDocumentAddedEventData
  | CompanyDocumentRemovedEventData
  | CompanyRatingUpdatedEventData
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
      case COMPANY_EVENT_TYPES.DOCUMENT_ADDED:
        await this.onDocumentAdded(
          event as EventPayload<CompanyDocumentAddedEventData>
        );
        break;
      case COMPANY_EVENT_TYPES.DOCUMENT_REMOVED:
        await this.onDocumentRemoved(
          event as EventPayload<CompanyDocumentRemovedEventData>
        );
        break;
      case COMPANY_EVENT_TYPES.RATING_UPDATED:
        await this.onRatingUpdated(
          event as EventPayload<CompanyRatingUpdatedEventData>
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

  private generateCompanyUniqueId(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const random = Math.random().toString(36).substring(2, 8);
    return `${slug}-${random}`;
  }

  private async onCompanyCreated(
    event: EventPayload<CompanyCreatedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkCreateIdempotency(existing, event);

    const { data } = event;
    const initialStatusHistory: CompanyStatusHistoryItem[] = [
      {
        status: 'ACTIVE',
        changedAt: event.occurredAt,
      },
    ];

    await this.companyRepo.save({
      id: event.aggregateId,
      ownerId: data.ownerId,
      companyUniqueId: this.generateCompanyUniqueId(data.companyName || 'company'),
      companyName: data.companyName || '',
      companyTypeId: data.companyTypeId,
      companyDescription: data.companyDescription,
      avatar: data.avatar,
      phoneNumber: data.phoneNumber,
      email: data.email,
      countryId: data.countryId,
      city: data.city,
      dotMc: data.dotMc,
      status: 'ACTIVE',
      statusHistory: initialStatusHistory,
      verifyStatus: 'PENDING',
      isLegalEntity: data.isLegalEntity ?? true,
      rating: 0,
      countRatings: 0,
      documents: data.documents || [],
      members: [],
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
    event: EventPayload<CompanyUpdatedEventData & { resetVerification?: boolean }>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    let statusHistory = existing!.statusHistory || [];
    let verifyStatus = existing!.verifyStatus;

    // Handle status change
    if (data.status !== undefined && data.status !== existing!.status) {
      statusHistory = [
        ...statusHistory,
        {
          status: data.status,
          reason: data.statusReason,
          changedAt: event.occurredAt,
        },
      ];
    }

    // Reset verification if key fields changed
    if (data.resetVerification) {
      verifyStatus = 'PENDING';
    }

    await this.companyRepo.save({
      ...existing!,
      ...(data.companyName !== undefined && { companyName: data.companyName }),
      ...(data.companyTypeId !== undefined && { companyTypeId: data.companyTypeId }),
      ...(data.companyDescription !== undefined && { companyDescription: data.companyDescription }),
      ...(data.avatar !== undefined && { avatar: data.avatar }),
      ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.countryId !== undefined && { countryId: data.countryId }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.dotMc !== undefined && { dotMc: data.dotMc }),
      ...(data.isLegalEntity !== undefined && { isLegalEntity: data.isLegalEntity }),
      ...(data.status !== undefined && { status: data.status }),
      statusHistory,
      verifyStatus,
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
      verifyStatus: 'VERIFIED',
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
      verifyStatus: 'REJECTED',
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onCompanySuspended(
    event: EventPayload<CompanySuspendedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    const statusHistory = [
      ...(existing!.statusHistory || []),
      {
        status: 'BLOCKED' as const,
        reason: data.reason,
        changedAt: event.occurredAt,
        changedBy: data.suspendedBy,
      },
    ];

    await this.companyRepo.save({
      ...existing!,
      status: 'BLOCKED',
      statusHistory,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onCompanyReactivated(
    event: EventPayload<CompanyReactivatedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    const statusHistory = [
      ...(existing!.statusHistory || []),
      {
        status: 'ACTIVE' as const,
        changedAt: event.occurredAt,
        changedBy: data.reactivatedBy,
      },
    ];

    await this.companyRepo.save({
      ...existing!,
      status: 'ACTIVE',
      statusHistory,
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

  private async onDocumentAdded(
    event: EventPayload<CompanyDocumentAddedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    const documents = [
      ...(existing!.documents || []),
      {
        id: data.documentId,
        type: data.type,
        url: data.url,
        addedAt: event.occurredAt,
      },
    ];

    await this.companyRepo.save({
      ...existing!,
      documents,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onDocumentRemoved(
    event: EventPayload<CompanyDocumentRemovedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    const documents = (existing!.documents || []).filter(
      (doc) => doc.id !== data.documentId
    );

    await this.companyRepo.save({
      ...existing!,
      documents,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onRatingUpdated(
    event: EventPayload<CompanyRatingUpdatedEventData>
  ): Promise<void> {
    const existing = await this.companyRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    await this.companyRepo.save({
      ...existing!,
      rating: data.rating,
      countRatings: data.countRatings,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onCompanyDeleted(event: CompanyEventPayload): Promise<void> {
    await this.companyRepo.delete(event.aggregateId);
  }
}
