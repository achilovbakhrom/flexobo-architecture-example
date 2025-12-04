import { Injectable } from '@nestjs/common';
import { GenericAggregateStore, EventSourcedAggregate } from '@flexobo/core';

import { ChatMessage, ChatMessageSnapshotData } from '../../domain/aggregates/chat-message.aggregate';
import { IChatMessageAggregateStore } from '../../ports/chat-message.port';

@Injectable()
export class ChatMessageAggregateStore
  extends GenericAggregateStore<ChatMessage, ChatMessageSnapshotData>
  implements IChatMessageAggregateStore
{
  protected readonly aggregateType = 'ChatMessage';
  protected readonly aggregateClass: EventSourcedAggregate<ChatMessage, ChatMessageSnapshotData> = ChatMessage;
}
