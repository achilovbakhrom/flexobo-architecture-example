/**
 * Event management commands
 */

import { Command } from 'commander';
import { apiClient } from '../api-client';
import { success, handleApiError, displayTable, spinner } from '../utils';

export function eventCommands(program: Command): void {
  const event = program
    .command('event')
    .description('Event management commands');

  event
    .command('stats')
    .description('Get event statistics')
    .action(async () => {
      try {
        const spin = spinner('Fetching event statistics...');
        const stats = await apiClient.getEventStatistics();
        spin.succeed('Event statistics retrieved');

        console.log('\nEvent Statistics:');
        console.log(`  Total Events:          ${stats.totalEvents}`);
        console.log(`  Events (Last 24h):     ${stats.eventsLast24h}`);
        console.log(`  Events (Last 7d):      ${stats.eventsLast7d}`);
        console.log(
          `  Avg Processing Time:   ${stats.averageProcessingTime.toFixed(2)}ms`
        );

        if (stats.eventsByType && Object.keys(stats.eventsByType).length > 0) {
          console.log('\nEvents by Type:');
          const headers = ['Event Type', 'Count'];
          const rows = Object.entries(stats.eventsByType).map(
            ([type, count]) => [type, count.toString()]
          );
          displayTable(headers, rows);
        }
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });
}
