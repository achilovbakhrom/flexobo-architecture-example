import { Inject } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, Result, Success, Failure } from '@flexobo/core';
import { v4 as uuidv4 } from 'uuid';
import { Company } from '../../../domain/aggregates/company.aggregate';
import { CompanyDocumentData, CompanyDocumentType } from '../../../domain/events/company.events';
import {
  ICompanyAggregateStore,
  COMPANY_AGGREGATE_STORE,
} from '../../../ports/company.repository';

export interface CreateCompanyDocumentInput {
  type: CompanyDocumentType;
  url: string;
}

export class CreateCompanyCommand implements ICommand {
  constructor(
    public readonly ownerId: string,
    public readonly companyTypeId: string,
    public readonly companyName?: string,
    public readonly companyDescription?: string,
    public readonly avatar?: string,
    public readonly phoneNumber?: string,
    public readonly email?: string,
    public readonly countryId?: string,
    public readonly city?: string,
    public readonly dotMc?: string,
    public readonly isLegalEntity?: boolean,
    public readonly documents?: CreateCompanyDocumentInput[]
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

      // Convert documents to CompanyDocumentData format
      const documents: CompanyDocumentData[] | undefined = command.documents?.map((doc) => ({
        id: uuidv4(),
        type: doc.type,
        url: doc.url,
        addedAt: new Date().toISOString(),
      }));

      const company = Company.create(companyId, {
        ownerId: command.ownerId,
        companyName: command.companyName || '',
        companyTypeId: command.companyTypeId,
        companyDescription: command.companyDescription,
        avatar: command.avatar,
        phoneNumber: command.phoneNumber,
        email: command.email,
        countryId: command.countryId,
        city: command.city,
        dotMc: command.dotMc,
        isLegalEntity: command.isLegalEntity,
        documents,
      });

      await this.companyStore.save(company);

      return new Success(companyId);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
