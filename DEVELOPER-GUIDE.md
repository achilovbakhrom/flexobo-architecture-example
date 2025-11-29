# Developer Guide

## Quick Start

```bash
# Install dependencies
yarn install

# Start infrastructure (shared RabbitMQ)
cd infrastructure && docker-compose up -d && cd ..

# Start order-service infrastructure (PostgreSQL, Redis)
cd apps/order-service && docker-compose up -d && cd ../..

# Run migrations
yarn db:migration:apply:order

# Start service
yarn start:order
```

**Services:**
| Service | Port | URL |
|---------|------|-----|
| Order Service | 3000 | http://localhost:3000/api |
| API Gateway | 3001 | http://localhost:3001/api |
| Admin Panel | 3002 | http://localhost:3002/api |
| Swagger UI | 3001 | http://localhost:3001/api/docs |
| RabbitMQ Management | 15672 | http://localhost:15672 |

---

## Architecture

### Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 22 |
| Framework | NestJS |
| Language | TypeScript (strict) |
| Database | PostgreSQL + Prisma |
| Cache | Redis |
| Message Queue | RabbitMQ |
| Monorepo | Nx |
| Observability | OpenTelemetry |

### Project Structure

```
apps/
├── order-service/
│   ├── prisma/              # Database schema and migrations
│   └── src/
│       ├── domain/          # Aggregates, entities, events
│       ├── application/     # Commands, queries, use-cases
│       ├── adapters/        # Infrastructure implementations
│       │   ├── http/        # REST controllers
│       │   ├── persistence/ # Repositories
│       │   ├── eventbus/    # Event handlers and projections
│       │   └── messaging/   # External message handlers
│       └── ports/           # Repository interfaces
├── api-gateway/
└── admin-panel/

libs/
├── core/                    # CQRS, event sourcing, messaging
└── shared-kernel/           # Event contracts, value objects

infrastructure/
└── docker-compose.yml       # Shared RabbitMQ, Infisical
```

### Patterns

- **Event Sourcing** - All state changes stored as events
- **CQRS** - Separate command and query models
- **Hexagonal Architecture** - Ports and adapters
- **Outbox Pattern** - Reliable event publishing
- **Projections** - Event handlers that update read models
- **Shared Kernel** - Cross-service event contracts

---

## Shared Kernel

The `@flexobo/shared-kernel` library contains contracts shared across microservices.

### Event Contracts

```typescript
import { EVENT_TYPES, ROUTING_KEYS, EXCHANGES } from '@flexobo/shared-kernel';

// Domain event types (for event sourcing)
EVENT_TYPES.ORDER.CREATED    // 'OrderCreated'
EVENT_TYPES.PAYMENT.COMPLETED // 'PaymentCompleted'

// Routing keys (for RabbitMQ subscriptions)
ROUTING_KEYS.ORDER.CREATED   // 'order.created'
ROUTING_KEYS.ORDER.ALL       // 'order.*'

// Exchange names
EXCHANGES.EVENTS             // 'flexobo.events'
```

### When to Use

- **Listening to events from another service** - Import `ROUTING_KEYS` and `EVENT_TYPES`
- **Publishing events** - Events are published automatically via outbox, use `EVENT_TYPES` in aggregates

### Service-Specific Queues

Each service defines its own queue names locally (not shared):

```typescript
// apps/order-service/src/domain/events/event.constants.ts
export const QUEUES = {
  ORDER: {
    PROJECTION: 'order-service.order-projection',
    HANDLER: 'order-service.on-order-events',
  },
  // ...
} as const;
```

---

## Development

### Run Services

```bash
yarn start              # All services
yarn start:order        # Order service only
yarn start:gateway      # Gateway only
yarn start:admin        # Admin only
yarn stop               # Stop all services
```

### Build & Test

```bash
yarn build              # Build all
yarn test               # Test all
yarn lint               # Lint all
```

### Infrastructure

```bash
# Shared infrastructure (RabbitMQ)
cd infrastructure && docker-compose up -d

# Service-specific (PostgreSQL, Redis)
cd apps/order-service && docker-compose up -d
```

---

## Database

Each service has its own PostgreSQL database and Redis cache with isolated docker-compose.

### Environment Variables

```bash
# apps/order-service/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/order_service
REDIS_URL=redis://localhost:6381
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

### Commands

```bash
# Create migration
yarn db:migration:create:order

# Apply migration
yarn db:migration:apply:order

