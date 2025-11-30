import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import * as path from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { INVENTORY_READ_MODEL_PRISMA_CLIENT } from './adapters/persistence/prisma-inventory-read-model.repository';

// Navigate from dist/apps/admin-panel/src/ to apps/admin-panel/node_modules
const { PrismaClient } = require(path.join(
  __dirname,
  '../../../../apps/admin-panel/node_modules/.prisma/admin-client'
));

@Global()
@Module({
  providers: [
    {
      provide: 'PG_POOL',
      useFactory: () => {
        // Extract schema from DATABASE_URL (Prisma uses ?schema=xxx which pg doesn't understand)
        const dbUrl = process.env['DATABASE_URL'] || '';
        const schemaMatch = dbUrl.match(/[?&]schema=([^&]+)/);
        const schema = schemaMatch ? schemaMatch[1] : 'public';
        // Remove the schema parameter from the connection string for pg
        const connectionString = dbUrl.replace(/[?&]schema=[^&]+/, '');

        return new Pool({
          connectionString,
          // Set the search_path to use the correct schema
          options: `-c search_path=${schema}`,
        });
      },
    },
    {
      provide: 'PrismaClient',
      useFactory: (pool: Pool) => {
        const adapter = new PrismaPg(pool);
        const prisma = new PrismaClient({ adapter });
        return prisma;
      },
      inject: ['PG_POOL'],
    },
    {
      provide: INVENTORY_READ_MODEL_PRISMA_CLIENT,
      useFactory: (pool: Pool) => {
        const adapter = new PrismaPg(pool);
        const prisma = new PrismaClient({ adapter });
        return prisma;
      },
      inject: ['PG_POOL'],
    },
  ],
  exports: ['PrismaClient', INVENTORY_READ_MODEL_PRISMA_CLIENT],
})
export class PrismaModule implements OnModuleDestroy {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}
