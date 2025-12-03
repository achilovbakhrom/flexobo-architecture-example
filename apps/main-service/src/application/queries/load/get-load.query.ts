import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import {
  LOAD_READ_REPOSITORY,
  ILoadReadRepository,
  LoadReadDto,
} from '../../../ports/load.repository';

export class GetLoadQuery implements IQuery {
  constructor(public readonly loadId: string) {}
}

@QueryHandler(GetLoadQuery)
export class GetLoadHandler
  implements IQueryHandler<GetLoadQuery, LoadReadDto>
{
  constructor(
    @Inject(LOAD_READ_REPOSITORY)
    private readonly loadRepository: ILoadReadRepository
  ) {}

  async execute(query: GetLoadQuery): Promise<LoadReadDto> {
    const load = await this.loadRepository.findById(query.loadId);

    if (!load) {
      throw new NotFoundException(`Load with id ${query.loadId} not found`);
    }

    return load;
  }
}