# Open Prisma Studio
yarn db:studio:order        # Port 5555
yarn db:studio:gateway      # Port 5556
yarn db:studio:admin        # Port 5557
```

---

## Adding a New Microservice

### 1. Generate Service

```bash
# Generate in apps/ directory, skip e2e tests
npx nx g @nx/nest:application apps/inventory-service --name=inventory-service --e2eTestRunner=none
```

### 2. Update project.json

Replace `apps/inventory-service/project.json` with:

```json
{
  "name": "inventory-service",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/inventory-service/src",
  "projectType": "application",
  "tags": [],
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "cache": false,
      "options": {
        "outputPath": "dist/apps/inventory-service",
        "main": "apps/inventory-service/src/main.ts",
        "tsConfig": "apps/inventory-service/tsconfig.app.json",
        "assets": ["apps/inventory-service/src/assets"]
      },
      "configurations": {
        "production": {
          "optimization": true,
          "extractLicenses": true,
          "sourceMap": false
        }
      }
    },
    "serve": {
      "executor": "@nx/js:node",
      "dependsOn": ["build"],
      "cache": false,
      "options": {
        "buildTarget": "inventory-service:build",
        "watch": true,
        "inspect": "inspect",
        "port": 9230,
        "debounce": 500,
        "runtimeArgs": ["--enable-source-maps"]
      }
    },
    "test": {
      "options": {
        "passWithNoTests": true
      }
    }
  }
}
```

### 3. Create Docker Compose

Create `apps/inventory-service/docker-compose.yml`:

```yaml
services:
  postgres-inventory:
    image: postgres:15-alpine
    container_name: inventory-service-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: inventory_service
    ports:
      - "5435:5432"
    volumes:
      - postgres_inventory_data:/var/lib/postgresql/data
    networks:
      - inventory-service-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis-inventory:
    image: redis:7-alpine
    container_name: inventory-service-redis
    command: redis-server --appendonly yes
    ports:
      - "6382:6379"
    volumes:
      - redis_inventory_data:/data
    networks:
      - inventory-service-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_inventory_data:
  redis_inventory_data:

networks:
  inventory-service-network:
    driver: bridge
  flexobo-shared-network:
    external: true
```

### 4. Create Environment File

Create `apps/inventory-service/.env`:

```bash
# Server
INVENTORY_SERVICE_PORT=3003
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/inventory_service

# Redis
REDIS_URL=redis://localhost:6382

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# OpenTelemetry
OTEL_TRACE_ENDPOINT=http://localhost:4318/v1/traces
OTEL_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
```

### 5. Setup Prisma

Create `apps/inventory-service/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/.prisma/inventory-client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model EventStore {
  id            String   @id @default(uuid())
  aggregateId   String   @map("aggregate_id")
  aggregateType String   @map("aggregate_type")
  eventType     String   @map("event_type")
  eventData     Json     @map("event_data")
  version       Int
  occurredAt    DateTime @default(now()) @map("occurred_at")
  metadata      Json?

  @@index([aggregateId])
  @@index([aggregateType])
  @@map("event_store")
}

model OutboxMessage {
  id          String    @id @default(uuid())
  eventType   String    @map("event_type")
  payload     Json
  occurredAt  DateTime  @default(now()) @map("occurred_at")
  processedAt DateTime? @map("processed_at")

  @@index([processedAt])
  @@map("outbox_messages")
}
```

Create `apps/inventory-service/prisma.config.ts`:

```typescript
import path from 'path';

export default {
  schema: path.join(__dirname, 'prisma/schema.prisma'),
};
```

### 6. Add Package Scripts

Update root `package.json`:

```json
{
  "scripts": {
    "start:inventory": "npx tsx scripts/dev.ts inventory",
    "db:migration:create:inventory": "npx prisma migrate dev --create-only --config apps/inventory-service/prisma.config.ts",
    "db:migration:apply:inventory": "npx prisma migrate deploy --config apps/inventory-service/prisma.config.ts",
    "db:studio:inventory": "npx prisma studio --config apps/inventory-service/prisma.config.ts --port 5558"
  }
}
```

### 7. Create Service Structure

```
apps/inventory-service/src/
├── main.ts
├── inventory.module.ts
├── prisma.module.ts
├── domain/
│   ├── inventory.aggregate.ts
│   └── events/
│       └── inventory.events.ts
├── application/
│   ├── commands/
│   │   └── inventory.handlers.ts
│   └── queries/
│       └── inventory.handlers.ts
├── adapters/
│   ├── http/v1/
│   │   └── inventory.controller.ts
│   ├── persistence/
│   │   └── inventory-aggregate.store.ts
│   └── eventbus/
│       └── projection/
│           └── inventory.projection.ts
└── ports/
    └── inventory-store.port.ts
