import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType, SenderType, ChatRoomStatus } from '../../domain/enums/chat.enums';

// Send Message DTOs
export class SendMessageDto {
  @ApiPropertyOptional({ enum: MessageType })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  roomId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  fileUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  voiceDuration?: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  replyToId?: string;
}

export class CreateRoomDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  participants!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSupportChat?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  identifierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  identifierType?: string;
}

export class EditMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class UpdateTranslationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string | null;
}

// WebSocket DTOs
export class JoinRoomDto {
  @IsUUID()
  @IsNotEmpty()
  roomId!: string;
}

export class MarkAsReadDto {
  @IsUUID()
  messageId!: string;
}

export class MarkRoomAsReadDto {
  @IsUUID()
  roomId!: string;
}

// Response DTOs
export class MessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  roomId!: string;

  @ApiProperty()
  senderId!: string;

  @ApiProperty({ enum: SenderType })
  senderType!: SenderType;

  @ApiProperty({ enum: MessageType })
  type!: MessageType;

  @ApiPropertyOptional()
  content?: string;

  @ApiPropertyOptional()
  fileUrls?: string[];

  @ApiPropertyOptional()
  fileName?: string;

  @ApiPropertyOptional()
  voiceDuration?: number;

  @ApiProperty()
  isRead!: boolean;

  @ApiPropertyOptional()
  readAt?: Date;

  @ApiPropertyOptional()
  replyToId?: string;

  @ApiPropertyOptional()
  translations?: Array<{ language: string; text: string }>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ChatRoomResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: [String] })
  participants!: string[];

  @ApiProperty()
  isGroup!: boolean;

  @ApiPropertyOptional()
  groupName?: string;

  @ApiProperty()
  isSupportChat!: boolean;

  @ApiProperty({ enum: ChatRoomStatus })
  status!: ChatRoomStatus;

  @ApiPropertyOptional()
  unreadCounts?: Record<string, number>;

  @ApiPropertyOptional()
  lastMessagePreview?: string;

  @ApiPropertyOptional()
  lastMessageAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginatedResponseDto<T> {
  @ApiProperty()
  data!: T[];

  @ApiProperty()
  pagination!: {
    totalRecords: number;
    currentPage: number;
    totalPages: number;
    nextPage: number | null;
    prevPage: number | null;
  };
}
