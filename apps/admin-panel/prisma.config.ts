import path from 'path';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

// Load service-specific .env file
dotenv.config({ path: path.join(__dirname, '.env') });

export default defineConfig({
  schema: path.join(__dirname, 'prisma/schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    path: path.join(__dirname, 'prisma/migrations'),
  },
});
