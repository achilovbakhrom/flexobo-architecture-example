#!/usr/bin/env node

/**
 * Flexobo CLI - Command-line tools for microservices management
 */

import { Command } from 'commander';
import { userCommands } from './commands/user';
import { orderCommands } from './commands/order';
import { cacheCommands } from './commands/cache';
import { eventCommands } from './commands/event';
import { healthCommands } from './commands/health';
import { authCommands } from './commands/auth';

const program = new Command();

program
  .name('flexobo')
  .description('CLI tools for Flexobo microservices management')
  .version('1.0.0');

// Register command groups
authCommands(program);
userCommands(program);
orderCommands(program);
cacheCommands(program);
eventCommands(program);
healthCommands(program);

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
