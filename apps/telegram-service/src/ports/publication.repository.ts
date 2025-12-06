export const PUBLICATION_REPOSITORY = Symbol('PUBLICATION_REPOSITORY');

export interface PublicationReadDto {
  id: string;
  channelId: string;
  messageId: string | null;
  contentType: string;
  contentId: string;
  status: string;
  errorMessage: string | null;
  publishedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPublicationRepository {
  findById(id: string): Promise<PublicationReadDto | null>;
  findByContent(contentType: string, contentId: string): Promise<PublicationReadDto | null>;
  findByChannel(channelId: string, limit?: number): Promise<PublicationReadDto[]>;
  create(data: {
    id: string;
    channelId: string;
    contentType: string;
    contentId: string;
  }): Promise<void>;
  updatePublished(id: string, messageId: string): Promise<void>;
  updateFailed(id: string, errorMessage: string): Promise<void>;
  updateDeleted(id: string): Promise<void>;
}
