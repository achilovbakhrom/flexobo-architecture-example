/**
 * Environment Variables Validation Schema
 * Uses class-validator to ensure required env vars are present
 */

import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsUrl,
  IsOptional,
  validateSync,
  Min,
  Max,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  // @IsNumber()
  // @Min(1024)
  // @Max(65535)
  @IsOptional()
  API_GATEWAY_PORT = 3002;

  @IsString()
  @IsOptional()
  CORS_ORIGIN = '*';

  @IsUrl({ require_tld: false })
  @IsOptional()
  ORDER_SERVICE_URL = 'http://localhost:3000';

  @IsUrl({ require_tld: false })
  @IsOptional()
  ADMIN_PANEL_URL = 'http://localhost:3002';

  @IsUrl({ require_tld: false })
  @IsOptional()
  GATEWAY_SERVICE_URL?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  OTEL_TRACE_ENDPOINT = 'http://localhost:4318/v1/traces';

  @IsUrl({ require_tld: false })
  @IsOptional()
  OTEL_METRICS_ENDPOINT = 'http://localhost:4318/v1/metrics';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
