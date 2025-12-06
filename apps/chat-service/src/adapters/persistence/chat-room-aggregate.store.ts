import { Injectable } from '@nestjs/common';
import { GenericAggregateStore, EventSourcedAggregate } from '@flexobo/core';

import { ChatRoom, ChatRoomSnapshotData } from '../../domain/aggregates/chat-room.aggregate';
import { IChatRoomAggregateStore } from '../../ports/chat-room.port';

@Injectable()
export class ChatRoomAggregateStore
  extends GenericAggregateStore<ChatRoom, ChatRoomSnapshotData>
  implements IChatRoomAggregateStore
{
  protected readonly aggregateType = 'ChatRoom';
  protected readonly aggregateClass: EventSourcedAggregate<ChatRoom, ChatRoomSnapshotData> = ChatRoom;
}
