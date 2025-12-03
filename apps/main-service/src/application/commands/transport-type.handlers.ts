import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  Failure,
} from '@flexobo/core';
import { Inject, HttpException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import {
  CreateTransportTypeCommand,
  UpdateTransportTypeCommand,
  ActivateTransportTypeCommand,
  DeactivateTransportTypeCommand,
  AddTransportTypeTranslationCommand,
  UpdateTransportTypeTranslationCommand,
  DeleteTransportTypeTranslationCommand,
  DeleteTransportTypeCommand,
} from './transport-type.commands';
import { TransportType } from '../../domain/transport-type.aggregate';
import {
  ITransportTypeAggregateStore,
  TRANSPORT_TYPE_AGGREGATE_STORE,
} from '../../ports/transport-type-store.port';

@CommandHandler(CreateTransportTypeCommand)
export class CreateTransportTypeHandler
  implements ICommandHandler<CreateTransportTypeCommand, string>
{
  constructor(
    @Inject(TRANSPORT_TYPE_AGGREGATE_STORE)
    private readonly store: ITransportTypeAggregateStore
  ) {}

  async execute(
    command: CreateTransportTypeCommand
  ): Promise<Result<string, Error>> {
    try {
      const transportTypeId = uuidv4();

      const transportType = TransportType.create(transportTypeId, command.data);

      await this.store.save(transportType);

      return new Success(transportTypeId);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(UpdateTransportTypeCommand)
export class UpdateTransportTypeHandler
  implements ICommandHandler<UpdateTransportTypeCommand, boolean>
{
  constructor(
    @Inject(TRANSPORT_TYPE_AGGREGATE_STORE)
    private readonly store: ITransportTypeAggregateStore
  ) {}

  async execute(
    command: UpdateTransportTypeCommand
  ): Promise<Result<boolean, Error>> {
    try {
      const transportType = await this.store.load(command.transportTypeId);

      if (!transportType) {
        return new Failure(
          new HttpException(
            {
              statusCode: 404,
              error: 'TRANSPORT_TYPE_NOT_FOUND',
              message: 'Transport type not found',
            },
            404
          )
        );
      }

      transportType.update(command.data);

      await this.store.save(transportType);

      return new Success(true);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(ActivateTransportTypeCommand)
export class ActivateTransportTypeHandler
  implements ICommandHandler<ActivateTransportTypeCommand, boolean>
{
  constructor(
    @Inject(TRANSPORT_TYPE_AGGREGATE_STORE)
    private readonly store: ITransportTypeAggregateStore
  ) {}

  async execute(
    command: ActivateTransportTypeCommand
  ): Promise<Result<boolean, Error>> {
    try {
      const transportType = await this.store.load(command.transportTypeId);

      if (!transportType) {
        return new Failure(
          new HttpException(
            {
              statusCode: 404,
              error: 'TRANSPORT_TYPE_NOT_FOUND',
              message: 'Transport type not found',
            },
            404
          )
        );
      }

      transportType.activate();

      await this.store.save(transportType);

      return new Success(true);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(DeactivateTransportTypeCommand)
export class DeactivateTransportTypeHandler
  implements ICommandHandler<DeactivateTransportTypeCommand, boolean>
{
  constructor(
    @Inject(TRANSPORT_TYPE_AGGREGATE_STORE)
    private readonly store: ITransportTypeAggregateStore
  ) {}

  async execute(
    command: DeactivateTransportTypeCommand
  ): Promise<Result<boolean, Error>> {
    try {
      const transportType = await this.store.load(command.transportTypeId);

      if (!transportType) {
        return new Failure(
          new HttpException(
            {
              statusCode: 404,
              error: 'TRANSPORT_TYPE_NOT_FOUND',
              message: 'Transport type not found',
            },
            404
          )
        );
      }

      transportType.deactivate();

      await this.store.save(transportType);

      return new Success(true);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(AddTransportTypeTranslationCommand)
export class AddTransportTypeTranslationHandler
  implements ICommandHandler<AddTransportTypeTranslationCommand, boolean>
{
  constructor(
    @Inject(TRANSPORT_TYPE_AGGREGATE_STORE)
    private readonly store: ITransportTypeAggregateStore
  ) {}

  async execute(
    command: AddTransportTypeTranslationCommand
  ): Promise<Result<boolean, Error>> {
    try {
      const transportType = await this.store.load(command.transportTypeId);

      if (!transportType) {
        return new Failure(
          new HttpException(
            {
              statusCode: 404,
              error: 'TRANSPORT_TYPE_NOT_FOUND',
              message: 'Transport type not found',
            },
            404
          )
        );
      }

      transportType.addTranslation(command.translation);

      await this.store.save(transportType);

      return new Success(true);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(UpdateTransportTypeTranslationCommand)
export class UpdateTransportTypeTranslationHandler
  implements ICommandHandler<UpdateTransportTypeTranslationCommand, boolean>
{
  constructor(
    @Inject(TRANSPORT_TYPE_AGGREGATE_STORE)
    private readonly store: ITransportTypeAggregateStore
  ) {}

  async execute(
    command: UpdateTransportTypeTranslationCommand
  ): Promise<Result<boolean, Error>> {
    try {
      const transportType = await this.store.load(command.transportTypeId);

      if (!transportType) {
        return new Failure(
          new HttpException(
            {
              statusCode: 404,
              error: 'TRANSPORT_TYPE_NOT_FOUND',
              message: 'Transport type not found',
            },
            404
          )
        );
      }

      transportType.updateTranslation(command.translation.language, {
        name: command.translation.name,
        description: command.translation.description,
      });

      await this.store.save(transportType);

      return new Success(true);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(DeleteTransportTypeTranslationCommand)
export class DeleteTransportTypeTranslationHandler
  implements ICommandHandler<DeleteTransportTypeTranslationCommand, boolean>
{
  constructor(
    @Inject(TRANSPORT_TYPE_AGGREGATE_STORE)
    private readonly store: ITransportTypeAggregateStore
  ) {}

  async execute(
    command: DeleteTransportTypeTranslationCommand
  ): Promise<Result<boolean, Error>> {
    try {
      const transportType = await this.store.load(command.transportTypeId);

      if (!transportType) {
        return new Failure(
          new HttpException(
            {
              statusCode: 404,
              error: 'TRANSPORT_TYPE_NOT_FOUND',
              message: 'Transport type not found',
            },
            404
          )
        );
      }

      transportType.deleteTranslation(command.language);

      await this.store.save(transportType);

      return new Success(true);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(DeleteTransportTypeCommand)
export class DeleteTransportTypeHandler
  implements ICommandHandler<DeleteTransportTypeCommand, boolean>
{
  constructor(
    @Inject(TRANSPORT_TYPE_AGGREGATE_STORE)
    private readonly store: ITransportTypeAggregateStore
  ) {}

  async execute(
    command: DeleteTransportTypeCommand
  ): Promise<Result<boolean, Error>> {
    try {
      const transportType = await this.store.load(command.transportTypeId);

      if (!transportType) {
        return new Failure(
          new HttpException(
            {
              statusCode: 404,
              error: 'TRANSPORT_TYPE_NOT_FOUND',
              message: 'Transport type not found',
            },
            404
          )
        );
      }

      transportType.delete();

      await this.store.save(transportType);

      return new Success(true);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
