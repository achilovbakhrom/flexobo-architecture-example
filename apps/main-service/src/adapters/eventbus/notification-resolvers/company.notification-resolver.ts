import { Injectable } from '@nestjs/common';
import {
  INotificationResolver,
  NotificationIntent,
  NotificationTarget,
  NotificationChannel,
  NotificationType,
  NotificationCategory,
  NotificationSeverity,
  EventPayload,
} from '@flexobo/core';
import {
  COMPANY_EVENT_TYPES,
  CompanyCreatedEventData,
  CompanyVerifiedEventData,
  CompanyRejectedEventData,
  CompanySuspendedEventData,
  CompanyReactivatedEventData,
  CompanyMemberAddedEventData,
  CompanyMemberRemovedEventData,
} from '../../../domain/events/company.events';

type CompanyEventPayload = EventPayload<
  | CompanyCreatedEventData
  | CompanyVerifiedEventData
  | CompanyRejectedEventData
  | CompanySuspendedEventData
  | CompanyReactivatedEventData
  | CompanyMemberAddedEventData
  | CompanyMemberRemovedEventData
  | Record<string, unknown>
>;

export const COMPANY_NOTIFICATION_RESOLVER = Symbol('COMPANY_NOTIFICATION_RESOLVER');

@Injectable()
export class CompanyNotificationResolver
  implements INotificationResolver<CompanyEventPayload>
{
  resolve(event: CompanyEventPayload): NotificationIntent | null {
    switch (event.type) {
      case COMPANY_EVENT_TYPES.CREATED:
        return this.onCompanyCreated(event as EventPayload<CompanyCreatedEventData>);
      case COMPANY_EVENT_TYPES.VERIFIED:
        return this.onCompanyVerified(event as EventPayload<CompanyVerifiedEventData>);
      case COMPANY_EVENT_TYPES.REJECTED:
        return this.onCompanyRejected(event as EventPayload<CompanyRejectedEventData>);
      case COMPANY_EVENT_TYPES.SUSPENDED:
        return this.onCompanySuspended(event as EventPayload<CompanySuspendedEventData>);
      case COMPANY_EVENT_TYPES.REACTIVATED:
        return this.onCompanyReactivated(event as EventPayload<CompanyReactivatedEventData>);
      case COMPANY_EVENT_TYPES.MEMBER_ADDED:
        return this.onMemberAdded(event as EventPayload<CompanyMemberAddedEventData>);
      case COMPANY_EVENT_TYPES.MEMBER_REMOVED:
        return this.onMemberRemoved(event as EventPayload<CompanyMemberRemovedEventData>);
      default:
        return null;
    }
  }

  private onCompanyCreated(
    event: EventPayload<CompanyCreatedEventData>
  ): NotificationIntent {
    const { data } = event;
    return {
      target: NotificationTarget.User,
      userIds: [data.ownerId],
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Success,
        title: 'Company Created',
        body: `Your company "${data.name}" has been created and is pending verification`,
        data: {
          companyId: event.aggregateId,
          name: data.name,
          type: data.type,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onCompanyVerified(
    event: EventPayload<CompanyVerifiedEventData>
  ): NotificationIntent {
    return {
      target: NotificationTarget.User,
      userIds: [],
      channels: [NotificationChannel.Sse, NotificationChannel.Push, NotificationChannel.Email],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Success,
        title: 'Company Verified',
        body: 'Your company has been verified successfully',
        data: {
          companyId: event.aggregateId,
          verifiedAt: event.data.verifiedAt,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onCompanyRejected(
    event: EventPayload<CompanyRejectedEventData>
  ): NotificationIntent {
    const { data } = event;
    return {
      target: NotificationTarget.User,
      userIds: [],
      channels: [NotificationChannel.Sse, NotificationChannel.Push, NotificationChannel.Email],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Error,
        title: 'Company Verification Rejected',
        body: `Your company verification was rejected: ${data.reason}`,
        data: {
          companyId: event.aggregateId,
          reason: data.reason,
          rejectedAt: data.rejectedAt,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onCompanySuspended(
    event: EventPayload<CompanySuspendedEventData>
  ): NotificationIntent {
    const { data } = event;
    return {
      target: NotificationTarget.User,
      userIds: [],
      channels: [NotificationChannel.Sse, NotificationChannel.Push, NotificationChannel.Email],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Error,
        title: 'Company Suspended',
        body: `Your company has been suspended: ${data.reason}`,
        data: {
          companyId: event.aggregateId,
          reason: data.reason,
          suspendedAt: data.suspendedAt,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onCompanyReactivated(
    event: EventPayload<CompanyReactivatedEventData>
  ): NotificationIntent {
    return {
      target: NotificationTarget.User,
      userIds: [],
      channels: [NotificationChannel.Sse, NotificationChannel.Push, NotificationChannel.Email],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Success,
        title: 'Company Reactivated',
        body: 'Your company has been reactivated',
        data: {
          companyId: event.aggregateId,
          reactivatedAt: event.data.reactivatedAt,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onMemberAdded(
    event: EventPayload<CompanyMemberAddedEventData>
  ): NotificationIntent {
    const { data } = event;
    return {
      target: NotificationTarget.User,
      userIds: [data.userId],
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Info,
        title: 'Added to Company',
        body: `You have been added to a company as ${data.role}`,
        data: {
          companyId: event.aggregateId,
          memberId: data.memberId,
          role: data.role,
          addedBy: data.addedBy,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onMemberRemoved(
    event: EventPayload<CompanyMemberRemovedEventData>
  ): NotificationIntent {
    const { data } = event;
    return {
      target: NotificationTarget.User,
      userIds: [data.userId],
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Warning,
        title: 'Removed from Company',
        body: 'You have been removed from a company',
        data: {
          companyId: event.aggregateId,
          memberId: data.memberId,
          removedBy: data.removedBy,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }
}
