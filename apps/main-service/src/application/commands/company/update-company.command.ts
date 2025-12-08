import { Inject, NotFoundException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, Result, Success, Failure } from '@flexobo/core';
import { CompanyStatus } from '../../../domain/events/company.events';
import {
  ICompanyAggregateStore,
  COMPANY_AGGREGATE_STORE,
} from '../../../ports/company.repository';

export class UpdateCompanyCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly userId: string,
    public readonly companyName?: string,
    public readonly companyTypeId?: string,
    public readonly companyDescription?: string,
    public readonly avatar?: string,
    public readonly phoneNumber?: string,
    public readonly email?: string,
    public readonly countryId?: string,
    public readonly city?: string,
    public readonly dotMc?: string,
    public readonly isLegalEntity?: boolean,
    public readonly status?: CompanyStatus,
    public readonly statusReason?: string
  ) {}
}

@CommandHandler(UpdateCompanyCommand)
export class UpdateCompanyHandler implements ICommandHandler<UpdateCompanyCommand, void> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: UpdateCompanyCommand): Promise<Result<void, Error>> {
    try {
      const company = await this.companyStore.load(command.companyId);

      if (!company) {
        return new Failure(new NotFoundException('Company not found'));
      }

      company.update(
        {
          companyName: command.companyName,
          companyTypeId: command.companyTypeId,
          companyDescription: command.companyDescription,
          avatar: command.avatar,
          phoneNumber: command.phoneNumber,
          email: command.email,
          countryId: command.countryId,
          city: command.city,
          dotMc: command.dotMc,
          isLegalEntity: command.isLegalEntity,
          status: command.status,
          statusReason: command.statusReason,
        },
        command.userId
      );

      await this.companyStore.save(company);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
