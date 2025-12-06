import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  GetDashboardStatsQuery,
  GetMarketStatsQuery,
  GetRouteAnalyticsQuery,
} from '../../../application/queries/statistics';

interface JwtPayload {
  user: string;
  role: string;
}

@ApiTags('Statistics')
@Controller('api/v1/statistics')
export class StatisticsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard statistics for the current user' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getDashboardStats(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string
  ) {
    return this.queryBus.execute(
      new GetDashboardStatsQuery(user.user, companyId)
    );
  }

  @Get('market')
  @ApiOperation({ summary: 'Get market overview statistics (public)' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month'], description: 'Time period' })
  @ApiResponse({ status: 200, description: 'Market statistics' })
  async getMarketStats(
    @Query('period') period?: 'day' | 'week' | 'month'
  ) {
    return this.queryBus.execute(
      new GetMarketStatsQuery(period || 'week')
    );
  }

  @Get('routes')
  @ApiOperation({ summary: 'Get route analytics (public)' })
  @ApiQuery({ name: 'fromCountry', required: false, description: 'Filter by origin country' })
  @ApiQuery({ name: 'toCountry', required: false, description: 'Filter by destination country' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter'], description: 'Time period' })
  @ApiResponse({ status: 200, description: 'Route analytics' })
  async getRouteAnalytics(
    @Query('fromCountry') fromCountry?: string,
    @Query('toCountry') toCountry?: string,
    @Query('period') period?: 'week' | 'month' | 'quarter'
  ) {
    return this.queryBus.execute(
      new GetRouteAnalyticsQuery(fromCountry, toCountry, period || 'month')
    );
  }
}
