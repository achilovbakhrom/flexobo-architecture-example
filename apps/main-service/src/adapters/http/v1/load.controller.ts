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
  CreateLoadDto,
  UpdateLoadDto,
  ListLoadsQueryDto,
  SearchLoadsQueryDto,
} from '../dto/load.dto';
import { CreateLoadCommand } from '../../../application/commands/load/create-load.command';
import { UpdateLoadCommand } from '../../../application/commands/load/update-load.command';
import { ActivateLoadCommand } from '../../../application/commands/load/activate-load.command';
import { DeleteLoadCommand } from '../../../application/commands/load/delete-load.command';
import { GetLoadQuery } from '../../../application/queries/load/get-load.query';
import { ListLoadsQuery } from '../../../application/queries/load/list-loads.query';
import { SearchLoadsQuery } from '../../../application/queries/load/search-loads.query';
import { CommandBus, QueryBus } from '@flexobo/core';

@ApiTags('Loads')
@ApiBearerAuth()
@Controller('v1/loads')
@UseGuards(JwtAuthGuard)
export class LoadController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new load' })
  @ApiResponse({ status: 201, description: 'Load created successfully' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLoadDto
  ) {
    // TODO: Get companyId from user's company membership
    const companyId = 'default-company';

    const loadId = await this.commandBus.execute(
      new CreateLoadCommand(
        user.userId,
        companyId,
        dto.from,
        dto.to,
        dto.transportType,
        dto.loadingTypes,
        dto.cargos,
        dto.loadingDate,
        dto.loadingDateTo,
        dto.unloadingDate,
        dto.features ?? [],
        dto.adrClasses ?? [],
        dto.temperatureMin,
        dto.temperatureMax,
        dto.price,
        dto.currency ?? 'USD',
        dto.paymentTerms,
        dto.boardIds ?? [],
        dto.isPublic ?? true
      )
    );

    return { id: loadId };
  }

  @Get('my')
  @ApiOperation({ summary: 'List loads for current user' })
  @ApiResponse({ status: 200, description: 'List of user loads' })
  async listMy(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListLoadsQueryDto
  ) {
    return this.queryBus.execute(
      new ListLoadsQuery(
        user.userId,
        {
          status: query.status,
          transportType: query.transportType,
        },
        query.page ?? 1,
        query.limit ?? 20
      )
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search loads (respects board visibility)' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchLoadsQueryDto
  ) {
    // TODO: Get user's accessible board IDs from board membership
    const userBoardIds: string[] = [];

    return this.queryBus.execute(
      new SearchLoadsQuery(
        userBoardIds,
        {
          status: query.status,
          transportType: query.transportType,
          fromCountry: query.fromCountry,
          toCountry: query.toCountry,
          loadingDateFrom: query.loadingDateFrom
            ? new Date(query.loadingDateFrom)
            : undefined,
          loadingDateTo: query.loadingDateTo
            ? new Date(query.loadingDateTo)
            : undefined,
        },
        query.page ?? 1,
        query.limit ?? 20
      )
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get load by ID' })
  @ApiParam({ name: 'id', description: 'Load ID' })
  @ApiResponse({ status: 200, description: 'Load details' })
  @ApiResponse({ status: 404, description: 'Load not found' })
  async getById(@Param('id') id: string) {
    return this.queryBus.execute(new GetLoadQuery(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update load' })
  @ApiParam({ name: 'id', description: 'Load ID' })
  @ApiResponse({ status: 200, description: 'Load updated successfully' })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateLoadDto
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateLoadCommand(
        id,
        user.userId,
        dto.from,
        dto.to,
        dto.transportType,
        dto.loadingTypes,
        dto.cargos,
        dto.features,
        dto.adrClasses,
        dto.temperatureMin,
        dto.temperatureMax,
        dto.price,
        dto.currency,
        dto.paymentTerms,
        dto.loadingDate,
        dto.loadingDateTo,
        dto.unloadingDate,
        dto.boardIds,
        dto.isPublic
      )
    );
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate load (publish to boards)' })
  @ApiParam({ name: 'id', description: 'Load ID' })
  @ApiResponse({ status: 200, description: 'Load activated successfully' })
  @HttpCode(HttpStatus.OK)
  async activate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.commandBus.execute(new ActivateLoadCommand(id, user.userId));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete load' })
  @ApiParam({ name: 'id', description: 'Load ID' })
  @ApiResponse({ status: 204, description: 'Load deleted successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.commandBus.execute(new DeleteLoadCommand(id, user.userId));
  }
}
