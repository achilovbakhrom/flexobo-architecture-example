import { ICommand } from '@flexobo/core';
import { MessageType, SenderType } from '../../domain/aggregates/chat-message.aggregate';

export class CreateChatRoomCommand implements ICommand {
  constructor(
    public readonly participants: string[],
    public readonly createdBy: string,
    public readonly isGroup?: boolean,
    public readonly groupName?: string,
    public readonly isSupportChat?: boolean,
    public readonly identifierId?: string,
    public readonly identifierType?: string
  ) {}
}

export class AddParticipantCommand implements ICommand {
  constructor(
    public readonly roomId: string,
    public readonly userId: string,
    public readonly addedBy: string
  ) {}
}

export class RemoveParticipantCommand implements ICommand {
  constructor(
    public readonly roomId: string,
    public readonly userId: string,
    public readonly removedBy: string
  ) {}
}

export class ArchiveRoomCommand implements ICommand {
  constructor(
    public readonly roomId: string,
    public readonly userId: string
  ) {}
}

export class DeleteRoomCommand implements ICommand {
  constructor(
    public readonly roomId: string,
    public readonly userId: string
  ) {}
}

export class UpdateTranslationSettingsCommand implements ICommand {
  constructor(
    public readonly roomId: string,
    public readonly userId: string,
    public readonly enabled: boolean,
    public readonly targetLanguage: string
  ) {}
}

export class MarkRoomAsReadCommand implements ICommand {
  constructor(
    public readonly roomId: string,
    public readonly userId: string
  ) {}
}

export class SendMessageCommand implements ICommand {
  constructor(
    public readonly roomId: string,
    public readonly senderId: string,
    public readonly senderType: SenderType,
    public readonly content?: string,
    public readonly type?: MessageType,
    public readonly fileUrls?: string[],
    public readonly fileName?: string,
    public readonly fileMetadata?: Record<string, unknown>,
    public readonly voiceDuration?: number,
    public readonly replyToId?: string
  ) {}
}

export class EditMessageCommand implements ICommand {
  constructor(
    public readonly messageId: string,
    public readonly userId: string,
    public readonly content: string
  ) {}
}

export class DeleteMessageCommand implements ICommand {
  constructor(
    public readonly messageId: string,
    public readonly userId: string
  ) {}
}

export class MarkMessageAsReadCommand implements ICommand {
  constructor(
    public readonly messageId: string,
    public readonly userId: string
  ) {}
}

export class AddTranslationCommand implements ICommand {
  constructor(
    public readonly messageId: string,
    public readonly language: string,
    public readonly translatedContent: string
  ) {}
}
