import { Inject, NotFoundException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, Result, Success, Failure } from '@flexobo/core';
import {
  ICompanyAggregateStore,
  COMPANY_AGGREGATE_STORE,
} from '../../../ports/company.repository';

export class RemoveCompanyDocumentCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly userId: string,
    public readonly documentId: string
  ) {}
}

@CommandHandler(RemoveCompanyDocumentCommand)
export class RemoveCompanyDocumentHandler implements ICommandHandler<RemoveCompanyDocumentCommand, void> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: RemoveCompanyDocumentCommand): Promise<Result<void, Error>> {
    try {
      const company = await this.companyStore.load(command.companyId);

      if (!company) {
        return new Failure(new NotFoundException('Company not found'));
      }

      company.removeDocument(command.documentId, command.userId);

      await this.companyStore.save(company);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
