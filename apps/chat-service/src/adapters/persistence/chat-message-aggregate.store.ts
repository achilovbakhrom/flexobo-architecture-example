import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';

import { ChatMessage, ChatMessageSnapshotData } from '../../domain/aggregates/chat-message.aggregate';
import { IChatMessageAggregateStore } from '../../ports/chat-message.port';

@Injectable()
export class ChatMessageAggregateStore
  extends AggregateStore<ChatMessage, ChatMessageSnapshotData>
  implements IChatMessageAggregateStore
{
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'ChatMessage';
  }

  protected getAggregateRestorer(): AggregateRestorer<ChatMessage, ChatMessageSnapshotData> {
    return {
      fromSnapshot(
        snapshotData: ChatMessageSnapshotData,
        snapshotVersion: number,
        subsequentEvents: DomainEvent[]
      ): ChatMessage {
        return ChatMessage.fromSnapshot(snapshotData, snapshotVersion, subsequentEvents);
      },

      fromEvents(events: DomainEvent[]): ChatMessage {
        return ChatMessage.fromEvents(events);
      },
    };
  }
}
