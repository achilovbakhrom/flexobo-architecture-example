import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  LANGUAGE_REPOSITORY,
  ILanguageRepository,
  LanguageDto,
  LanguageFilters,
} from '../../../ports/language.repository';

export class ListLanguagesQuery implements IQuery {
  constructor(
    public readonly filters?: LanguageFilters,
    public readonly page = 1,
    public readonly limit = 10
  ) {}
}

export interface LanguagePagination {
  total_records: number;
  current_page: number;
  total_pages: number;
  next_page: number | null;
  prev_page: number | null;
}

export interface ListLanguagesResult {
  items: LanguageDto[];
  pagination: LanguagePagination;
}

@QueryHandler(ListLanguagesQuery)
export class ListLanguagesHandler
  implements IQueryHandler<ListLanguagesQuery, ListLanguagesResult>
{
  constructor(
    @Inject(LANGUAGE_REPOSITORY)
    private readonly languageRepository: ILanguageRepository
  ) {}

  async execute(query: ListLanguagesQuery): Promise<ListLanguagesResult> {
    const page = Math.max(query.page, 1);
    const limit = Math.max(query.limit, 1);
    const offset = (page - 1) * limit;

    const { items, total } = await this.languageRepository.findAll({
      ...query.filters,
      offset,
      limit,
    });

    const totalPages = Math.ceil(total / limit) || 1;
    const nextPage = page < totalPages ? page + 1 : null;
    const prevPage = page > 1 ? page - 1 : null;

    return {
      items,
      pagination: {
        total_records: total,
        current_page: page,
        total_pages: totalPages,
        next_page: nextPage,
        prev_page: prevPage,
      },
    };
  }
}
