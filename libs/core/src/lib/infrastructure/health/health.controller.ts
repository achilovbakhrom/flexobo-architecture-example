/**
 * Health check controller
 */

import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';
import { HealthStatus } from './health.types';

/**
 * Standard health check endpoints
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Liveness probe
   * Returns 200 if application is running (even if dependencies are down)
   * Kubernetes uses this to restart crashed pods
   */
  @Get('live')
  async liveness(@Res() response: Response): Promise<void> {
    const isHealthy = await this.healthService.isHealthy();

    const statusCode = isHealthy
      ? HttpStatus.OK
      : HttpStatus.SERVICE_UNAVAILABLE;

    response.status(statusCode).json({
      status: isHealthy ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Readiness probe
   * Returns 200 only if application AND dependencies are ready
   * Kubernetes uses this to route traffic to the pod
   */
  @Get('ready')
  async readiness(@Res() response: Response): Promise<void> {
    const isReady = await this.healthService.isReady();

    const statusCode = isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    response.status(statusCode).json({
      status: isReady ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Full health check with detailed information
   */
  @Get()
  async health(@Res() response: Response): Promise<void> {
    const healthCheck = await this.healthService.check();

    const statusCode = this.mapStatusToHttpCode(healthCheck.status);

    response.status(statusCode).json(healthCheck);
  }

  /**
   * Map health status to HTTP status code
   */
  private mapStatusToHttpCode(status: HealthStatus): number {
    switch (status) {
      case HealthStatus.UP:
        return HttpStatus.OK;
      case HealthStatus.DEGRADED:
        return HttpStatus.OK; // Still operational
      case HealthStatus.DOWN:
        return HttpStatus.SERVICE_UNAVAILABLE;
      case HealthStatus.UNKNOWN:
        return HttpStatus.SERVICE_UNAVAILABLE;
      default:
        return HttpStatus.SERVICE_UNAVAILABLE;
    }
  }
}
