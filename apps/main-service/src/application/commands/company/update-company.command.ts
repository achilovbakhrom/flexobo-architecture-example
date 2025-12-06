import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ICompanyAggregateStore,
  COMPANY_AGGREGATE_STORE,
} from '../../../ports/company.repository';

export class UpdateCompanyCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly userId: string,
    public readonly name?: string,
    public readonly description?: string,
    public readonly logo?: string,
    public readonly phone?: string,
    public readonly email?: string,
    public readonly address?: string,
    public readonly country?: string,
    public readonly city?: string,
    public readonly taxId?: string,
    public readonly website?: string
  ) {}
}

@Injectable()
@CommandHandler(UpdateCompanyCommand)
export class UpdateCompanyHandler implements ICommandHandler<UpdateCompanyCommand> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: UpdateCompanyCommand): Promise<void> {
    const company = await this.companyStore.load(command.companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    company.update(
      {
        name: command.name,
        description: command.description,
        logo: command.logo,
        phone: command.phone,
        email: command.email,
        address: command.address,
        country: command.country,
        city: command.city,
        taxId: command.taxId,
        website: command.website,
      },
      command.userId
    );

    await this.companyStore.save(company);
  }
}
