import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard, AuthenticatedUser } from '../guards/jwt-auth.guard';
import {
  CreateSubscriptionDto,
  ChangePlanDto,
  CancelSubscriptionDto,
  CheckUsageLimitDto,
  SubscriptionResponseDto,
  CheckUsageLimitResponseDto,
} from '../dto/subscription.dto';
import {
  CreateSubscriptionCommand,
  CreateSubscriptionResult,
} from '../../../application/commands/subscription/create-subscription.command';
import { ChangePlanCommand } from '../../../application/commands/subscription/change-plan.command';
import { CancelSubscriptionCommand } from '../../../application/commands/subscription/cancel-subscription.command';
import { GetSubscriptionQuery } from '../../../application/queries/subscription/get-subscription.query';
import { GetSubscriptionByCompanyQuery } from '../../../application/queries/subscription/get-subscription-by-company.query';
import {
  CheckUsageLimitQuery,
  CheckUsageLimitResult,
} from '../../../application/queries/subscription/check-usage-limit.query';
import { SubscriptionReadData } from '../../../ports/subscription.repository';
import { UsersGrpcClient } from '../../grpc/users-grpc.client';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@ApiTags('Subscriptions')
@Controller('v1/subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly usersClient: UsersGrpcClient,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({ status: 201, type: SubscriptionResponseDto })
  async createSubscription(
    @Body() dto: CreateSubscriptionDto,
    @Req() req: RequestWithUser,
  ): Promise<SubscriptionResponseDto> {
    // Get company ID from user - in real app, get from user's company
    const user = await this.usersClient.getUser(req.user.userId);
    // For now, use userId as companyId (in production, get actual companyId)
    const companyId = req.user.userId;

    const result = await this.commandBus.execute<
      CreateSubscriptionCommand,
      CreateSubscriptionResult
    >(
      new CreateSubscriptionCommand({
        companyId,
        planId: dto.planId,
        billingCycle: dto.billingCycle,
      }),
    );

    const subscription = await this.queryBus.execute<
      GetSubscriptionQuery,
      SubscriptionReadData | null
    >(new GetSubscriptionQuery(result.id));

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.toSubscriptionResponse(subscription);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current company subscription' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 404, description: 'No subscription found' })
  async getCurrentSubscription(
    @Req() req: RequestWithUser,
  ): Promise<SubscriptionResponseDto> {
    // For now, use userId as companyId
    const companyId = req.user.userId;

    const subscription = await this.queryBus.execute<
      GetSubscriptionByCompanyQuery,
      SubscriptionReadData | null
    >(new GetSubscriptionByCompanyQuery(companyId));

    if (!subscription) {
      throw new NotFoundException('No subscription found for this company');
    }

    return this.toSubscriptionResponse(subscription);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async getSubscription(
    @Param('id') id: string,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.queryBus.execute<
      GetSubscriptionQuery,
      SubscriptionReadData | null
    >(new GetSubscriptionQuery(id));

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.toSubscriptionResponse(subscription);
  }

  @Post(':id/change-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change subscription plan' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async changePlan(
    @Param('id') id: string,
    @Body() dto: ChangePlanDto,
  ): Promise<SubscriptionResponseDto> {
    await this.commandBus.execute(
      new ChangePlanCommand({
        subscriptionId: id,
        newPlanId: dto.newPlanId,
      }),
    );

    const subscription = await this.queryBus.execute<
      GetSubscriptionQuery,
      SubscriptionReadData | null
    >(new GetSubscriptionQuery(id));

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.toSubscriptionResponse(subscription);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async cancelSubscription(
    @Param('id') id: string,
    @Body() dto: CancelSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    await this.commandBus.execute(
      new CancelSubscriptionCommand({
        subscriptionId: id,
        reason: dto.reason,
        immediate: dto.immediate,
      }),
    );

    const subscription = await this.queryBus.execute<
      GetSubscriptionQuery,
      SubscriptionReadData | null
    >(new GetSubscriptionQuery(id));

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.toSubscriptionResponse(subscription);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get subscription usage data' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async getUsage(@Param('id') id: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.queryBus.execute<
      GetSubscriptionQuery,
      SubscriptionReadData | null
    >(new GetSubscriptionQuery(id));

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.toSubscriptionResponse(subscription);
  }

  @Post('check-limit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if action is within usage limit' })
  @ApiResponse({ status: 200, type: CheckUsageLimitResponseDto })
  async checkLimit(
    @Body() dto: CheckUsageLimitDto,
    @Req() req: RequestWithUser,
  ): Promise<CheckUsageLimitResponseDto> {
    // For now, use userId as companyId
    const companyId = req.user.userId;

    return this.queryBus.execute<CheckUsageLimitQuery, CheckUsageLimitResult>(
      new CheckUsageLimitQuery({
        companyId,
        usageType: dto.usageType,
      }),
    );
  }

  private toSubscriptionResponse(
    subscription: SubscriptionReadData,
  ): SubscriptionResponseDto {
    return {
      id: subscription.id,
      companyId: subscription.companyId,
      planId: subscription.planId,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEnd: subscription.trialEnd,
      paymentProvider: subscription.paymentProvider,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      cancelledAt: subscription.cancelledAt,
      cancellationReason: subscription.cancellationReason,
      usageData: subscription.usageData,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }
}
