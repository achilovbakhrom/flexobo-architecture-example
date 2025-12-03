import { ICommand, ICommandHandler, CommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Load } from '../../../domain/aggregates/load.aggregate';
import { LOAD_AGGREGATE_STORE } from '../../../ports/load.repository';
import { IAggregateStore } from '@flexobo/core';

export class DeleteLoadCommand implements ICommand {
  constructor(
    public readonly loadId: string,
    public readonly userId: string
  ) {}
}

@CommandHandler(DeleteLoadCommand)
export class DeleteLoadHandler implements ICommandHandler<DeleteLoadCommand> {
  constructor(
    @Inject(LOAD_AGGREGATE_STORE)
    private readonly loadStore: IAggregateStore<Load>
  ) {}

  async execute(command: DeleteLoadCommand): Promise<void> {
    const load = await this.loadStore.load(command.loadId);

    if (!load) {
      throw new NotFoundException(`Load with id ${command.loadId} not found`);
    }

    const state = load.getState();
    if (state.ownerId !== command.userId) {
      throw new ForbiddenException('You can only delete your own loads');
    }

    load.delete(command.userId);

    await this.loadStore.save(load);
  }
}
