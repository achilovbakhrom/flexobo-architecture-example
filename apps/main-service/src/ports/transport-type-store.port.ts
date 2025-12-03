import { DomainEvent } from '@flexobo/core';
import { TransportType } from '../domain/transport-type.aggregate';

export interface ITransportTypeAggregateStore {
  load(transportTypeId: string): Promise<TransportType | null>;

  exists(transportTypeId: string): Promise<boolean>;

  save(transportType: TransportType): Promise<DomainEvent[]>;
}

export const TRANSPORT_TYPE_AGGREGATE_STORE = Symbol(
  'ITransportTypeAggregateStore'
);
