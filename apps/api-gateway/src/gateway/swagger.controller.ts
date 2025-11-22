/**
 * Swagger Controller
 * Serves aggregated Swagger documentation
 */

import { Controller, Get, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { SwaggerAggregatorService } from './swagger-aggregator.service';

@Controller()
export class SwaggerController {
  private readonly logger = new Logger(SwaggerController.name);

  constructor(private readonly swaggerAggregator: SwaggerAggregatorService) {}

  @Get('api/docs-json')
  async getSwaggerJson(@Res() res: Response): Promise<void> {
    this.logger.log('===== SwaggerController.getSwaggerJson CALLED =====');
    try {
      const spec = await this.swaggerAggregator.aggregateSpecs();
      this.logger.log(
        `Aggregated spec paths count: ${Object.keys(spec.paths).length}`
      );
      this.logger.log(
        `Aggregated spec servers: ${JSON.stringify(spec.servers)}`
      );
      res.json(spec);
    } catch (error) {
      this.logger.error('Error aggregating specs:', error);
      res.status(500).json({
        error: 'Failed to aggregate Swagger specs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
