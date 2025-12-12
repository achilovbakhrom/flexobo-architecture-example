import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import * as path from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Navigate from dist/apps/main-service/src/ to apps/main-service/node_modules
const { PrismaClient } = require(path.join(
  __dirname,
  '../../../../apps/main-service/node_modules/.prisma/main-service-client'
));

@Global()
@Module({
  providers: [
    {
      provide: 'PG_POOL',
      useFactory: () => {
        return new Pool({
          connectionString: process.env['DATABASE_URL'],
          // Connection pool settings for RDS
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
          // Keep connections alive through NAT gateway/load balancer timeouts
          keepAlive: true,
          keepAliveInitialDelayMillis: 10000,
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
