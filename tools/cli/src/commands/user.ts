/**
 * User management commands
 */

import { Command } from 'commander';
import { apiClient } from '../api-client';
import {
  success,
  error,
  handleApiError,
  displayTable,
  spinner,
  formatDate,
  prompt,
  promptPassword,
  multiSelect,
  confirm,
} from '../utils';

export function userCommands(program: Command): void {
  const user = program.command('user').description('User management commands');

  user
    .command('list')
    .description('List all users')
    .option('-p, --page <number>', 'Page number', '1')
    .option('-l, --limit <number>', 'Items per page', '10')
    .option('-s, --search <query>', 'Search by email or username')
    .action(async (options) => {
      try {
        const spin = spinner('Fetching users...');
        const result = await apiClient.listUsers({
          page: parseInt(options.page),
          limit: parseInt(options.limit),
          search: options.search,
        });
        spin.succeed(`Found ${result.total} users`);

        if (result.data.length === 0) {
          error('No users found');
          return;
        }

        const headers = [
          'ID',
          'Email',
          'Username',
          'Roles',
          'Active',
          'Created',
        ];
        const rows = result.data.map((u: any) => [
          u.id.substring(0, 8),
          u.email,
          u.username,
          u.roles.join(', '),
          u.isActive ? '✓' : '✗',
          formatDate(u.createdAt),
        ]);

        displayTable(headers, rows);

        console.log(
          `\nPage ${result.page} of ${result.totalPages} (${result.total} total)`
        );
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });

  user
    .command('get <id>')
    .description('Get user details')
    .action(async (id) => {
      try {
        const spin = spinner('Fetching user...');
        const u = await apiClient.getUser(id);
        spin.succeed('User found');

        console.log('\nUser Details:');
        console.log(`  ID:          ${u.id}`);
        console.log(`  Email:       ${u.email}`);
        console.log(`  Username:    ${u.username}`);
        console.log(`  Roles:       ${u.roles.join(', ')}`);
        console.log(`  Active:      ${u.isActive ? 'Yes' : 'No'}`);
        console.log(`  Created:     ${formatDate(u.createdAt)}`);
        console.log(`  Updated:     ${formatDate(u.updatedAt)}`);
        if (u.lastLoginAt) {
          console.log(`  Last Login:  ${formatDate(u.lastLoginAt)}`);
        }
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });

  user
    .command('create')
    .description('Create a new user')
    .option('-e, --email <email>', 'Email address')
    .option('-u, --username <username>', 'Username')
    .option('-p, --password <password>', 'Password')
    .action(async (options) => {
      try {
        let email = options.email;
        let username = options.username;
        let password = options.password;

        // Prompt for missing data
        if (!email) {
          email = await prompt('Email:');
        }
        if (!username) {
          username = await prompt('Username:');
        }
        if (!password) {
          password = await promptPassword('Password:');
        }

        const roles = await multiSelect('Select roles:', [
          'ADMIN',
          'MANAGER',
          'USER',
          'GUEST',
        ]);

        const spin = spinner('Creating user...');
        const user = await apiClient.createUser({
          email,
          username,
          password,
          roles: roles.length > 0 ? roles : ['USER'],
        });
        spin.succeed('User created successfully');

        console.log(`\nUser ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Username: ${user.username}`);
        console.log(`Roles: ${user.roles.join(', ')}`);
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });

  user
    .command('update <id>')
    .description('Update a user')
    .option('-e, --email <email>', 'New email address')
    .option('-u, --username <username>', 'New username')
    .option('--activate', 'Activate user')
    .option('--deactivate', 'Deactivate user')
    .action(async (id, options) => {
      try {
        const data: any = {};

        if (options.email) data.email = options.email;
        if (options.username) data.username = options.username;
        if (options.activate) data.isActive = true;
        if (options.deactivate) data.isActive = false;

        if (Object.keys(data).length === 0) {
          error('No update fields provided');
          return;
        }

        const spin = spinner('Updating user...');
        const user = await apiClient.updateUser(id, data);
        spin.succeed('User updated successfully');

        console.log(`\nUser ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Username: ${user.username}`);
        console.log(`Active: ${user.isActive ? 'Yes' : 'No'}`);
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });

  user
    .command('roles <id>')
    .description('Update user roles')
    .action(async (id) => {
      try {
        const roles = await multiSelect('Select roles:', [
          'ADMIN',
          'MANAGER',
          'USER',
          'GUEST',
        ]);

        if (roles.length === 0) {
          error('At least one role must be selected');
          return;
        }

        const spin = spinner('Updating roles...');
        const user = await apiClient.updateUserRoles(id, roles);
        spin.succeed('Roles updated successfully');

        console.log(`\nUser: ${user.email}`);
        console.log(`Roles: ${user.roles.join(', ')}`);
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });

  user
    .command('delete <id>')
    .description('Delete a user')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
      try {
        if (!options.force) {
          const confirmed = await confirm(
            'Are you sure you want to delete this user?'
          );
          if (!confirmed) {
            console.log('Cancelled');
            return;
          }
        }

        const spin = spinner('Deleting user...');
        await apiClient.deleteUser(id);
        spin.succeed('User deleted successfully');
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });
}
