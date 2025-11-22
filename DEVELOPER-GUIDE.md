# Developer Guide

Complete guide for developing with this microservices architecture.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Development Workflow](#development-workflow)
- [Database Setup](#database-setup)
- [Hot Module Reload](#hot-module-reload)
- [Adding New Service](#adding-new-service)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Install dependencies
yarn install

# 2. Start infrastructure
yarn infra:up

# 3. Setup databases
yarn db:setup
yarn db:migrate:all

# 4. Run all services with hot reload
yarn dev
```

**Services:**
- Order Service → `http://localhost:3000/api`
- API Gateway → `http://localhost:3001/api`
- Admin Panel → `http://localhost:3002/api`
- Swagger UI → `http://localhost:3001/api/docs`

---

## Architecture

### Services

**Order Service (Port 3000)**
- Order management with event sourcing
- CQRS pattern (commands/queries)
- Event store for complete audit trail

**API Gateway (Port 3001)**
- Single entry point for all requests
- Rate limiting and circuit breaker
- Request routing and aggregation

**Admin Panel (Port 3002)**
- System administration
- User management
- Audit logging

### Tech Stack

- **Runtime:** Node.js 20
- **Framework:** NestJS
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL + Prisma
- **Cache:** Redis
- **Message Queue:** RabbitMQ
- **Monorepo:** Nx
- **API Docs:** Swagger/OpenAPI

### Project Structure

```
apps/
├── order-service/       # Order management
│   ├── prisma/         # Database schema
│   └── src/
│       ├── domain/     # Business logic
│       ├── application/ # Commands & queries
│       └── presentation/ # Controllers
├── api-gateway/        # Entry point
└── admin-panel/        # Admin UI

libs/
├── core/              # CQRS, event sourcing
└── shared-kernel/     # Common utilities
```

---

## Development Workflow

### Run Individual Service

```bash
yarn dev:order:watch    # Order service with HMR
yarn dev:gateway:watch  # Gateway with HMR
yarn dev:admin:watch    # Admin with HMR
```

### Run All Services

```bash
yarn dev  # All services with hot reload
```

### Build & Test

```bash
yarn build:all   # Build all services
yarn test:all    # Run tests
yarn lint:all    # Lint code
```

### Infrastructure

```bash
yarn infra:up       # Start PostgreSQL, Redis, RabbitMQ
yarn infra:down     # Stop infrastructure
yarn infra:logs     # View logs
```

---

## Database Setup

### Overview

Each service has its own database:
- `order_service` → Order Service
- `api_gateway` → API Gateway  
- `admin_panel` → Admin Panel

### Environment Variables

Add to `.env`:

```bash
ORDER_SERVICE_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/order_service"
API_GATEWAY_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/api_gateway"
ADMIN_PANEL_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/admin_panel"
```

### Common Commands

```bash
yarn db:setup           # Create databases + generate clients
yarn db:generate        # Generate Prisma clients
yarn db:migrate:all     # Run all migrations
yarn db:migrate:order   # Migrate order service only
yarn db:studio:order    # Open Prisma Studio (port 5555)
yarn db:migrate:deploy  # Production deployment
```

### Using Prisma in Code

**Order Service:**
```typescript
import { PrismaClient } from '.prisma/order-client';
const prisma = new PrismaClient();
```

**API Gateway:**
```typescript
import { PrismaClient } from '.prisma/gateway-client';
const prisma = new PrismaClient();
```

**Admin Panel:**
```typescript
import { PrismaClient } from '.prisma/admin-client';
const prisma = new PrismaClient();
```

### Creating Migrations

```bash
# 1. Edit schema
vim apps/order-service/prisma/schema.prisma

# 2. Create migration
yarn db:migrate:order
# Name: "add_payment_status"
```

---

## Hot Module Reload

### How It Works

When you edit any file:
1. TypeScript recompiles automatically (~200ms)
2. Service restarts automatically (~1s)
3. Ready to test immediately

### Usage

```bash
# Start with HMR
yarn dev:order:watch

# Edit any file
vim apps/order-service/src/domain/order.aggregate.ts

# Save → Auto reload!
```

### Editing Shared Libraries

When you edit `libs/core/` or `libs/shared-kernel/`:
- All services restart automatically
- Changes apply everywhere

### Tips

- First build is slow (~10s), incremental builds are fast (~200ms)
- Clean build: `rm -rf dist/ && yarn build:all`
- Stop watch mode: `Ctrl+C`

---

## Adding New Service

### Step 1: Generate Service

```bash
npx nx g @nx/nest:application payment-service
```

### Step 2: Configure Build

Edit `apps/payment-service/project.json`:

```json
{
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "options": {
        "outputPath": "dist/apps/payment-service",
        "main": "apps/payment-service/src/main.ts",
        "tsConfig": "apps/payment-service/tsconfig.app.json"
      }
    },
    "serve": {
      "executor": "nx:run-commands",
      "dependsOn": ["build"],
      "options": {
        "command": "node dist/apps/payment-service/src/main.js"
      }
    }
  }
}
```

### Step 3: Add Database

Create `apps/payment-service/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/.prisma/payment-client"
}

datasource db {
  provider = "postgresql"
  url      = env("PAYMENT_SERVICE_DATABASE_URL")
}
```

### Step 4: Add Scripts

Update `package.json`:

```json
{
  "scripts": {
    "watch:payment": "tsc --build apps/payment-service/tsconfig.app.json --watch",
    "start:payment": "nodemon --watch dist/apps/payment-service --watch dist/libs dist/apps/payment-service/src/main.js",
    "dev:payment:watch": "concurrently \"yarn watch:libs\" \"yarn watch:payment\" \"yarn start:payment\""
  }
}
```

### Step 5: Test

```bash
yarn db:generate
yarn db:migrate:payment
yarn dev:payment:watch
```

---

## API Documentation

### Unified Swagger UI

Access the unified Swagger UI at: **`http://localhost:3001/api/docs`**

All microservices are automatically aggregated into a single Swagger interface with a **service selector dropdown** in the top-right corner.

### How It Works

1. **Each Service** exposes its own Swagger spec at `/api/docs-json`
2. **API Gateway** fetches and aggregates all specs dynamically
3. **Unified UI** displays all endpoints with per-operation service selection
4. **Server Dropdown** allows switching context between services

### Service Selection

In Swagger UI:
1. Click the **"Servers"** dropdown in the top-right
2. Select target service:
   - `http://localhost:3000` - Order Service
   - `http://localhost:3002` - Admin Panel
3. View and test endpoints for that service
4. Each endpoint shows which service it belongs to

### Individual Service Docs

You can also access individual Swagger UIs:
- Order Service: `http://localhost:3000/api/docs`
- Admin Panel: `http://localhost:3002/api/docs`

### Example API Call

**Create Order:**
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123"}'
```

**Get Order:**
```bash
curl http://localhost:3000/api/v1/orders/{orderId}
```

---

## Testing

### Unit Tests

```bash
yarn test:all              # All services
npx nx test order-service  # Specific service
```

### E2E Tests

```bash
npx nx e2e order-service-e2e
```

### Test Coverage

```bash
npx nx test order-service --coverage
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check ports
lsof -i :3000  # Order service
lsof -i :3001  # Gateway

# Kill process
kill -9 <PID>
```

### Database Issues

```bash
# Reset database (WARNING: deletes data)
npx prisma migrate reset --schema=apps/order-service/prisma/schema.prisma

# Regenerate clients
rm -rf node_modules/.prisma && yarn db:generate
```

### Build Errors

```bash
# Clean build
rm -rf dist/
yarn build:all
```

### HMR Not Working

```bash
# Check if watch mode running
# Should see "Watching for file changes..."

# Clean and restart
rm -rf dist/
yarn build:all
yarn dev:order:watch
```

### Infrastructure Issues

```bash
# Restart containers
yarn infra:down
yarn infra:up

# View logs
yarn infra:logs
```

---

## Best Practices

### Code Organization

- Domain layer: Pure business logic, no framework dependencies
- Application layer: Use cases (commands/queries)
- Presentation layer: Controllers, API endpoints

### Database

- Each service owns its data
- No shared tables between services
- Use migrations for schema changes
- Test migrations on staging first

### Event Sourcing

- Store all state changes as events
- Events are immutable
- Replay events to rebuild state

### API Design

- Use versioning: `/api/v1/orders`
- Return proper HTTP status codes
- Include error details in responses
- Document with Swagger decorators

### Performance

- Use connection pooling
- Cache frequently accessed data (Redis)
- Index database queries properly
- Monitor with OpenTelemetry

---

## Useful Commands

```bash
# Development
yarn dev                  # All services with HMR
yarn dev:order:watch      # Single service with HMR
yarn build:all            # Build everything

# Database
yarn db:setup             # Setup databases
yarn db:migrate:all       # Run migrations
yarn db:studio:order      # Open Prisma Studio

# Infrastructure
yarn infra:up             # Start containers
yarn infra:down           # Stop containers
yarn infra:logs           # View logs

# Testing
yarn test:all             # Run all tests
yarn lint:all             # Lint code

# Utilities
rm -rf dist/              # Clean build
rm -rf node_modules/.prisma  # Clean Prisma clients
```

---

## Architecture Patterns

- ✅ Event Sourcing - Complete audit trail
- ✅ CQRS - Separate read/write models
- ✅ Hexagonal Architecture - Clean separation
- ✅ Saga Pattern - Distributed transactions
- ✅ Outbox Pattern - Reliable events
- ✅ Circuit Breaker - Fault tolerance
- ✅ API Versioning - Backward compatibility

---

## License

MIT
