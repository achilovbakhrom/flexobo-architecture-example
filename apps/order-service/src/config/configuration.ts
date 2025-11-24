/**
 * Order Service Configuration
 * Typed configuration with validation
 */

import { registerAs } from '@nestjs/config';

export interface OrderServiceConfig {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  rabbitmq: {
    url: string;
  };
}

export default registerAs(
  'orderService',
  (): OrderServiceConfig => ({
    port: parseInt(process.env.ORDER_SERVICE_PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/order_service',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    rabbitmq: {
      url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    },
  })
);
