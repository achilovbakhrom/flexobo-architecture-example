import {
  DeadLetterDto,
  CreateDeadLetterDto,
  DeadLetterQueryDto,
} from '../application/dto/dead-letter.dto';

export interface IDeadLetterRepository {
  create(entry: CreateDeadLetterDto): Promise<DeadLetterDto>;

  findById(id: string): Promise<DeadLetterDto | null>;

  findByRoutingKey(
    routingKey: string,
    options?: { limit?: number; offset?: number }
  ): Promise<DeadLetterDto[]>;

  query(params: DeadLetterQueryDto): Promise<DeadLetterDto[]>;

  count(): Promise<number>;

  deleteById(id: string): Promise<boolean>;

  deleteOlderThan(date: Date): Promise<number>;
}

export const DEAD_LETTER_REPOSITORY = Symbol('IDeadLetterRepository');
