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
  CreateTransportDto,
  UpdateTransportDto,
  ListTransportsQueryDto,
  TransportResponseDto,
  ListTransportsResponseDto,
} from '../dto/transport.dto';
import { CreateTransportCommand } from '../../../application/commands/transport/create-transport.command';
import { UpdateTransportCommand } from '../../../application/commands/transport/update-transport.command';
import { DeleteTransportCommand } from '../../../application/commands/transport/delete-transport.command';
import { GetTransportQuery } from '../../../application/queries/transport/get-transport.query';
import { ListTransportsQuery } from '../../../application/queries/transport/list-transports.query';
import { UsersGrpcClient } from '../../grpc';
import { CommandBus, QueryBus } from '@flexobo/core';

@ApiTags('Transports')
@ApiBearerAuth()
@Controller('v1/transports')
@UseGuards(JwtAuthGuard)
export class TransportController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly usersGrpcClient: UsersGrpcClient
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transport' })
  @ApiResponse({
    status: 201,
    description: 'Transport created successfully',
    type: String,
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransportDto
  ) {
    // Get user info to retrieve companyId
    const userInfo = await this.usersGrpcClient.getUser(user.userId);
    // TODO: Get companyId from user's company membership
    // For now, we'll use a placeholder - this needs to be resolved via proper company membership
    const companyId = 'default-company'; // This should come from user's company association

    const transportId = await this.commandBus.execute(
      new CreateTransportCommand(
        user.userId,
        companyId,
        dto.transportType,
        dto.loadingTypes,
        dto.capacityTons,
        dto.capacityM3,
        dto.lengthM,
        dto.widthM,
        dto.heightM,
        dto.features ?? [],
        dto.adrClasses ?? [],
        dto.permits ?? []
      )
    );

    return { id: transportId };
  }

  @Get()
  @ApiOperation({ summary: 'List transports for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of transports',
    type: ListTransportsResponseDto,
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTransportsQueryDto
  ): Promise<ListTransportsResponseDto> {
    return this.queryBus.execute(
      new ListTransportsQuery(
        user.userId,
        {
          transportType: query.transportType,
          isActive: query.isActive,
        },
        query.page ?? 1,
        query.limit ?? 20
      )
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transport by ID' })
  @ApiParam({ name: 'id', description: 'Transport ID' })
  @ApiResponse({
    status: 200,
    description: 'Transport details',
    type: TransportResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Transport not found' })
  async getById(@Param('id') id: string): Promise<TransportResponseDto> {
    return this.queryBus.execute(new GetTransportQuery(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update transport' })
  @ApiParam({ name: 'id', description: 'Transport ID' })
  @ApiResponse({ status: 200, description: 'Transport updated successfully' })
  @ApiResponse({ status: 404, description: 'Transport not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTransportDto
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateTransportCommand(
        id,
        user.userId,
        dto.transportType,
        dto.loadingTypes,
        dto.capacityTons,
        dto.capacityM3,
        dto.lengthM,
        dto.widthM,
        dto.heightM,
        dto.features,
        dto.adrClasses,
        dto.permits
      )
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete transport' })
  @ApiParam({ name: 'id', description: 'Transport ID' })
  @ApiResponse({ status: 204, description: 'Transport deleted successfully' })
  @ApiResponse({ status: 404, description: 'Transport not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.commandBus.execute(new DeleteTransportCommand(id, user.userId));
  }
}
