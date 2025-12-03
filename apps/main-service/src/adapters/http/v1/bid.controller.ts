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
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedUser } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  CreateBidDto,
  CounterBidDto,
  ListBidsByPostQueryDto,
  ListMyBidsQueryDto,
  ListReceivedBidsQueryDto,
} from '../dto/bid.dto';
import {
  CreateBidCommand,
  CreateBidResult,
} from '../../../application/commands/bid/create-bid.command';
import { CounterBidCommand } from '../../../application/commands/bid/counter-bid.command';
import {
  AcceptBidCommand,
  AcceptBidResult,
} from '../../../application/commands/bid/accept-bid.command';
import { RejectBidCommand } from '../../../application/commands/bid/reject-bid.command';
import { CancelBidCommand } from '../../../application/commands/bid/cancel-bid.command';
import { GetBidQuery } from '../../../application/queries/bid/get-bid.query';
import { ListBidsByPostQuery } from '../../../application/queries/bid/list-bids-by-post.query';
import { ListMyBidsQuery } from '../../../application/queries/bid/list-my-bids.query';
import { ListReceivedBidsQuery } from '../../../application/queries/bid/list-received-bids.query';

@ApiTags('Bids')
@ApiBearerAuth()
@Controller('v1/bids')
@UseGuards(JwtAuthGuard)
export class BidController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bid (also creates a chat room)' })
  @ApiResponse({ status: 201, description: 'Bid created successfully' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBidDto
  ): Promise<CreateBidResult> {
    return this.commandBus.execute(
      new CreateBidCommand(
        user.userId,
        dto.postType,
        dto.postId,
        dto.proposedPrice,
        dto.currency ?? 'USD',
        dto.transportIds,
        dto.expiresAt
      )
    );
  }

  @Get('my')
  @ApiOperation({ summary: 'List bids made by current user' })
  @ApiResponse({ status: 200, description: 'List of user bids' })
  async listMy(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMyBidsQueryDto
  ) {
    return this.queryBus.execute(
      new ListMyBidsQuery(
        user.userId,
        { status: query.status },
        query.page ?? 1,
        query.limit ?? 20
      )
    );
  }

  @Get('received')
  @ApiOperation({ summary: 'List bids received on user posts' })
  @ApiResponse({ status: 200, description: 'List of received bids' })
  async listReceived(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListReceivedBidsQueryDto
  ) {
    return this.queryBus.execute(
      new ListReceivedBidsQuery(
        user.userId,
        { status: query.status },
        query.page ?? 1,
        query.limit ?? 20
      )
    );
  }

  @Get('by-post/:postType/:postId')
  @ApiOperation({ summary: 'List bids for a specific post' })
  @ApiParam({ name: 'postType', description: 'LOAD or TRIP' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'List of bids for the post' })
  async listByPost(
    @Param('postType') postType: string,
    @Param('postId') postId: string,
    @Query() query: ListBidsByPostQueryDto
  ) {
    return this.queryBus.execute(
      new ListBidsByPostQuery(
        postType,
        postId,
        { status: query.status },
        query.page ?? 1,
        query.limit ?? 20
      )
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bid with negotiation history' })
  @ApiParam({ name: 'id', description: 'Bid ID' })
  @ApiResponse({ status: 200, description: 'Bid details with negotiation history' })
  @ApiResponse({ status: 404, description: 'Bid not found' })
  async getById(@Param('id') id: string) {
    return this.queryBus.execute(new GetBidQuery(id));
  }

  @Post(':id/counter')
  @ApiOperation({ summary: 'Submit a counter offer' })
  @ApiParam({ name: 'id', description: 'Bid ID' })
  @ApiResponse({ status: 200, description: 'Counter offer submitted' })
  @HttpCode(HttpStatus.OK)
  async counter(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CounterBidDto
  ): Promise<void> {
    await this.commandBus.execute(
      new CounterBidCommand(id, user.userId, dto.newPrice)
    );
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept bid (creates a booking)' })
  @ApiParam({ name: 'id', description: 'Bid ID' })
  @ApiResponse({ status: 200, description: 'Bid accepted, booking created' })
  @HttpCode(HttpStatus.OK)
  async accept(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<AcceptBidResult> {
    return this.commandBus.execute(new AcceptBidCommand(id, user.userId));
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject bid' })
  @ApiParam({ name: 'id', description: 'Bid ID' })
  @ApiResponse({ status: 200, description: 'Bid rejected' })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.commandBus.execute(new RejectBidCommand(id, user.userId));
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel bid (bidder only)' })
  @ApiParam({ name: 'id', description: 'Bid ID' })
  @ApiResponse({ status: 200, description: 'Bid cancelled' })
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.commandBus.execute(new CancelBidCommand(id, user.userId));
  }
}
