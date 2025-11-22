/**
 * Message queue health indicator
 */

import { BaseHealthIndicator } from '../health-indicator.base';
import {
  HealthIndicatorResult,
  MessageQueueHealthOptions,
  HealthCheckConfig,
  HealthStatus,
} from '../health.types';

/**
 * RabbitMQ health indicator
 */
export class RabbitMQHealthIndicator extends BaseHealthIndicator {
  constructor(
    private readonly checkConnection: () => Promise<boolean>,
    private readonly getQueueStats?: (queue: string) => Promise<{
      messageCount: number;
      consumerCount: number;
    }>,
    private readonly options: MessageQueueHealthOptions = {},
    config?: HealthCheckConfig
  ) {
    super('rabbitmq', config);
  }

  protected async performCheck(): Promise<HealthIndicatorResult> {
    try {
      const isConnected = await this.checkConnection();

      if (!isConnected) {
        return this.down('RabbitMQ connection failed');
      }

      const details: Record<string, unknown> = {
        connected: true,
      };

      // Check specific queues if requested
      if (this.options.checkQueues && this.getQueueStats) {
        const queueStats: Record<string, unknown> = {};
        let hasIssues = false;

        for (const queueName of this.options.checkQueues) {
          try {
            const stats = await this.getQueueStats(queueName);
            queueStats[queueName] = stats;

            // Check if queue has consumers
            if (stats.consumerCount === 0) {
              hasIssues = true;
            }
          } catch (error) {
            queueStats[queueName] = {
              error: error instanceof Error ? error.message : String(error),
            };
            hasIssues = true;
          }
        }

        details['queues'] = queueStats;

        if (hasIssues) {
          return this.degraded(
            'RabbitMQ is connected but some queues have issues',
            details
          );
        }
      }

      return this.up('RabbitMQ is healthy', details);
    } catch (error) {
      return this.down(
        `RabbitMQ check failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

/**
 * Kafka health indicator
 */
export class KafkaHealthIndicator extends BaseHealthIndicator {
  constructor(
    private readonly checkConnection: () => Promise<boolean>,
    private readonly getTopics?: () => Promise<string[]>,
    config?: HealthCheckConfig
  ) {
    super('kafka', config);
  }

  protected async performCheck(): Promise<HealthIndicatorResult> {
    try {
      const isConnected = await this.checkConnection();

      if (!isConnected) {
        return this.down('Kafka connection failed');
      }

      const details: Record<string, unknown> = {
        connected: true,
      };

      // Get topics if available
      if (this.getTopics) {
        try {
          const topics = await this.getTopics();
          details['topicCount'] = topics.length;
        } catch (error) {
          return {
            status: HealthStatus.DEGRADED,
            message: 'Kafka is connected but cannot retrieve topics',
            details: {
              ...details,
              error: error instanceof Error ? error.message : String(error),
            },
            timestamp: new Date(),
          };
        }
      }

      return this.up('Kafka is healthy', details);
    } catch (error) {
      return this.down(
        `Kafka check failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
