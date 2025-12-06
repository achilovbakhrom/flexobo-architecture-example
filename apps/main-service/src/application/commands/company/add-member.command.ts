import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
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

@Injectable()
@CommandHandler(AddCompanyMemberCommand)
export class AddCompanyMemberHandler implements ICommandHandler<AddCompanyMemberCommand> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: AddCompanyMemberCommand): Promise<void> {
    const company = await this.companyStore.load(command.companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    company.addMember(command.userId, command.role, command.addedBy);

    await this.companyStore.save(company);
  }
}
