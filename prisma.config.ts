import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';
import * as path from 'path';

// Dynamically determine .env path from schema argument
const schemaArg = process.argv.find((arg) => arg.includes('--schema='));
let envPath = '.env'; // default

if (schemaArg) {
  // Extract app name from path like "apps/order-service/prisma/schema.prisma"
  const match = schemaArg.match(/apps\/([^/]+)\//);
  if (match) {
    const appName = match[1];
    envPath = `apps/${appName}/.env`;
  }
}

config({ path: path.resolve(process.cwd(), envPath) });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  engine: 'classic',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
