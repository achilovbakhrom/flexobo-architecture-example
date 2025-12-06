import { Inject, NotFoundException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, Result, Success, Failure } from '@flexobo/core';
import { CompanyMemberRole } from '../../../domain/events/company.events';
import {
  ICompanyAggregateStore,
  COMPANY_AGGREGATE_STORE,
} from '../../../ports/company.repository';

export class AddCompanyMemberCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly addedBy: string,
    public readonly userId: string,
    public readonly role: CompanyMemberRole
  ) {}
}

@CommandHandler(AddCompanyMemberCommand)
export class AddCompanyMemberHandler implements ICommandHandler<AddCompanyMemberCommand, void> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: AddCompanyMemberCommand): Promise<Result<void, Error>> {
    try {
      const company = await this.companyStore.load(command.companyId);

      if (!company) {
        return new Failure(new NotFoundException('Company not found'));
      }

      company.addMember(command.userId, command.role, command.addedBy);

      await this.companyStore.save(company);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
