import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ICompanyAggregateStore,
  COMPANY_AGGREGATE_STORE,
} from '../../../ports/company.repository';

export class DeleteCompanyCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly userId: string
  ) {}
}

@Injectable()
@CommandHandler(DeleteCompanyCommand)
export class DeleteCompanyHandler implements ICommandHandler<DeleteCompanyCommand> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: DeleteCompanyCommand): Promise<void> {
    const company = await this.companyStore.load(command.companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    company.delete(command.userId);

    await this.companyStore.save(company);
  }
}
