import {
  QueryHandler,
  IQueryHandler,
  Result,
  Success,
  Failure,
} from '@flexobo/core';
import { Inject } from '@nestjs/common';

import {
  GetTransportTypeByIdQuery,
  GetAllTransportTypesQuery,
  GetActiveTransportTypesQuery,
  SearchTransportTypesQuery,
} from './transport-type.queries';
import {
  ITransportTypeReadModelRepository,
  TRANSPORT_TYPE_READ_MODEL_REPOSITORY,
  TransportTypeReadModelDto,
} from '../../ports/transport-type-read-model.port';

@QueryHandler(GetTransportTypeByIdQuery)
export class GetTransportTypeByIdHandler
  implements
    IQueryHandler<
      GetTransportTypeByIdQuery,
      Result<TransportTypeReadModelDto | null, Error>
    >
{
  constructor(
    @Inject(TRANSPORT_TYPE_READ_MODEL_REPOSITORY)
    private readonly repository: ITransportTypeReadModelRepository
  ) {}

  async execute(
    query: GetTransportTypeByIdQuery
  ): Promise<Result<TransportTypeReadModelDto | null, Error>> {
    try {
      const transportType = await this.repository.findById(
        query.transportTypeId,
        query.language
      );
      return new Success(transportType);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@QueryHandler(GetAllTransportTypesQuery)
export class GetAllTransportTypesHandler
  implements
    IQueryHandler<
      GetAllTransportTypesQuery,
      Result<TransportTypeReadModelDto[], Error>
    >
{
  constructor(
    @Inject(TRANSPORT_TYPE_READ_MODEL_REPOSITORY)
    private readonly repository: ITransportTypeReadModelRepository
  ) {}

  async execute(
    query: GetAllTransportTypesQuery
  ): Promise<Result<TransportTypeReadModelDto[], Error>> {
    try {
      const transportTypes = await this.repository.findAll(
        query.language,
        query.options
      );
      return new Success(transportTypes);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@QueryHandler(GetActiveTransportTypesQuery)
export class GetActiveTransportTypesHandler
  implements
    IQueryHandler<
      GetActiveTransportTypesQuery,
      Result<TransportTypeReadModelDto[], Error>
    >
{
  constructor(
    @Inject(TRANSPORT_TYPE_READ_MODEL_REPOSITORY)
    private readonly repository: ITransportTypeReadModelRepository
  ) {}

  async execute(
    query: GetActiveTransportTypesQuery
  ): Promise<Result<TransportTypeReadModelDto[], Error>> {
    try {
      const transportTypes = await this.repository.findActive(
        query.language,
        query.options
      );
      return new Success(transportTypes);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@QueryHandler(SearchTransportTypesQuery)
export class SearchTransportTypesHandler
  implements
    IQueryHandler<
      SearchTransportTypesQuery,
      Result<TransportTypeReadModelDto[], Error>
    >
{
  constructor(
    @Inject(TRANSPORT_TYPE_READ_MODEL_REPOSITORY)
    private readonly repository: ITransportTypeReadModelRepository
  ) {}

  async execute(
    query: SearchTransportTypesQuery
  ): Promise<Result<TransportTypeReadModelDto[], Error>> {
    try {
      const transportTypes = await this.repository.search(
        query.searchTerm,
        query.language,
        query.options
      );
      return new Success(transportTypes);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
