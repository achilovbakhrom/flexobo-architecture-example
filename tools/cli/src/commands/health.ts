/**
 * Health check commands
 */

import { Command } from 'commander';
import { apiClient } from '../api-client';
import {
  success,
  error,
  handleApiError,
  displayTable,
  spinner,
  formatDuration,
  formatBytes,
  formatPercentage,
  formatDate,
} from '../utils';
import chalk from 'chalk';

export function healthCommands(program: Command): void {
  const health = program.command('health').description('Health check commands');

  health
    .command('check')
    .description('Check health of all services')
    .action(async () => {
      try {
        const spin = spinner('Checking service health...');
        const services = await apiClient.getServiceHealth();
        spin.succeed('Health check completed');

        const headers = [
          'Service',
          'Status',
          'Uptime',
          'Response Time',
          'Error Rate',
        ];
        const rows = services.map((s: any) => {
          const statusColor =
            s.status === 'healthy'
              ? chalk.green
              : s.status === 'degraded'
              ? chalk.yellow
              : chalk.red;

          return [
            s.name,
            statusColor(s.status),
            formatDuration(s.uptime),
            `${s.responseTime}ms`,
            formatPercentage(s.errorRate),
          ];
        });

        displayTable(headers, rows);

        // Overall status
        const allHealthy = services.every((s: any) => s.status === 'healthy');
        const anyDegraded = services.some((s: any) => s.status === 'degraded');
        const anyDown = services.some((s: any) => s.status === 'down');

        console.log();
        if (allHealthy) {
          success('All services are healthy');
        } else if (anyDown) {
          error('Some services are down');
        } else if (anyDegraded) {
          console.log(chalk.yellow('⚠'), 'Some services are degraded');
        }
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });

  health
    .command('metrics')
    .description('Get system metrics')
    .action(async () => {
      try {
        const spin = spinner('Fetching system metrics...');
        const metrics = await apiClient.getSystemMetrics();
        spin.succeed('Metrics retrieved');

        console.log('\n=== System Metrics ===');
        console.log(`Timestamp: ${formatDate(metrics.timestamp)}\n`);

        // Services
        console.log('Services:');
        const serviceHeaders = ['Service', 'Status', 'Uptime', 'Response Time'];
        const serviceRows = metrics.services.map((s: any) => {
          const statusColor =
            s.status === 'healthy'
              ? chalk.green
              : s.status === 'degraded'
              ? chalk.yellow
              : chalk.red;

          return [
            s.name,
            statusColor(s.status),
            formatDuration(s.uptime),
            `${s.responseTime}ms`,
          ];
        });
        displayTable(serviceHeaders, serviceRows);

        // Events
        console.log('\nEvent Statistics:');
        console.log(`  Total Events:          ${metrics.events.totalEvents}`);
        console.log(`  Events (Last 24h):     ${metrics.events.eventsLast24h}`);
        console.log(`  Events (Last 7d):      ${metrics.events.eventsLast7d}`);
        console.log(
          `  Avg Processing Time:   ${metrics.events.averageProcessingTime.toFixed(
            2
          )}ms`
        );

        // Cache
        console.log('\nCache Statistics:');
        console.log(`  Total Keys:      ${metrics.cache.totalKeys}`);
        console.log(
          `  Hit Rate:        ${formatPercentage(metrics.cache.hitRate)}`
        );
        console.log(
          `  Miss Rate:       ${formatPercentage(metrics.cache.missRate)}`
        );
        console.log(
          `  Memory Usage:    ${formatBytes(metrics.cache.memoryUsage)}`
        );
        console.log(`  Evictions:       ${metrics.cache.evictions}`);
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });
}
