import { Injectable, Inject } from '@nestjs/common';
import { IPublicationRepository, PublicationReadDto } from '../../ports/publication.repository';

interface PublicationPrismaClient {
  channelPublicationReadModel: {
    findUnique: (args: unknown) => Promise<PublicationReadDto | null>;
    findFirst: (args: unknown) => Promise<PublicationReadDto | null>;
    findMany: (args: unknown) => Promise<PublicationReadDto[]>;
    create: (args: unknown) => Promise<PublicationReadDto>;
    update: (args: unknown) => Promise<PublicationReadDto>;
  };
}

@Injectable()
export class PrismaPublicationRepository implements IPublicationRepository {
  constructor(@Inject('PrismaClient') private readonly prisma: PublicationPrismaClient) {}

  async findById(id: string): Promise<PublicationReadDto | null> {
    return this.prisma.channelPublicationReadModel.findUnique({
      where: { id },
    });
  }

  async findByContent(contentType: string, contentId: string): Promise<PublicationReadDto | null> {
    return this.prisma.channelPublicationReadModel.findFirst({
      where: { contentType, contentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByChannel(channelId: string, limit: number = 50): Promise<PublicationReadDto[]> {
    return this.prisma.channelPublicationReadModel.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async create(data: {
    id: string;
    channelId: string;
    contentType: string;
    contentId: string;
  }): Promise<void> {
    await this.prisma.channelPublicationReadModel.create({
      data: {
        id: data.id,
        channelId: data.channelId,
        contentType: data.contentType,
        contentId: data.contentId,
        status: 'PENDING',
      },
    });
  }

  async updatePublished(id: string, messageId: string): Promise<void> {
    await this.prisma.channelPublicationReadModel.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        messageId,
        publishedAt: new Date(),
      },
    });
  }

  async updateFailed(id: string, errorMessage: string): Promise<void> {
    await this.prisma.channelPublicationReadModel.update({
      where: { id },
      data: {
        status: 'FAILED',
        errorMessage,
      },
    });
  }

  async updateDeleted(id: string): Promise<void> {
    await this.prisma.channelPublicationReadModel.update({
      where: { id },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
      },
    });
  }
}
