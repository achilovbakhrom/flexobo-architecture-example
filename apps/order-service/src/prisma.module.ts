import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import * as path from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Navigate from dist/apps/order-service/src/ to apps/order-service/node_modules
const { PrismaClient } = require(path.join(
  __dirname,
  '../../../../apps/order-service/node_modules/.prisma/order-client'
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
  ],
  exports: ['PrismaClient'],
})
export class PrismaModule implements OnModuleDestroy {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}
