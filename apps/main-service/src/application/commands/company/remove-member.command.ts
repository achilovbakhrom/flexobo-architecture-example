import { Inject, NotFoundException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, Result, Success, Failure } from '@flexobo/core';
import {
  ICompanyAggregateStore,
  COMPANY_AGGREGATE_STORE,
} from '../../../ports/company.repository';

export class RemoveCompanyMemberCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly removedBy: string,
    public readonly memberId: string
  ) {}
}

@CommandHandler(RemoveCompanyMemberCommand)
export class RemoveCompanyMemberHandler implements ICommandHandler<RemoveCompanyMemberCommand, void> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: RemoveCompanyMemberCommand): Promise<Result<void, Error>> {
    try {
      const company = await this.companyStore.load(command.companyId);

      if (!company) {
        return new Failure(new NotFoundException('Company not found'));
      }

      company.removeMember(command.memberId, command.removedBy);

      await this.companyStore.save(company);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
