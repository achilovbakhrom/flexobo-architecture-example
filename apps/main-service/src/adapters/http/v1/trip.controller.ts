import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { JwtAuthGuard, AuthenticatedUser, CurrentUser } from '@flexobo/shared-kernel';
import {
  CreateTripDto,
  UpdateTripDto,
  ListTripsQueryDto,
  SearchTripsQueryDto,
} from '../dto/trip.dto';
import { CreateTripCommand } from '../../../application/commands/trip/create-trip.command';
import { UpdateTripCommand } from '../../../application/commands/trip/update-trip.command';
import { ActivateTripCommand } from '../../../application/commands/trip/activate-trip.command';
import { DeleteTripCommand } from '../../../application/commands/trip/delete-trip.command';
import { GetTripQuery } from '../../../application/queries/trip/get-trip.query';
import { ListTripsQuery } from '../../../application/queries/trip/list-trips.query';
import { SearchTripsQuery } from '../../../application/queries/trip/search-trips.query';
import { GetTripFilterDataQuery } from '../../../application/queries/trip/get-trip-filter-data.query';
import { ListTripsWithBidsQuery } from '../../../application/queries/trip/list-trips-with-bids.query';
import { ListTripsUserBidOnQuery } from '../../../application/queries/trip/list-trips-user-bid-on.query';
import { CommandBus, QueryBus } from '@flexobo/core';

@ApiTags('Trips')
@ApiBearerAuth()
@Controller('v1/trips')
@UseGuards(JwtAuthGuard)
export class TripController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new trip' })
  @ApiResponse({ status: 201, description: 'Trip created successfully' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTripDto
  ) {
    // TODO: Get companyId from user's company membership
    const companyId = 'default-company';

    const transport = {
      id: dto.transport.id,
      type: dto.transport.type,
      capacity: dto.transport.capacity,
      dimensions: dto.transport.dimensions,
      loadingTypes: dto.transport.loadingTypes,
      features: dto.transport.features ?? [],
      permits: dto.transport.permits ?? [],
    };

    const tripId = await this.commandBus.execute(
      new CreateTripCommand(
        user.userId,
        companyId,
        transport,
        dto.loadingPoints,
        dto.unloadingPoints,
        dto.price,
        dto.currency ?? 'USD',
        dto.paymentTerms,
        dto.boardIds ?? [],
        dto.isPublic ?? true
      )
    );

    return { id: tripId };
  }

  @Get('filter-data')
  @ApiOperation({ summary: 'Get filter options for trips (public)' })
  @ApiResponse({ status: 200, description: 'Filter options' })
  async getFilterData() {
    return this.queryBus.execute(new GetTripFilterDataQuery());
  }

  @Get('my')
  @ApiOperation({ summary: 'List trips for current user' })
  @ApiResponse({ status: 200, description: 'List of user trips' })
  async listMy(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTripsQueryDto
  ) {
    return this.queryBus.execute(
      new ListTripsQuery(
        user.userId,
        { status: query.status },
        query.page ?? 1,
        query.limit ?? 20
      )
    );
  }

  @Get('my-with-requests')
  @ApiOperation({ summary: 'List user trips that have received bids' })
  @ApiResponse({ status: 200, description: 'Trips with bid counts' })
  async listMyWithRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.queryBus.execute(
      new ListTripsWithBidsQuery(user.userId, page ?? 1, limit ?? 20)
    );
  }

  @Get('my-sent-bids')
  @ApiOperation({ summary: 'List trips where current user has made bids' })
  @ApiResponse({ status: 200, description: 'Trips with user bids' })
  async listMySentBids(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.queryBus.execute(
      new ListTripsUserBidOnQuery(user.userId, status, page ?? 1, limit ?? 20)
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search trips (respects board visibility)' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchTripsQueryDto
  ) {
    // TODO: Get user's accessible board IDs from board membership
    const userBoardIds: string[] = [];

    return this.queryBus.execute(
      new SearchTripsQuery(
        userBoardIds,
        {
          status: query.status,
          transportType: query.transportType,
          fromCountry: query.fromCountry,
          toCountry: query.toCountry,
          dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
          dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        },
        query.page ?? 1,
        query.limit ?? 20
      )
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trip by ID' })
  @ApiParam({ name: 'id', description: 'Trip ID' })
  @ApiResponse({ status: 200, description: 'Trip details' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  async getById(@Param('id') id: string) {
    return this.queryBus.execute(new GetTripQuery(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update trip' })
  @ApiParam({ name: 'id', description: 'Trip ID' })
  @ApiResponse({ status: 200, description: 'Trip updated successfully' })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTripDto
  ): Promise<void> {
    const transport = dto.transport
      ? {
          id: dto.transport.id,
          type: dto.transport.type,
          capacity: dto.transport.capacity,
          dimensions: dto.transport.dimensions,
          loadingTypes: dto.transport.loadingTypes,
          features: dto.transport.features ?? [],
          permits: dto.transport.permits ?? [],
        }
      : undefined;

    await this.commandBus.execute(
      new UpdateTripCommand(
        id,
        user.userId,
        transport,
        dto.loadingPoints,
        dto.unloadingPoints,
        dto.price,
        dto.currency,
        dto.paymentTerms,
        dto.boardIds,
        dto.isPublic
      )
    );
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate trip (publish to boards)' })
  @ApiParam({ name: 'id', description: 'Trip ID' })
  @ApiResponse({ status: 200, description: 'Trip activated successfully' })
  @HttpCode(HttpStatus.OK)
  async activate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.commandBus.execute(new ActivateTripCommand(id, user.userId));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete trip' })
  @ApiParam({ name: 'id', description: 'Trip ID' })
  @ApiResponse({ status: 204, description: 'Trip deleted successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.commandBus.execute(new DeleteTripCommand(id, user.userId));
  }
}
