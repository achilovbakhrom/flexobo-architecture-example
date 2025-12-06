import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import { PUBLICATION_REPOSITORY, IPublicationRepository, PublicationReadDto } from '../../ports/publication.repository';

export class GetPublicationQuery implements IQuery<PublicationReadDto | null> {
  constructor(
    public readonly contentType: string,
    public readonly contentId: string
  ) {}
}

@Injectable()
@QueryHandler(GetPublicationQuery)
export class GetPublicationHandler implements IQueryHandler<GetPublicationQuery, PublicationReadDto | null> {
  constructor(
    @Inject(PUBLICATION_REPOSITORY) private readonly publicationRepository: IPublicationRepository
  ) {}

  async execute(query: GetPublicationQuery): Promise<PublicationReadDto | null> {
    return this.publicationRepository.findByContent(query.contentType, query.contentId);
  }
}
