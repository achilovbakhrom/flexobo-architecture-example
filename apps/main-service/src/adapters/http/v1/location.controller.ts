import {
  Controller,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { QueryBus } from '@flexobo/core';
import {
  AutocompleteLocationQuery,
  SearchLocationQuery,
  GetLocationByIdQuery,
} from '../../../application/queries/location';

@ApiTags('Locations')
@Controller('v1/locations')
export class LocationController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('autocomplete')
  @ApiOperation({ summary: 'Autocomplete location search (public)' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'lang', required: false, description: 'Language code (uz, ru, en)', example: 'en' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum results', example: 10 })
  @ApiResponse({ status: 200, description: 'List of location suggestions' })
  async autocomplete(
    @Query('q') query: string,
    @Query('lang') lang?: string,
    @Query('limit') limit?: number
  ) {
    return this.queryBus.execute(
      new AutocompleteLocationQuery(query, lang || 'en', limit || 10)
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search locations with more details (public)' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'country', required: false, description: 'Filter by country code' })
  @ApiQuery({ name: 'type', required: false, description: 'Location type (city, country, region)', enum: ['city', 'country', 'region'] })
  @ApiQuery({ name: 'lang', required: false, description: 'Language code' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum results' })
  @ApiResponse({ status: 200, description: 'List of locations' })
  async search(
    @Query('q') query: string,
    @Query('country') country?: string,
    @Query('type') type?: 'city' | 'country' | 'region',
    @Query('lang') lang?: string,
    @Query('limit') limit?: number
  ) {
    return this.queryBus.execute(
      new SearchLocationQuery(query, country, type, lang || 'en', limit || 20)
    );
  }

  @Get(':osmId')
  @ApiOperation({ summary: 'Get location by OSM ID (public)' })
  @ApiParam({ name: 'osmId', description: 'OpenStreetMap ID' })
  @ApiQuery({ name: 'lang', required: false, description: 'Language code' })
  @ApiResponse({ status: 200, description: 'Location details' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async getByOsmId(
    @Param('osmId') osmId: string,
    @Query('lang') lang?: string
  ) {
    return this.queryBus.execute(
      new GetLocationByIdQuery(osmId, lang || 'en')
    );
  }
}
