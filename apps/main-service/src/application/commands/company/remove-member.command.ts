import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
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

@Injectable()
@CommandHandler(RemoveCompanyMemberCommand)
export class RemoveCompanyMemberHandler implements ICommandHandler<RemoveCompanyMemberCommand> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: RemoveCompanyMemberCommand): Promise<void> {
    const company = await this.companyStore.load(command.companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    company.removeMember(command.memberId, command.removedBy);

    await this.companyStore.save(company);
  }
}
