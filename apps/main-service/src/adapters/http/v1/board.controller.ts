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
import { JwtAuthGuard, AuthenticatedUser } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  CreateBoardDto,
  UpdateBoardDto,
  AddBoardMemberDto,
  ListBoardsQueryDto,
} from '../dto/board.dto';
import { CreateBoardCommand } from '../../../application/commands/board/create-board.command';
import { UpdateBoardCommand } from '../../../application/commands/board/update-board.command';
import { AddBoardMemberCommand } from '../../../application/commands/board/add-board-member.command';
import { RemoveBoardMemberCommand } from '../../../application/commands/board/remove-board-member.command';
import { DeleteBoardCommand } from '../../../application/commands/board/delete-board.command';
import { GetBoardQuery } from '../../../application/queries/board/get-board.query';
import { ListBoardsQuery } from '../../../application/queries/board/list-boards.query';
import { ListInvitedBoardsQuery } from '../../../application/queries/board/list-invited-boards.query';
import { CommandBus, QueryBus } from '@flexobo/core';

@ApiTags('Boards')
@ApiBearerAuth()
@Controller('v1/boards')
@UseGuards(JwtAuthGuard)
export class BoardController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new private board' })
  @ApiResponse({ status: 201, description: 'Board created successfully' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBoardDto
  ) {
    // TODO: Get companyId from user's company membership
    const companyId = 'default-company';

    const boardId = await this.commandBus.execute(
      new CreateBoardCommand(user.userId, companyId, dto.name, dto.description)
    );

    return { id: boardId };
  }

  @Get()
  @ApiOperation({ summary: 'List boards for current user' })
  @ApiResponse({ status: 200, description: 'List of user boards' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListBoardsQueryDto
  ) {
    return this.queryBus.execute(
      new ListBoardsQuery(
        user.userId,
        { isActive: query.isActive },
        query.page ?? 1,
        query.limit ?? 20
      )
    );
  }

  @Get('invites')
  @ApiOperation({ summary: 'List boards user has been invited to' })
  @ApiResponse({ status: 200, description: 'List of invited boards' })
  async listInvited(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.queryBus.execute(
      new ListInvitedBoardsQuery(user.userId, page ?? 1, limit ?? 20)
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get board by ID' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Board details' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async getById(@Param('id') id: string) {
    return this.queryBus.execute(new GetBoardQuery(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update board' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Board updated successfully' })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBoardDto
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateBoardCommand(
        id,
        user.userId,
        dto.name,
        dto.description,
        dto.isActive
      )
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete board' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 204, description: 'Board deleted successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.commandBus.execute(new DeleteBoardCommand(id, user.userId));
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to board' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  async addMember(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddBoardMemberDto
  ): Promise<void> {
    await this.commandBus.execute(
      new AddBoardMemberCommand(id, user.userId, dto.userId, dto.role)
    );
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove member from board' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiParam({ name: 'memberId', description: 'Member user ID' })
  @ApiResponse({ status: 204, description: 'Member removed successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.commandBus.execute(
      new RemoveBoardMemberCommand(id, user.userId, memberId)
    );
  }
}
