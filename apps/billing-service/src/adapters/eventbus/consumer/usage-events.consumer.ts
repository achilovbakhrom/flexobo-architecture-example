import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RecordUsageCommand } from '../../../application/commands/subscription';
import {
  GetSubscriptionByCompanyQuery,
  SubscriptionDto,
} from '../../../application/queries/subscription';
import { UsageType } from '../../../domain/constants/enums';

interface MainServiceEvent {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  data: {
    companyId?: string;
    ownerId?: string;
    bidderId?: string;
    customerId?: string;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
  version: number;
  timestamp: string;
}

@Injectable()
export class UsageEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(UsageEventsConsumer.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  onModuleInit() {
    this.logger.log('UsageEventsConsumer initialized');
  }

  @EventPattern('main.load.created')
  async handleLoadCreated(@Payload() event: MainServiceEvent): Promise<void> {
    this.logger.debug(`Received LoadCreatedEvent: ${event.aggregateId}`);
    await this.recordUsage(
      event.data.companyId ?? event.data.ownerId,
      UsageType.LOAD_CREATED,
      'LOAD',
      event.aggregateId,
    );
  }

  @EventPattern('main.trip.created')
  async handleTripCreated(@Payload() event: MainServiceEvent): Promise<void> {
    this.logger.debug(`Received TripCreatedEvent: ${event.aggregateId}`);
    await this.recordUsage(
      event.data.companyId ?? event.data.ownerId,
      UsageType.TRIP_POSTED,
      'TRIP',
      event.aggregateId,
    );
  }

  @EventPattern('main.bid.created')
  async handleBidCreated(@Payload() event: MainServiceEvent): Promise<void> {
    this.logger.debug(`Received BidCreatedEvent: ${event.aggregateId}`);
    // Record usage for the bidder's company
    await this.recordUsage(
      event.data.bidderId,
      UsageType.BID_PLACED,
      'BID',
      event.aggregateId,
    );
  }

  @EventPattern('main.booking.created')
  async handleBookingCreated(@Payload() event: MainServiceEvent): Promise<void> {
    this.logger.debug(`Received BookingCreatedEvent: ${event.aggregateId}`);
    await this.recordUsage(
      event.data.customerId,
      UsageType.BOOKING_CREATED,
      'BOOKING',
      event.aggregateId,
    );
  }

  @EventPattern('users.team_member.added')
  async handleTeamMemberAdded(@Payload() event: MainServiceEvent): Promise<void> {
    this.logger.debug(`Received TeamMemberAddedEvent: ${event.aggregateId}`);
    await this.recordUsage(
      event.data.companyId,
      UsageType.TEAM_MEMBER_ADDED,
      'TEAM_MEMBER',
      event.aggregateId,
    );
  }

  @EventPattern('file.uploaded')
  async handleFileUploaded(@Payload() event: MainServiceEvent): Promise<void> {
    this.logger.debug(`Received FileUploadedEvent: ${event.aggregateId}`);
    await this.recordUsage(
      event.data.companyId ?? event.data.ownerId,
      UsageType.FILE_UPLOADED,
      'FILE',
      event.aggregateId,
    );
  }

  private async recordUsage(
    companyIdOrUserId: string | undefined,
    usageType: UsageType,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    if (!companyIdOrUserId) {
      this.logger.warn(
        `Cannot record usage: no company/user ID for ${usageType}`,
      );
      return;
    }

    try {
      // Get subscription for the company
      const subscription = await this.queryBus.execute<
        GetSubscriptionByCompanyQuery,
        SubscriptionDto | null
      >(new GetSubscriptionByCompanyQuery(companyIdOrUserId));

      if (!subscription) {
        this.logger.debug(
          `No subscription found for company ${companyIdOrUserId}`,
        );
        return;
      }

      // Record the usage
      await this.commandBus.execute(
        new RecordUsageCommand({
          companyId: companyIdOrUserId,
          usageType,
          quantity: 1,
          entityType,
          entityId,
        }),
      );

      this.logger.debug(
        `Recorded ${usageType} usage for subscription ${subscription.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to record usage ${usageType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
