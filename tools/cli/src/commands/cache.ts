/**
 * Cache management commands
 */

import { Command } from 'commander';
import { apiClient } from '../api-client';
import {
  success,
  handleApiError,
  displayTable,
  spinner,
  formatDate,
  confirm,
} from '../utils';

export function cacheCommands(program: Command): void {
  const cache = program
    .command('cache')
    .description('Cache management commands');

  cache
    .command('list')
    .description('List cache entries')
    .action(async () => {
      try {
        const spin = spinner('Fetching cache entries...');
        const entries = await apiClient.listCacheEntries();
        spin.succeed(`Found ${entries.length} cache entries`);

        if (entries.length === 0) {
          console.log('No cache entries found');
          return;
        }

        const headers = ['Key', 'TTL (s)', 'Created'];
        const rows = entries.map((e: any) => [
          e.key,
          e.ttl.toString(),
          formatDate(e.createdAt),
        ]);

        displayTable(headers, rows);
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });

  cache
    .command('invalidate <key>')
    .description('Invalidate a cache entry')
    .option('-f, --force', 'Skip confirmation')
    .action(async (key, options) => {
      try {
        if (!options.force) {
          const confirmed = await confirm(
            `Are you sure you want to invalidate cache key: ${key}?`
          );
          if (!confirmed) {
            console.log('Cancelled');
            return;
          }
        }

        const spin = spinner('Invalidating cache entry...');
        await apiClient.invalidateCache(key);
        spin.succeed('Cache entry invalidated successfully');
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });

  cache
    .command('clear')
    .description('Clear all cache entries')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options) => {
      try {
        if (!options.force) {
          const confirmed = await confirm(
            'Are you sure you want to clear ALL cache entries?'
          );
          if (!confirmed) {
            console.log('Cancelled');
            return;
          }
        }

        const spin = spinner('Clearing all cache...');
        await apiClient.invalidateAllCache();
        spin.succeed('All cache entries cleared successfully');
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });
}
