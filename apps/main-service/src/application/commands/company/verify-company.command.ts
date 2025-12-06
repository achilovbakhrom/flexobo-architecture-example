import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
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

@Injectable()
@CommandHandler(VerifyCompanyCommand)
export class VerifyCompanyHandler implements ICommandHandler<VerifyCompanyCommand> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: VerifyCompanyCommand): Promise<void> {
    const company = await this.companyStore.load(command.companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    company.verify(command.verifiedBy, command.notes);

    await this.companyStore.save(company);
  }
}

export class RejectCompanyCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly rejectedBy: string,
    public readonly reason: string
  ) {}
}

@Injectable()
@CommandHandler(RejectCompanyCommand)
export class RejectCompanyHandler implements ICommandHandler<RejectCompanyCommand> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: RejectCompanyCommand): Promise<void> {
    const company = await this.companyStore.load(command.companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    company.reject(command.rejectedBy, command.reason);

    await this.companyStore.save(company);
  }
}

export class SuspendCompanyCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly suspendedBy: string,
    public readonly reason: string
  ) {}
}

@Injectable()
@CommandHandler(SuspendCompanyCommand)
export class SuspendCompanyHandler implements ICommandHandler<SuspendCompanyCommand> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: SuspendCompanyCommand): Promise<void> {
    const company = await this.companyStore.load(command.companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    company.suspend(command.suspendedBy, command.reason);

    await this.companyStore.save(company);
  }
}

export class ReactivateCompanyCommand implements ICommand {
  constructor(
    public readonly companyId: string,
    public readonly reactivatedBy: string
  ) {}
}

@Injectable()
@CommandHandler(ReactivateCompanyCommand)
export class ReactivateCompanyHandler implements ICommandHandler<ReactivateCompanyCommand> {
  constructor(
    @Inject(COMPANY_AGGREGATE_STORE)
    private readonly companyStore: ICompanyAggregateStore
  ) {}

  async execute(command: ReactivateCompanyCommand): Promise<void> {
    const company = await this.companyStore.load(command.companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    company.reactivate(command.reactivatedBy);

    await this.companyStore.save(company);
  }
}
