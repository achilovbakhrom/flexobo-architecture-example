import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import * as path from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Navigate from dist/apps/billing-service/src/ to apps/billing-service/node_modules
const { PrismaClient } = require(path.join(
  __dirname,
  '../../../../apps/billing-service/node_modules/.prisma/billing-client'
));

export const PRISMA_CLIENT = Symbol('PRISMA_CLIENT');

// For backwards compatibility, export PrismaService as an alias
export type PrismaService = InstanceType<typeof PrismaClient>;

@Global()
@Module({
  providers: [
    {
      provide: 'PG_POOL',
      useFactory: () => {
        return new Pool({
          connectionString: process.env['DATABASE_URL'],
<<<<<<< HEAD
          // Connection pool settings for RDS
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
          // Keep connections alive through NAT gateway/load balancer timeouts
          keepAlive: true,
          keepAliveInitialDelayMillis: 10000,
=======
>>>>>>> b52bf1b21edabe00c94bd5ea88572ef807a79f9a
        });
      },
    },
    {
      provide: PRISMA_CLIENT,
      useFactory: async (pool: Pool) => {
        const adapter = new PrismaPg(pool);
        const prisma = new PrismaClient({ adapter });
        await prisma.$connect();
        return prisma;
      },
      inject: ['PG_POOL'],
    },
    {
      provide: 'PrismaService',
      useExisting: PRISMA_CLIENT,
    },
  ],
  exports: [PRISMA_CLIENT, 'PrismaService'],
})
export class PrismaModule implements OnModuleDestroy {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}
