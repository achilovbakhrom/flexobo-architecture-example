import { Injectable } from '@nestjs/common';
import { GenericAggregateStore, EventSourcedAggregate } from '@flexobo/core';

import { User, UserSnapshotData } from '../../domain/user.aggregate';
import { IUserAggregateStore } from '../../ports/user-store.port';

@Injectable()
export class UserAggregateStore
  extends GenericAggregateStore<User, UserSnapshotData>
  implements IUserAggregateStore
{
  protected readonly aggregateType = 'User';
  protected readonly aggregateClass: EventSourcedAggregate<User, UserSnapshotData> = User;
}
