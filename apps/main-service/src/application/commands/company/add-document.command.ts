import { Inject, NotFoundException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, Result, Success, Failure } from '@flexobo/core';
import { CompanyDocumentType } from '../../../domain/events/company.events';
import {
  ICompanyAggregateStore,
  COMPANY_AGGREGATE_STORE,
} from '../../../ports/company.repository';

export class AddCompanyDocumentCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly userId: string,
    public readonly type: CompanyDocumentType,
    public readonly url: string
  ) {}
}

@CommandHandler(AddCompanyDocumentCommand)
export class AddCompanyDocumentHandler implements ICommandHandler<AddCompanyDocumentCommand, string> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: AddCompanyDocumentCommand): Promise<Result<string, Error>> {
    try {
      const company = await this.companyStore.load(command.companyId);

      if (!company) {
        return new Failure(new NotFoundException('Company not found'));
      }

      const documentId = company.addDocument(
        command.type,
        command.url,
        command.userId
      );

      await this.companyStore.save(company);

      return new Success(documentId);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
