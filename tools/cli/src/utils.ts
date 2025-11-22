/**
 * Utility functions for CLI
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { table } from 'table';
import { AxiosError } from 'axios';

/**
 * Format and display success message
 */
export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * Format and display error message
 */
export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

/**
 * Format and display warning message
 */
export function warning(message: string): void {
  console.warn(chalk.yellow('⚠'), message);
}

/**
 * Format and display info message
 */
export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Create a spinner
 */
export function spinner(text: string): Ora {
  return ora(text).start();
}

/**
 * Display a table
 */
export function displayTable(headers: string[], rows: string[][]): void {
  const data = [headers.map((h) => chalk.bold(h)), ...rows];
  console.log(table(data));
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Format bytes to readable string
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Handle API errors
 */
export function handleApiError(err: unknown): void {
  if (err instanceof AxiosError) {
    if (err.response) {
      const status = err.response.status;
      const message = err.response.data?.message || err.message;

      if (status === 401) {
        error(
          'Authentication required. Please login first: flexobo auth login'
        );
      } else if (status === 403) {
        error('Insufficient permissions. Admin role required.');
      } else if (status === 404) {
        error(`Not found: ${message}`);
      } else {
        error(`API Error (${status}): ${message}`);
      }
    } else if (err.request) {
      error('Network error: Unable to reach the API server');
      info('Make sure the services are running:');
      info('  - API Gateway: http://localhost:3001');
      info('  - Admin Panel: http://localhost:3002');
    } else {
      error(`Error: ${err.message}`);
    }
  } else if (err instanceof Error) {
    error(`Error: ${err.message}`);
  } else {
    error('An unknown error occurred');
  }
}

/**
 * Confirm action
 */
export async function confirm(message: string): Promise<boolean> {
  const inquirer = await import('inquirer');
  const { confirmed } = await inquirer.default.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: false,
    },
  ]);
  return confirmed;
}

/**
 * Prompt for input
 */
export async function prompt(
  message: string,
  defaultValue?: string
): Promise<string> {
  const inquirer = await import('inquirer');
  const { value } = await inquirer.default.prompt([
    {
      type: 'input',
      name: 'value',
      message,
      default: defaultValue,
    },
  ]);
  return value;
}

/**
 * Prompt for password
 */
export async function promptPassword(message: string): Promise<string> {
  const inquirer = await import('inquirer');
  const { password } = await inquirer.default.prompt([
    {
      type: 'password',
      name: 'password',
      message,
      mask: '*',
    },
  ]);
  return password;
}

/**
 * Select from list
 */
export async function select(
  message: string,
  choices: string[]
): Promise<string> {
  const inquirer = await import('inquirer');
  const { selected } = await inquirer.default.prompt([
    {
      type: 'list',
      name: 'selected',
      message,
      choices,
    },
  ]);
  return selected;
}

/**
 * Multi-select from list
 */
export async function multiSelect(
  message: string,
  choices: string[]
): Promise<string[]> {
  const inquirer = await import('inquirer');
  const { selected } = await inquirer.default.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message,
      choices,
    },
  ]);
  return selected;
}
