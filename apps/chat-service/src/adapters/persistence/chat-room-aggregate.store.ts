import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';

import { ChatRoom, ChatRoomSnapshotData } from '../../domain/aggregates/chat-room.aggregate';
import { IChatRoomAggregateStore } from '../../ports/chat-room.port';

@Injectable()
export class ChatRoomAggregateStore
  extends AggregateStore<ChatRoom, ChatRoomSnapshotData>
  implements IChatRoomAggregateStore
{
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'ChatRoom';
  }

  protected getAggregateRestorer(): AggregateRestorer<ChatRoom, ChatRoomSnapshotData> {
    return {
      fromSnapshot(
        snapshotData: ChatRoomSnapshotData,
        snapshotVersion: number,
        subsequentEvents: DomainEvent[]
      ): ChatRoom {
        return ChatRoom.fromSnapshot(snapshotData, snapshotVersion, subsequentEvents);
      },

      fromEvents(events: DomainEvent[]): ChatRoom {
        return ChatRoom.fromEvents(events);
      },
    };
  }
}
