import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import * as path from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Navigate from dist/apps/notification-service/src/ to apps/notification-service/node_modules
const { PrismaClient } = require(path.join(
  __dirname,
  '../../../../apps/notification-service/node_modules/.prisma/notification-client'
));

export const PRISMA_CLIENT = Symbol('PRISMA_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: 'PG_POOL',
      useFactory: () => {
        return new Pool({
          connectionString: process.env['DATABASE_URL'],
        });
      },
    },
    {
      provide: PRISMA_CLIENT,
      useFactory: (pool: Pool) => {
        const adapter = new PrismaPg(pool);
        const prisma = new PrismaClient({ adapter });
        return prisma;
      },
      inject: ['PG_POOL'],
    },
  ],
  exports: [PRISMA_CLIENT],
})
export class PrismaModule implements OnModuleDestroy {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}
