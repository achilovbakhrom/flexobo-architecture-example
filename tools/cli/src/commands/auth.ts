/**
 * Authentication commands
 */

import { Command } from 'commander';
import { apiClient } from '../api-client';
import {
  success,
  error,
  handleApiError,
  prompt,
  promptPassword,
  info,
} from '../utils';

export function authCommands(program: Command): void {
  const auth = program.command('auth').description('Authentication commands');

  auth
    .command('login')
    .description('Login to Flexobo services')
    .option('-e, --email <email>', 'Email address')
    .option('-p, --password <password>', 'Password')
    .action(async (options) => {
      try {
        let email = options.email;
        let password = options.password;

        // Prompt for missing credentials
        if (!email) {
          email = await prompt('Email:');
        }
        if (!password) {
          password = await promptPassword('Password:');
        }

        await apiClient.login(email, password);
        success('Successfully logged in!');

        const tokenData = apiClient.getTokenData();
        if (tokenData) {
          info(
            `Token expires at: ${new Date(
              tokenData.expiresAt
            ).toLocaleString()}`
          );
        }
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });

  auth
    .command('logout')
    .description('Logout from Flexobo services')
    .action(() => {
      apiClient.logout();
      success('Successfully logged out!');
    });

  auth
    .command('status')
    .description('Check authentication status')
    .action(() => {
      if (apiClient.isAuthenticated()) {
        const tokenData = apiClient.getTokenData();
        success('Authenticated');
        if (tokenData) {
          info(
            `Token expires at: ${new Date(
              tokenData.expiresAt
            ).toLocaleString()}`
          );

          const timeLeft = tokenData.expiresAt - Date.now();
          if (timeLeft > 0) {
            const minutes = Math.floor(timeLeft / 60000);
            info(`Time remaining: ${minutes} minutes`);
          } else {
            error('Token has expired. Please login again.');
          }
        }
      } else {
        error('Not authenticated. Please login: flexobo auth login');
        process.exit(1);
      }
    });
}