```

### 8. Create Module

Create `apps/inventory-service/src/inventory.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import {
  CqrsModule,
  EventStoreModule,
  OutboxModule,
  CacheModule,
  MessagingModule,
  MESSAGE_PUBLISHER,
  VersioningModule,
  VersioningStrategy,
  VersionStatus,
  HealthModule,
  ObservabilityModule,
} from '@flexobo/core';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [
    PrismaModule,
    EventStoreModule.forRoot({ enableUpcasting: false }),
    MessagingModule.forRoot({
      config: {
        url: process.env['RABBITMQ_URL'],
        exchanges: [
          { name: 'flexobo.events', type: 'topic', durable: true },
          { name: 'flexobo.dlx', type: 'topic', durable: true },
        ],
        deadLetter: {
          exchange: 'flexobo.dlx',
          queue: 'flexobo.dead-letter',
          ttl: 86400000 * 7,
        },
        logging: { enabled: true, level: 'info' },
      },
      enablePublisher: true,
      enableConsumer: true,
    }),
    CqrsModule.forRoot({
      commandHandlers: [],
      queryHandlers: [],
    }),
    OutboxModule.forRoot({
      workerConfig: { pollingIntervalMs: 5000, batchSize: 100, enabled: true },
      messagePublisher: { provide: 'IMessagePublisher', useExisting: MESSAGE_PUBLISHER },
    }),
    VersioningModule.forRoot({
      strategy: VersioningStrategy.URI,
      defaultVersion: '1.0.0',
      versions: [{ version: { major: 1, minor: 0, patch: 0 }, status: VersionStatus.STABLE, description: 'Initial release' }],
      global: true,
    }),
    HealthModule.forRoot({
      version: '1.0.0',
      enableEndpoints: true,
      indicators: [],
      dependencies: [],
      global: true,
    }),
    ObservabilityModule.forRoot({
      serviceName: 'inventory-service',
      serviceVersion: '1.0.0',
      environment: process.env['NODE_ENV'],
      traceExporterUrl: process.env['OTEL_TRACE_ENDPOINT'],
      metricsExporterUrl: process.env['OTEL_METRICS_ENDPOINT'],
      autoInstrumentation: true,
      global: true,
    }),
    CacheModule.forRoot({
      redis: { url: process.env['REDIS_URL'] },
      cache: { prefix: 'inventory-service:', defaultTtl: 86400 * 7 },
    }),
  ],
  controllers: [],
  providers: [],
})
export class InventoryModule {}
```

### 9. Start Service

```bash
# Start infrastructure
cd infrastructure && docker-compose up -d && cd ..
cd apps/inventory-service && docker-compose up -d && cd ../..

# Generate Prisma client
npx prisma generate --config apps/inventory-service/prisma.config.ts

# Run migrations
yarn db:migration:apply:inventory

# Start service
yarn start:inventory
```

---

## Removing a Microservice

### 1. Stop and Remove Containers

```bash
cd apps/inventory-service && docker-compose down -v && cd ../..
```

### 2. Remove Service Directory

```bash
rm -rf apps/inventory-service
```

### 3. Remove Package Scripts

Remove these entries from root `package.json`:

```json
{
  "scripts": {
    "start:inventory": "...",
    "db:migration:create:inventory": "...",
    "db:migration:apply:inventory": "...",
    "db:studio:inventory": "..."
  }
}
```

### 4. Clean Up Build Artifacts

```bash
rm -rf dist/apps/inventory-service
rm -rf node_modules/.prisma/inventory-client
```

### 5. Reset Nx Cache

```bash
npx nx reset
```

---

## Troubleshooting

### Service Won't Start

```bash
lsof -i :3000           # Check port
kill -9 <PID>           # Kill process
```

### Database Issues

```bash
# Reset database
npx prisma migrate reset --config apps/order-service/prisma.config.ts

# Regenerate client
rm -rf node_modules/.prisma && npx prisma generate --config apps/order-service/prisma.config.ts
```

### Build Errors

```bash
rm -rf dist/
yarn build
```

### Infrastructure Issues

```bash
# Restart containers
docker-compose down && docker-compose up -d

# View logs
docker-compose logs -f
```
