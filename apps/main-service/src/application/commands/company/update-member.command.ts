import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { CompanyMemberRole } from '../../../domain/events/company.events';
import {
  ICompanyAggregateStore,
  COMPANY_AGGREGATE_STORE,
} from '../../../ports/company.repository';

export class UpdateCompanyMemberCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly updatedBy: string,
    public readonly memberId: string,
    public readonly role: CompanyMemberRole
  ) {}
}

@Injectable()
@CommandHandler(UpdateCompanyMemberCommand)
export class UpdateCompanyMemberHandler implements ICommandHandler<UpdateCompanyMemberCommand> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: UpdateCompanyMemberCommand): Promise<void> {
    const company = await this.companyStore.load(command.companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    company.updateMember(command.memberId, command.role, command.updatedBy);

    await this.companyStore.save(company);
  }
}
