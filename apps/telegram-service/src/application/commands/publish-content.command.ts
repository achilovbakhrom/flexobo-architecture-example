import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler, Result, Success, Failure } from '@flexobo/core';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { TELEGRAM_BOT_SERVICE, ITelegramBotService } from '../../ports/telegram-bot.port';
import { PUBLICATION_REPOSITORY, IPublicationRepository } from '../../ports/publication.repository';

export class PublishContentCommand implements ICommand {
  constructor(
    public readonly contentType: 'LOAD' | 'TRIP',
    public readonly contentId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly details: Record<string, string>,
    public readonly link?: string,
    public readonly channelId?: string
  ) {}
}

export interface PublishContentResult {
  success: boolean;
  publicationId?: string;
  messageId?: string;
  message: string;
}

@Injectable()
@CommandHandler(PublishContentCommand)
export class PublishContentHandler implements ICommandHandler<PublishContentCommand, PublishContentResult> {
  constructor(
    @Inject(TELEGRAM_BOT_SERVICE) private readonly telegramBot: ITelegramBotService,
    @Inject(PUBLICATION_REPOSITORY) private readonly publicationRepository: IPublicationRepository,
    private readonly configService: ConfigService
  ) {}

  async execute(command: PublishContentCommand): Promise<Result<PublishContentResult, Error>> {
    try {
      const channelId = command.channelId || this.configService.get<string>('telegram.channelId');

      if (!channelId) {
        return new Success({
          success: false,
          message: 'No channel configured for publishing',
        });
      }

      // Check if already published
      const existing = await this.publicationRepository.findByContent(
        command.contentType,
        command.contentId
      );

      if (existing && existing.status === 'PUBLISHED') {
        return new Success({
          success: false,
          publicationId: existing.id,
          message: 'Content already published',
        });
      }

      const publicationId = uuidv4();

      // Create publication record
      await this.publicationRepository.create({
        id: publicationId,
        channelId,
        contentType: command.contentType,
        contentId: command.contentId,
      });

      // Publish to Telegram
      const result = await this.telegramBot.publishToChannel({
        channelId,
        type: command.contentType,
        title: command.title,
        description: command.description,
        details: command.details,
        link: command.link,
      });

      if (!result) {
        await this.publicationRepository.updateFailed(publicationId, 'Failed to publish to Telegram');
        return new Success({
          success: false,
          publicationId,
          message: 'Failed to publish to Telegram channel',
        });
      }

      await this.publicationRepository.updatePublished(publicationId, result.messageId);

      return new Success({
        success: true,
        publicationId,
        messageId: result.messageId,
        message: 'Content published successfully',
      });
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
