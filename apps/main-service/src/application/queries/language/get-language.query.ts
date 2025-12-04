import { Inject, NotFoundException } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  LANGUAGE_REPOSITORY,
  ILanguageRepository,
  LanguageDto,
} from '../../../ports/language.repository';

export class GetLanguageQuery implements IQuery {
  constructor(public readonly id: string) {}
}

@QueryHandler(GetLanguageQuery)
export class GetLanguageHandler
  implements IQueryHandler<GetLanguageQuery, LanguageDto>
{
  constructor(
    @Inject(LANGUAGE_REPOSITORY)
    private readonly languageRepository: ILanguageRepository
  ) {}

  async execute(query: GetLanguageQuery): Promise<LanguageDto> {
    const language = await this.languageRepository.findById(query.id);

    if (!language) {
      throw new NotFoundException('Language not found');
    }

    return language;
  }
}
