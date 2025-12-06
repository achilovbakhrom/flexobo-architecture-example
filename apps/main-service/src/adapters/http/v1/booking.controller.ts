import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedUser } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RateBookingDto, ListBookingsQueryDto } from '../dto/booking.dto';
import { ConfirmBookingCommand } from '../../../application/commands/booking/confirm-booking.command';
import { StartProgressCommand } from '../../../application/commands/booking/start-progress.command';
import { CompleteBookingCommand } from '../../../application/commands/booking/complete-booking.command';
import { CancelBookingCommand } from '../../../application/commands/booking/cancel-booking.command';
import { RateBookingCommand } from '../../../application/commands/booking/rate-booking.command';
import { GetBookingQuery } from '../../../application/queries/booking/get-booking.query';
import { ListBookingsQuery } from '../../../application/queries/booking/list-bookings.query';
import { GetRatingStatusQuery } from '../../../application/queries/booking/get-rating-status.query';
import { CommandBus, QueryBus } from '@flexobo/core';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('v1/bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Get()
  @ApiOperation({ summary: 'List bookings for current user' })
  @ApiResponse({ status: 200, description: 'List of user bookings' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListBookingsQueryDto
  ) {
    return this.queryBus.execute(
      new ListBookingsQuery(
        user.userId,
        (query.role as 'customer' | 'owner' | 'both') ?? 'both',
        { status: query.status },
        query.page ?? 1,
        query.limit ?? 20
      )
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking details' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getById(@Param('id') id: string) {
    return this.queryBus.execute(new GetBookingQuery(id));
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm booking (owner only)' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking confirmed' })
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.commandBus.execute(new ConfirmBookingCommand(id, user.userId));
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start booking progress' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Progress started' })
  @HttpCode(HttpStatus.OK)
  async start(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.commandBus.execute(new StartProgressCommand(id, user.userId));
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking completed' })
  @HttpCode(HttpStatus.OK)
  async complete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.commandBus.execute(new CompleteBookingCommand(id, user.userId));
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.commandBus.execute(new CancelBookingCommand(id, user.userId));
  }

  @Post(':id/rate')
  @ApiOperation({ summary: 'Rate the other party' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Rating submitted' })
  @HttpCode(HttpStatus.OK)
  async rate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RateBookingDto
  ): Promise<void> {
    await this.commandBus.execute(
      new RateBookingCommand(id, user.userId, dto.rating, dto.comment)
    );
  }

  @Get('rating-status/:postType/:postId')
  @ApiOperation({ summary: 'Check if user has rated for a post' })
  @ApiParam({ name: 'postType', description: 'Post type (LOAD or TRIP)' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Rating status' })
  async getRatingStatus(
    @Param('postType') postType: 'LOAD' | 'TRIP',
    @Param('postId') postId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.queryBus.execute(
      new GetRatingStatusQuery(postId, postType, user.userId)
    );
  }
}
