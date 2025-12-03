import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  TRANSPORT_READ_REPOSITORY,
  ITransportReadRepository,
  TransportReadDto,
} from '../../../ports/transport.repository';

export interface ListTransportsFilters {
  transportType?: string;
  isActive?: boolean;
}

export class ListTransportsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly filters?: ListTransportsFilters,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface ListTransportsResult {
  items: TransportReadDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(ListTransportsQuery)
export class ListTransportsHandler
  implements IQueryHandler<ListTransportsQuery, ListTransportsResult>
{
  constructor(
    @Inject(TRANSPORT_READ_REPOSITORY)
    private readonly transportRepository: ITransportReadRepository
  ) {}

  async execute(query: ListTransportsQuery): Promise<ListTransportsResult> {
    const offset = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      this.transportRepository.findByOwner(query.userId, {
        ...query.filters,
        offset,
        limit: query.limit,
      }),
      this.transportRepository.countByOwner(query.userId, query.filters),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
