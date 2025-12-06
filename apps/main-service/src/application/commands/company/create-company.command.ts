import { Inject } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, Result, Success, Failure } from '@flexobo/core';
import { v4 as uuidv4 } from 'uuid';
import { Company } from '../../../domain/aggregates/company.aggregate';
import { CompanyType } from '../../../domain/events/company.events';
import {
  ICompanyAggregateStore,
  COMPANY_AGGREGATE_STORE,
} from '../../../ports/company.repository';

export class CreateCompanyCommand implements ICommand {
  constructor(
    public readonly ownerId: string,
    public readonly name: string,
    public readonly type: CompanyType,
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

@CommandHandler(CreateCompanyCommand)
export class CreateCompanyHandler implements ICommandHandler<CreateCompanyCommand, string> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: CreateCompanyCommand): Promise<Result<string, Error>> {
    try {
    const companyId = uuidv4();

    const company = Company.create(companyId, {
      ownerId: command.ownerId,
      name: command.name,
      type: command.type,
      description: command.description,
      logo: command.logo,
      phone: command.phone,
      email: command.email,
      address: command.address,
      country: command.country,
      city: command.city,
      taxId: command.taxId,
      website: command.website,
    });

      await this.companyStore.save(company);

      return new Success(companyId);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
