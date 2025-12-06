import { Inject, NotFoundException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, Result, Success, Failure } from '@flexobo/core';
import {
  ICompanyAggregateStore,
  COMPANY_AGGREGATE_STORE,
} from '../../../ports/company.repository';

export class VerifyCompanyCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly verifiedBy: string,
    public readonly notes?: string
  ) {}
}

@CommandHandler(VerifyCompanyCommand)
export class VerifyCompanyHandler implements ICommandHandler<VerifyCompanyCommand, void> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: VerifyCompanyCommand): Promise<Result<void, Error>> {
    try {
      const company = await this.companyStore.load(command.companyId);

      if (!company) {
        return new Failure(new NotFoundException('Company not found'));
      }

      company.verify(command.verifiedBy, command.notes);

      await this.companyStore.save(company);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

export class RejectCompanyCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly rejectedBy: string,
    public readonly reason: string
  ) {}
}

@CommandHandler(RejectCompanyCommand)
export class RejectCompanyHandler implements ICommandHandler<RejectCompanyCommand, void> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: RejectCompanyCommand): Promise<Result<void, Error>> {
    try {
      const company = await this.companyStore.load(command.companyId);

      if (!company) {
        return new Failure(new NotFoundException('Company not found'));
      }

      company.reject(command.rejectedBy, command.reason);

      await this.companyStore.save(company);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

export class SuspendCompanyCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly suspendedBy: string,
    public readonly reason: string
  ) {}
}

@CommandHandler(SuspendCompanyCommand)
export class SuspendCompanyHandler implements ICommandHandler<SuspendCompanyCommand, void> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: SuspendCompanyCommand): Promise<Result<void, Error>> {
    try {
      const company = await this.companyStore.load(command.companyId);

      if (!company) {
        return new Failure(new NotFoundException('Company not found'));
      }

      company.suspend(command.suspendedBy, command.reason);

      await this.companyStore.save(company);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

export class ReactivateCompanyCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly reactivatedBy: string
  ) {}
}

@CommandHandler(ReactivateCompanyCommand)
export class ReactivateCompanyHandler implements ICommandHandler<ReactivateCompanyCommand, void> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: ReactivateCompanyCommand): Promise<Result<void, Error>> {
    try {
      const company = await this.companyStore.load(command.companyId);

      if (!company) {
        return new Failure(new NotFoundException('Company not found'));
      }

      company.reactivate(command.reactivatedBy);

      await this.companyStore.save(company);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
