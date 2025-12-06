import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard, RolesGuard, Roles, Public } from '@flexobo/shared-kernel';
import {
  CreatePlanDto,
  UpdatePlanDto,
  PlanResponseDto,
  ListPlansResponseDto,
} from '../dto/plan.dto';
import { CreatePlanCommand } from '../../../application/commands/plan/create-plan.command';
import { UpdatePlanCommand } from '../../../application/commands/plan/update-plan.command';
import { ActivatePlanCommand } from '../../../application/commands/plan/activate-plan.command';
import { DeactivatePlanCommand } from '../../../application/commands/plan/deactivate-plan.command';
import { GetPlanQuery } from '../../../application/queries/plan/get-plan.query';
import { ListPlansQuery } from '../../../application/queries/plan/list-plans.query';
import { PlanReadData } from '../../../ports/plan.repository';
import { CreatePlanResult } from '../../../application/commands/plan/create-plan.command';

@ApiTags('Plans')
@Controller('v1/plans')
export class PlanController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new plan (Admin only)' })
  @ApiResponse({ status: 201, description: 'Plan created', type: PlanResponseDto })
  async createPlan(@Body() dto: CreatePlanDto): Promise<PlanResponseDto> {
    const result = await this.commandBus.execute<CreatePlanCommand, CreatePlanResult>(
      new CreatePlanCommand(dto),
    );
    const plan = await this.queryBus.execute<GetPlanQuery, PlanReadData | null>(
      new GetPlanQuery(result.id),
    );
    if (!plan) {
      throw new Error('Plan creation failed');
    }
    return this.toPlanResponse(plan);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all plans' })
  @ApiResponse({ status: 200, type: ListPlansResponseDto })
  async listPlans(
    @Query('activeOnly') activeOnly?: string,
  ): Promise<ListPlansResponseDto> {
    const isActive = activeOnly === 'true' ? true : undefined;
    const plans = await this.queryBus.execute<ListPlansQuery, PlanReadData[]>(
      new ListPlansQuery({ isActive }),
    );
    return {
      plans: plans.map((p) => this.toPlanResponse(p)),
      total: plans.length,
    };
  }

  @Get('active')
  @Public()
  @ApiOperation({ summary: 'List active plans for public display' })
  @ApiResponse({ status: 200, type: ListPlansResponseDto })
  async listActivePlans(): Promise<ListPlansResponseDto> {
    const plans = await this.queryBus.execute<ListPlansQuery, PlanReadData[]>(
      new ListPlansQuery({ isActive: true }),
    );
    return {
      plans: plans.map((p) => this.toPlanResponse(p)),
      total: plans.length,
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlan(@Param('id') id: string): Promise<PlanResponseDto> {
    const plan = await this.queryBus.execute<GetPlanQuery, PlanReadData | null>(
      new GetPlanQuery(id),
    );
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return this.toPlanResponse(plan);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a plan (Admin only)' })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ): Promise<PlanResponseDto> {
    await this.commandBus.execute(new UpdatePlanCommand({ planId: id, ...dto }));
    const plan = await this.queryBus.execute<GetPlanQuery, PlanReadData | null>(
      new GetPlanQuery(id),
    );
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return this.toPlanResponse(plan);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a plan (Admin only)' })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async activatePlan(@Param('id') id: string): Promise<PlanResponseDto> {
    await this.commandBus.execute(new ActivatePlanCommand(id));
    const plan = await this.queryBus.execute<GetPlanQuery, PlanReadData | null>(
      new GetPlanQuery(id),
    );
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return this.toPlanResponse(plan);
  }

  @Post(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a plan (Admin only)' })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async deactivatePlan(@Param('id') id: string): Promise<PlanResponseDto> {
    await this.commandBus.execute(new DeactivatePlanCommand(id));
    const plan = await this.queryBus.execute<GetPlanQuery, PlanReadData | null>(
      new GetPlanQuery(id),
    );
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return this.toPlanResponse(plan);
  }

  private toPlanResponse(plan: PlanReadData): PlanResponseDto {
    return {
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      currency: plan.currency,
      limits: plan.limits,
      features: plan.features,
      sortOrder: plan.sortOrder,
      isPopular: plan.isPopular,
      isActive: plan.isActive,
      trialDays: plan.trialDays,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
