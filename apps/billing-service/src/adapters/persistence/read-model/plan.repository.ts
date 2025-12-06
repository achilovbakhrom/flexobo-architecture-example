import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma.module';
import {
  IPlanReadRepository,
  PlanReadData,
} from '../../../ports/plan.repository';

@Injectable()
export class PlanReadRepository implements IPlanReadRepository {
  constructor(@Inject('PrismaService') private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PlanReadData | null> {
    const plan = await this.prisma.planReadModel.findUnique({
      where: { id },
    });

    if (!plan) {
      return null;
    }

    return this.toDto(plan);
  }

  async findByName(name: string): Promise<PlanReadData | null> {
    const plan = await this.prisma.planReadModel.findFirst({
      where: { name },
    });

    if (!plan) {
      return null;
    }

    return this.toDto(plan);
  }

  async findAll(isActive?: boolean): Promise<PlanReadData[]> {
    const plans = await this.prisma.planReadModel.findMany({
      where: isActive !== undefined ? { isActive } : undefined,
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map((plan) => this.toDto(plan));
  }

  async findActive(): Promise<PlanReadData[]> {
    const plans = await this.prisma.planReadModel.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map((plan) => this.toDto(plan));
  }

  async save(plan: PlanReadData): Promise<void> {
    await this.prisma.planReadModel.upsert({
      where: { id: plan.id },
      create: {
        id: plan.id,
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        currency: plan.currency,
        limits: plan.limits as object,
        features: plan.features,
        sortOrder: plan.sortOrder,
        isPopular: plan.isPopular,
        isActive: plan.isActive,
        trialDays: plan.trialDays,
        version: plan.version,
      },
      update: {
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        currency: plan.currency,
        limits: plan.limits as object,
        features: plan.features,
        sortOrder: plan.sortOrder,
        isPopular: plan.isPopular,
        isActive: plan.isActive,
        trialDays: plan.trialDays,
        version: plan.version,
      },
    });
  }

  async update(id: string, data: Partial<PlanReadData>): Promise<void> {
    await this.prisma.planReadModel.update({
      where: { id },
      data: {
        ...data,
        limits: data.limits ? (data.limits as object) : undefined,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDto(plan: any): PlanReadData {
    return {
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      currency: plan.currency,
      limits: plan.limits as PlanReadData['limits'],
      features: plan.features,
      sortOrder: plan.sortOrder,
      isPopular: plan.isPopular,
      isActive: plan.isActive,
      trialDays: plan.trialDays,
      version: plan.version,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
