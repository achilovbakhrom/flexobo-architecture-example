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
  HttpStatus,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CreateSavedSearchDto, UpdateSavedSearchDto, SavedSearchTypeDto } from '../dto/saved-search.dto';
import {
  CreateSavedSearchCommand,
  UpdateSavedSearchCommand,
  DeleteSavedSearchCommand,
} from '../../../application/commands/saved-search';
import {
  GetSavedSearchQuery,
  ListSavedSearchesQuery,
} from '../../../application/queries/saved-search';

interface JwtPayload {
  user: string;
  role: string;
}

@ApiTags('Saved Searches')
@ApiBearerAuth()
@Controller('api/v1/saved-searches')
@UseGuards(JwtAuthGuard)
export class SavedSearchController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a saved search' })
  @ApiResponse({ status: 201, description: 'Saved search created successfully' })
  async createSavedSearch(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSavedSearchDto
  ) {
    const searchId = await this.commandBus.execute(
      new CreateSavedSearchCommand(
        user.user,
        dto.name,
        dto.searchType,
        dto.filters,
        dto.notifyOnNew ?? false
      )
    );

    return {
      id: searchId,
      message: 'Saved search created successfully',
    };
  }

  @Get()
  @ApiOperation({ summary: 'List saved searches for current user' })
  @ApiQuery({ name: 'searchType', required: false, enum: SavedSearchTypeDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of saved searches' })
  async listSavedSearches(
    @CurrentUser() user: JwtPayload,
    @Query('searchType') searchType?: SavedSearchTypeDto,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.queryBus.execute(
      new ListSavedSearchesQuery(
        user.user,
        searchType,
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 20
      )
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a saved search by ID' })
  @ApiResponse({ status: 200, description: 'Saved search details' })
  @ApiResponse({ status: 404, description: 'Saved search not found' })
  async getSavedSearch(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string
  ) {
    const search = await this.queryBus.execute(
      new GetSavedSearchQuery(id, user.user)
    );

    if (!search) {
      throw new NotFoundException('Saved search not found');
    }

    return search;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a saved search' })
  @ApiResponse({ status: 200, description: 'Saved search updated successfully' })
  @ApiResponse({ status: 404, description: 'Saved search not found' })
  async updateSavedSearch(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSavedSearchDto
  ) {
    await this.commandBus.execute(
      new UpdateSavedSearchCommand(
        id,
        user.user,
        dto.name,
        dto.filters,
        dto.notifyOnNew
      )
    );

    return {
      message: 'Saved search updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved search' })
  @ApiResponse({ status: 204, description: 'Saved search deleted successfully' })
  @ApiResponse({ status: 404, description: 'Saved search not found' })
  async deleteSavedSearch(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string
  ) {
    await this.commandBus.execute(
      new DeleteSavedSearchCommand(id, user.user)
    );
  }
}
