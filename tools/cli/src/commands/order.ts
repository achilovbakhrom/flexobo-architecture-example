/**
 * Order management commands
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
  confirm,
} from '../utils';

export function orderCommands(program: Command): void {
  const order = program
    .command('order')
    .description('Order management commands');

  order
    .command('list')
    .description('List all orders')
    .option('-p, --page <number>', 'Page number', '1')
    .option('-l, --limit <number>', 'Items per page', '10')
    .action(async (options) => {
      try {
        const spin = spinner('Fetching orders...');
        const result = await apiClient.listOrders({
          page: parseInt(options.page),
          limit: parseInt(options.limit),
        });
        spin.succeed(`Found ${result.total} orders`);

        if (result.data.length === 0) {
          error('No orders found');
          return;
        }

        const headers = ['ID', 'Status', 'Items', 'Total', 'Created'];
        const rows = result.data.map((o: any) => [
          o.id.substring(0, 8),
          o.status,
          o.items.length,
          `$${o.totalAmount.toFixed(2)}`,
          formatDate(o.createdAt),
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

  order
    .command('get <id>')
    .description('Get order details')
    .action(async (id) => {
      try {
        const spin = spinner('Fetching order...');
        const o = await apiClient.getOrder(id);
        spin.succeed('Order found');

        console.log('\nOrder Details:');
        console.log(`  ID:         ${o.id}`);
        console.log(`  Status:     ${o.status}`);
        console.log(`  Total:      $${o.totalAmount.toFixed(2)}`);
        console.log(`  Created:    ${formatDate(o.createdAt)}`);
        console.log(`  Updated:    ${formatDate(o.updatedAt)}`);

        if (o.items && o.items.length > 0) {
          console.log('\n  Items:');
          o.items.forEach((item: any, index: number) => {
            console.log(
              `    ${index + 1}. ${item.productName} x${
                item.quantity
              } - $${item.price.toFixed(2)}`
            );
          });
        }

        if (o.shippingAddress) {
          console.log('\n  Shipping Address:');
          console.log(`    ${o.shippingAddress.street}`);
          console.log(
            `    ${o.shippingAddress.city}, ${o.shippingAddress.state} ${o.shippingAddress.zipCode}`
          );
          console.log(`    ${o.shippingAddress.country}`);
        }
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });

  order
    .command('create')
    .description('Create a new order')
    .requiredOption('-i, --items <items>', 'Items as JSON string')
    .option('-a, --address <address>', 'Shipping address as JSON string')
    .action(async (options) => {
      try {
        const items = JSON.parse(options.items);
        const address = options.address
          ? JSON.parse(options.address)
          : undefined;

        const spin = spinner('Creating order...');
        const order = await apiClient.createOrder({
          items,
          shippingAddress: address,
        });
        spin.succeed('Order created successfully');

        console.log(`\nOrder ID: ${order.id}`);
        console.log(`Status: ${order.status}`);
        console.log(`Total: $${order.totalAmount.toFixed(2)}`);
      } catch (err) {
        if (err instanceof SyntaxError) {
          error('Invalid JSON format');
        } else {
          handleApiError(err);
        }
        process.exit(1);
      }
    });

  order
    .command('cancel <id>')
    .description('Cancel an order')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
      try {
        if (!options.force) {
          const confirmed = await confirm(
            'Are you sure you want to cancel this order?'
          );
          if (!confirmed) {
            console.log('Cancelled');
            return;
          }
        }

        const spin = spinner('Cancelling order...');
        const order = await apiClient.cancelOrder(id);
        spin.succeed('Order cancelled successfully');

        console.log(`\nOrder ID: ${order.id}`);
        console.log(`Status: ${order.status}`);
      } catch (err) {
        handleApiError(err);
        process.exit(1);
      }
    });
}
