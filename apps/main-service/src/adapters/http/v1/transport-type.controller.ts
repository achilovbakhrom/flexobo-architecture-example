import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Delete,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { CommandBus, QueryBus, Result, Success } from '@flexobo/core';

import {
  CreateTransportTypeCommand,
  UpdateTransportTypeCommand,
  DeleteTransportTypeCommand,
} from '../../../application/commands';

import {
  GetTransportTypeByIdQuery,
  GetAllTransportTypesQuery,
} from '../../../application/queries';

import {
  CreateTransportTypeDto,
  UpdateTransportTypeDto,
  convertOldToNewFormat,
  convertNewToOldFormat,
} from '../dto/transport-type.dto';

import { Language } from '../decorators';

@ApiTags('Transport Types')
@ApiBearerAuth()
@Controller('api/transport-types')
export class TransportTypeController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  // GET /all - get all transport types without language filter
  @Get('/all')
  @ApiOperation({ summary: 'Get all transport types (without language filter)' })
  @ApiResponse({ status: 200, description: 'List of all transport types' })
  @ApiHeader({
    name: 'x-language-code',
    description: 'Language code (e.g., en, ru, uz)',
    required: false,
  })
  async getAllTransportTypes(
    @Query() query: Record<string, any>,
    @Language() language?: string
  ) {
    const limit = query.limit ? Number(query.limit) : undefined;
    const offset = query.offset ? Number(query.offset) : undefined;

    const getAllQuery = new GetAllTransportTypesQuery(language, {
      limit,
      offset,
    });

    const result = await this.queryBus.execute<Result<any[], Error>>(getAllQuery);

    if (result.isFailure) {
      throw result.error;
    }

    const transport_types = result.value.map((item) =>
      convertNewToOldFormat(item)
    );

    // Calculate pagination info
    const pagination_info = {
      total: transport_types.length,
      limit: limit || transport_types.length,
      offset: offset || 0,
    };

    return { data: transport_types, pagination: pagination_info };
  }

  // GET / - get transport types with language filter
  @Get('/')
  @ApiOperation({ summary: 'Get transport types with language filter' })
  @ApiResponse({ status: 200, description: 'List of transport types' })
  @ApiHeader({
    name: 'x-language-code',
    description: 'Language code (e.g., en, ru, uz)',
    required: false,
  })
  async getTransportTypes(
    @Query() query: Record<string, any>,
    @Language() language?: string
  ) {
    const limit = query.limit ? Number(query.limit) : undefined;
    const offset = query.offset ? Number(query.offset) : undefined;

    const getQuery = new GetAllTransportTypesQuery(language, {
      limit,
      offset,
    });

    const result = await this.queryBus.execute<Result<any[], Error>>(getQuery);

    if (result.isFailure) {
      throw result.error;
    }

    const transport_types = result.value.map((item) =>
      convertNewToOldFormat(item, language)
    );

    const pagination_info = {
      total: transport_types.length,
      limit: limit || transport_types.length,
      offset: offset || 0,
    };

    return { data: transport_types, pagination: pagination_info };
  }

  // GET /:id - get single transport type by ID
  @Get('/:id')
  @ApiOperation({ summary: 'Get transport type by ID' })
  @ApiResponse({ status: 200, description: 'Transport type details' })
  @ApiResponse({ status: 404, description: 'Transport type not found' })
  @ApiHeader({
    name: 'x-language-code',
    description: 'Language code (e.g., en, ru, uz)',
    required: false,
  })
  async getTransportType(
    @Param('id') id: string,
    @Language() language?: string
  ) {
    const query = new GetTransportTypeByIdQuery(id, language);
    const result = await this.queryBus.execute<Result<any | null, Error>>(query);

    if (result.isFailure) {
      throw result.error;
    }

    if (!result.value) {
      throw new HttpException('Data not found', HttpStatus.NOT_FOUND);
    }

    const data = convertNewToOldFormat(result.value, language);

    return { data };
  }

  // POST / - create new transport type
  @Post('/')
  @ApiOperation({ summary: 'Create a new transport type' })
  @ApiResponse({ status: 201, description: 'Transport type created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiHeader({
    name: 'x-language-code',
    description: 'Language code (e.g., en, ru, uz)',
    required: false,
  })
  async createTransportType(
    @Body() dto: CreateTransportTypeDto,
    @Language() language?: string
  ) {
    // Convert old format to new format
    const convertedData = convertOldToNewFormat(dto);

    const command = new CreateTransportTypeCommand(convertedData);
    const result = await this.commandBus.execute(command);

    if (result.isFailure) {
      throw result.error;
    }

    // Fetch the created transport type to return it
    const createdId = (result as Success<string>).value;
    const query = new GetTransportTypeByIdQuery(createdId, language);
    const createdResult = await this.queryBus.execute<Result<any | null, Error>>(query);

    if (createdResult.isFailure || !createdResult.value) {
      // Fallback response if we can't fetch the created item
      return {
        data: {
          _id: createdId,
          name: Object.values(dto.name)[0],
          is_active: dto.is_active ?? true,
          created_at: new Date(),
        },
      };
    }

    const data = convertNewToOldFormat(createdResult.value, language);
    return { data };
  }

  // PUT /:id - update transport type
  @Put('/:id')
  @ApiOperation({ summary: 'Update transport type' })
  @ApiResponse({ status: 200, description: 'Transport type updated successfully' })
  @ApiResponse({ status: 404, description: 'Transport type not found' })
  @ApiHeader({
    name: 'x-language-code',
    description: 'Language code (e.g., en, ru, uz)',
    required: false,
  })
  async updateTransportType(
    @Param('id') id: string,
    @Body() dto: UpdateTransportTypeDto,
    @Language() language?: string
  ) {
    // Convert old format to new format
    const convertedData = convertOldToNewFormat(dto);

    const command = new UpdateTransportTypeCommand(id, {
      isActive: convertedData.isActive,
    });

    const result = await this.commandBus.execute<Result<boolean, Error>>(command);

    if (result.isFailure) {
      throw result.error;
    }

    // If name or description is provided, update translations
    if (dto.name || dto.description) {
      // Note: This would need additional commands to update translations
      // For now, we'll just return the updated transport type
    }

    // Fetch the updated transport type
    const query = new GetTransportTypeByIdQuery(id, language);
    const updatedResult = await this.queryBus.execute<Result<any | null, Error>>(query);

    if (updatedResult.isFailure || !updatedResult.value) {
      throw new HttpException('Data not found', HttpStatus.NOT_FOUND);
    }

    const data = convertNewToOldFormat(updatedResult.value, language);
    return { data };
  }

  // DELETE /:id - delete transport type
  @Delete('/:id')
  @ApiOperation({ summary: 'Delete transport type' })
  @ApiResponse({ status: 200, description: 'Transport type deleted successfully' })
  @ApiResponse({ status: 404, description: 'Transport type not found' })
  @ApiHeader({
    name: 'x-language-code',
    description: 'Language code (e.g., en, ru, uz)',
    required: false,
  })
  async deleteTransportType(
    @Param('id') id: string,
    @Language() language?: string
  ) {
    // First fetch the transport type to return it
    const query = new GetTransportTypeByIdQuery(id, language);
    const fetchResult = await this.queryBus.execute<Result<any | null, Error>>(query);

    if (fetchResult.isFailure || !fetchResult.value) {
      throw new HttpException('Data not found', HttpStatus.NOT_FOUND);
    }

    const dataToReturn = convertNewToOldFormat(fetchResult.value, language);

    // Now delete it
    const command = new DeleteTransportTypeCommand(id);
    const result = await this.commandBus.execute<Result<boolean, Error>>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return { data: dataToReturn };
  }
}
