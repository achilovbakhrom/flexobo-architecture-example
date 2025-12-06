import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import { Inject, NotFoundException } from '@nestjs/common';
import {
  TRANSPORT_READ_REPOSITORY,
  ITransportReadRepository,
  TransportReadDto,
} from '../../../ports/transport.repository';

export class GetTransportQuery implements IQuery {
  constructor(public readonly transportId: string) {}
}

@QueryHandler(GetTransportQuery)
export class GetTransportHandler
  implements IQueryHandler<GetTransportQuery, TransportReadDto>
{
  constructor(
    @Inject(TRANSPORT_READ_REPOSITORY)
    private readonly transportRepository: ITransportReadRepository
  ) {}

  async execute(query: GetTransportQuery): Promise<TransportReadDto> {
    const transport = await this.transportRepository.findById(
      query.transportId
    );

    if (!transport) {
      throw new NotFoundException(
        `Transport with id ${query.transportId} not found`
      );
    }

    return transport;
  }
}
