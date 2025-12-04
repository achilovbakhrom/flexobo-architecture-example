import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  IncomingMessage,
  CommandBus,
} from '@flexobo/core';
import {
  ChatFileUploadedPayload,
  BidCreatedPayload,
  BidUpdatedPayload,
  BidCancelledPayload,
  BidAction,
} from '@flexobo/shared-kernel';
import {
  IChatRoomRepository,
  CHAT_ROOM_REPOSITORY,
  IRealtimeService,
  REALTIME_SERVICE,
  MessageType,
  SenderType,
  ChatEvents,
  ChatRoomStatus,
} from '../../../ports';
import { SendMessageCommand } from '../../../application/commands';
import { SendMessageResult } from '../../../application/commands/message.handlers';
import { ROUTING_KEYS, EVENT_TYPES, QUEUES } from '../../../domain/events/event.constants';

/**
 * External Events Projection
 *
 * Handles events from external services:
 * - File Service: chat.file.uploaded -> Creates a file message in chat
 * - Main Service (future): bid.* events -> Creates status messages and emits WebSocket events
 */
@Injectable()
export class ExternalEventsProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExternalEventsProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer,
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository,
    @Inject(REALTIME_SERVICE)
    private readonly realtimeService: IRealtimeService,
    private readonly commandBus: CommandBus
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.EXTERNAL_EVENTS.PROJECTION);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      this.logger.warn(
        'RabbitMQ is not connected. Skipping external events subscription.'
      );
      return;
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.EXTERNAL_EVENTS.PROJECTION,
      [
        // File Service events
        ROUTING_KEYS.FILE.CHAT_FILE_UPLOADED,
        // Bid events (from future Main Service)
        ROUTING_KEYS.BID.CREATED,
        ROUTING_KEYS.BID.UPDATED,
        ROUTING_KEYS.BID.CANCELLED,
        ROUTING_KEYS.BID.EXPIRED,
      ],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      {
        durable: true,
        maxRetries: 3,
      }
    );

    this.isSubscribed = true;
    this.logger.log(
      `Subscribed to queue: ${QUEUES.EXTERNAL_EVENTS.PROJECTION}`
    );
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as {
      type: string;
      data: unknown;
      aggregateId?: string;
    };

    this.logger.debug(`[External Event] Received: ${payload.type}`);

    try {
      switch (payload.type) {
        case EVENT_TYPES.FILE.CHAT_FILE_UPLOADED:
          await this.onChatFileUploaded(payload.data as ChatFileUploadedPayload);
          break;

        case EVENT_TYPES.BID.CREATED:
          await this.onBidCreated(payload.data as BidCreatedPayload);
          break;

        case EVENT_TYPES.BID.UPDATED:
          await this.onBidUpdated(payload.data as BidUpdatedPayload);
          break;

        case EVENT_TYPES.BID.CANCELLED:
          await this.onBidCancelled(payload.data as BidCancelledPayload);
          break;

        case EVENT_TYPES.BID.EXPIRED:
          await this.onBidExpired(payload.data as { bidId: string; chatRoomId: string });
          break;

        default:
          this.logger.warn(`Unknown external event type: ${payload.type}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error handling external event ${payload.type}: ${errorMessage}`);
      throw error; // Re-throw to trigger retry
    }
  }

  // ============================================================
  // File Service Event Handlers
  // ============================================================

  /**
   * Handle file uploaded event from File Service.
   * Creates a file message in the chat room.
   */
  private async onChatFileUploaded(data: ChatFileUploadedPayload): Promise<void> {
    this.logger.log(
      `Processing chat file upload: fileId=${data.fileId}, chatId=${data.chatId}`
    );

    // Verify the room exists and user is a participant
    const room = await this.roomRepository.findById(data.chatId);
    if (!room) {
      // Room not found - this could be a timing issue, throw to retry
      this.logger.error(`Room not found for file upload: ${data.chatId}`);
      throw new Error(`Room not found: ${data.chatId}`);
    }

    if (!room.participants.includes(data.userId)) {
      // User not a participant - this is a validation error, log and skip
      this.logger.error(
        `User ${data.userId} is not a participant of room ${data.chatId}. Skipping file message.`
      );
      return;
    }

    // Determine message type based on MIME type
    const messageType = this.getMessageTypeFromMime(data.mimeType);

    // Create the file message via command
    const command = new SendMessageCommand(
      data.chatId,
      data.userId,
      SenderType.User,
      undefined, // content (files don't need text content)
      messageType,
      [data.url], // fileUrls
      data.originalName || data.fileName, // fileName
      {
        fileId: data.fileId,
        mimeType: data.mimeType,
        size: data.size,
      },
      undefined, // voiceDuration
      undefined // replyToId
    );

    const result = await this.commandBus.execute<SendMessageResult>(command);

    if (result.isFailure) {
      this.logger.error(
        `Failed to create file message: ${result.error?.message}`
      );
      throw new Error(`Failed to create file message: ${result.error?.message}`);
    }

    this.logger.log(
      `File message created: ${result.value.message.id} in room ${data.chatId}`
    );

    // Emit WebSocket event to notify room participants about the new file message
    this.realtimeService.notifyRoom(data.chatId, ChatEvents.ReceiveMessage, {
      message: result.value.message,
      roomId: data.chatId,
    });

    // Emit unread count updates for participants
    for (const [participantId, count] of Object.entries(result.value.unreadCounts)) {
      if (participantId !== data.userId) {
        this.realtimeService.notifyUser(participantId, ChatEvents.UnreadCountUpdated, {
          roomId: data.chatId,
          unreadCount: count,
        });
      }
    }
  }

  // ============================================================
  // Bid Event Handlers (from Main Service)
  // ============================================================

  /**
   * Handle bid created event.
   * Notifies participants via WebSocket that a bid was created.
   */
  private async onBidCreated(data: BidCreatedPayload): Promise<void> {
    this.logger.log(
      `Processing bid created: bidId=${data.bidId}, roomId=${data.chatRoomId}`
    );

    const room = await this.roomRepository.findById(data.chatRoomId);
    if (!room) {
      this.logger.warn(`Room not found for bid created: ${data.chatRoomId}`);
      return;
    }

    // Create initial status message (price bid)
    const priceContent = `#price${data.price},${data.currency}`;

    const command = new SendMessageCommand(
      data.chatRoomId,
      data.bidderId, // The bidder sends the initial offer
      SenderType.User,
      priceContent,
      MessageType.Status,
      undefined,
      undefined,
      {
        bidId: data.bidId,
        action: 'created',
        price: data.price,
        currency: data.currency,
      },
      undefined,
      undefined
    );

    await this.commandBus.execute(command);

    // Emit WebSocket event to room participants
    this.realtimeService.notifyRoom(data.chatRoomId, ChatEvents.BidCreated, {
      bidId: data.bidId,
      chatRoomId: data.chatRoomId,
      bidderId: data.bidderId,
      ownerId: data.ownerId,
      price: data.price,
      currency: data.currency,
      postType: data.postType,
    });

    this.logger.log(`Bid created notification sent to room ${data.chatRoomId}`);
  }

  /**
   * Handle bid updated event (counter offer, accept, reject).
   * Creates status message and notifies participants.
   */
  private async onBidUpdated(data: BidUpdatedPayload): Promise<void> {
    this.logger.log(
      `Processing bid updated: bidId=${data.bidId}, action=${data.action}`
    );

    const room = await this.roomRepository.findById(data.chatRoomId);
    if (!room) {
      this.logger.warn(`Room not found for bid update: ${data.chatRoomId}`);
      return;
    }

    // Create status message based on action
    const statusContent = this.getBidStatusContent(data.action, data.price, data.currency);

    const command = new SendMessageCommand(
      data.chatRoomId,
      data.userId,
      SenderType.User,
      statusContent,
      MessageType.Status,
      undefined,
      undefined,
      {
        bidId: data.bidId,
        action: data.action,
        price: data.price,
        currency: data.currency,
        previousPrice: data.previousPrice,
      },
      undefined,
      undefined
    );

    await this.commandBus.execute(command);

    // Emit WebSocket event to room participants
    this.realtimeService.notifyRoom(data.chatRoomId, ChatEvents.BidUpdated, {
      bidId: data.bidId,
      chatRoomId: data.chatRoomId,
      action: data.action,
      price: data.price,
      currency: data.currency,
      userId: data.userId,
    });

    this.logger.log(
      `Bid updated notification sent to room ${data.chatRoomId}`
    );
  }

  /**
   * Handle bid cancelled event.
   * Creates status message and archives the room.
   */
  private async onBidCancelled(data: BidCancelledPayload): Promise<void> {
    this.logger.log(
      `Processing bid cancelled: bidId=${data.bidId}, roomId=${data.chatRoomId}`
    );

    const room = await this.roomRepository.findById(data.chatRoomId);
    if (!room) {
      this.logger.warn(`Room not found for bid cancelled: ${data.chatRoomId}`);
      return;
    }

    // Create status message for cancellation
    const statusContent = data.reason
      ? `Bid cancelled: ${data.reason}`
      : 'Bid cancelled';

    const command = new SendMessageCommand(
      data.chatRoomId,
      data.cancelledBy,
      SenderType.User,
      statusContent,
      MessageType.Status,
      undefined,
      undefined,
      {
        bidId: data.bidId,
        action: 'cancelled',
        reason: data.reason,
      },
      undefined,
      undefined
    );

    await this.commandBus.execute(command);

    // Archive the room
    await this.roomRepository.update(data.chatRoomId, {
      status: ChatRoomStatus.Archived,
    });

    // Emit WebSocket event to room participants
    this.realtimeService.notifyRoom(data.chatRoomId, ChatEvents.BidCancelled, {
      bidId: data.bidId,
      chatRoomId: data.chatRoomId,
      cancelledBy: data.cancelledBy,
      reason: data.reason,
    });

    this.logger.log(
      `Bid cancelled notification sent to room ${data.chatRoomId}`
    );
  }

  /**
   * Handle bid expired event.
   */
  private async onBidExpired(data: { bidId: string; chatRoomId: string }): Promise<void> {
    this.logger.log(
      `Processing bid expired: bidId=${data.bidId}, roomId=${data.chatRoomId}`
    );

    const room = await this.roomRepository.findById(data.chatRoomId);
    if (!room) {
      this.logger.warn(`Room not found for bid expired: ${data.chatRoomId}`);
      return;
    }

    // Create status message for expiration
    const command = new SendMessageCommand(
      data.chatRoomId,
      'SYSTEM',
      SenderType.Admin,
      'Bid has expired',
      MessageType.Status,
      undefined,
      undefined,
      {
        bidId: data.bidId,
        action: 'expired',
      },
      undefined,
      undefined
    );

    await this.commandBus.execute(command);

    // Archive the room
    await this.roomRepository.update(data.chatRoomId, {
      status: ChatRoomStatus.Archived,
    });

    this.logger.log(`Bid expired notification sent to room ${data.chatRoomId}`);
  }

  // ============================================================
  // Private Helpers
  // ============================================================

  /**
   * Determine MessageType from MIME type.
   */
  private getMessageTypeFromMime(mimeType: string): MessageType {
    if (mimeType.startsWith('image/')) {
      return mimeType === 'image/gif' ? MessageType.Gif : MessageType.Image;
    }
    if (mimeType.startsWith('video/')) {
      return MessageType.Video;
    }
    if (mimeType.startsWith('audio/')) {
      return MessageType.Audio;
    }
    return MessageType.File;
  }

  /**
   * Generate status content for bid updates.
   */
  private getBidStatusContent(
    action: BidAction | string,
    price?: number,
    currency?: string
  ): string {
    switch (action) {
      case BidAction.ACCEPT:
      case 'accept':
        return 'accept';

      case BidAction.REJECT:
      case 'reject':
        return 'reject';

      case BidAction.COUNTER:
      case 'counter':
        if (price !== undefined && currency) {
          return `#price${price},${currency}`;
        }
        return 'Counter offer';

      default:
        return `Bid ${action}`;
    }
  }
}
