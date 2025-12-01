import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';

import { User } from '../../domain/user.aggregate';
import { IUserAggregateStore } from '../../ports/user-store.port';
import { AuthPlatform, UserRole, UserStatus, UserType } from '../../ports';

interface UserSnapshotData {
  id: string;
  uniqueId?: string;
  email?: string;
  phoneNumber?: string;
  telegramId?: string;
  passwordHash?: string;
  fio?: string;
  avatar?: string;
  role?: UserRole;
  userType?: UserType;
  status?: UserStatus;
  language?: string;
  isPrivacyPolicyAccepted?: boolean;
  isSubscribedNewsletter?: boolean;
  platform?: AuthPlatform | null;
  isVerified?: boolean;
  lastLoginAt?: Date | null;
  isLoggedIn?: boolean;
}

@Injectable()
export class UserAggregateStore
  extends AggregateStore<User, UserSnapshotData>
  implements IUserAggregateStore
{
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'User';
  }

  protected getAggregateRestorer(): AggregateRestorer<User, UserSnapshotData> {
    return {
      fromSnapshot(
        snapshotData: UserSnapshotData,
        snapshotVersion: number,
        subsequentEvents: DomainEvent[]
      ): User {
        return User.fromSnapshot(
          snapshotData,
          snapshotVersion,
          subsequentEvents
        );
      },

      fromEvents(events: DomainEvent[]): User {
        return User.fromEvents(events);
      },
    };
  }
}
