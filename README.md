# Flexobo Microservices Architecture

[![CI](https://github.com/achilovbakhrom/flexobo-architecture-example/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/achilovbakhrom/flexobo-architecture-example/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/achilovbakhrom/flexobo-architecture-example/branch/dev/graph/badge.svg)](https://codecov.io/gh/achilovbakhrom/flexobo-architecture-example)

Enterprise-grade microservices example with event sourcing, CQRS, and domain-driven design.

## Quick Start

```bash
# 1. Install dependencies
yarn install

# 2. Start infrastructure
yarn infra:up

# 3. Setup databases
yarn db:setup && yarn db:migrate:all

# 4. Start all services with hot reload
yarn dev
```

## Services & Documentation

- **Order Service** → `http://localhost:3000/api`
- **API Gateway** → `http://localhost:3001/api`
- **Admin Panel** → `http://localhost:3002/api`

**📖 Unified Swagger API Docs:** `http://localhost:3001/api/docs` (Select service from dropdown)

**📚 Complete Developer Guide:** [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md)

## Development

```bash
# Run individual service with HMR
yarn dev:order:watch
yarn dev:gateway:watch
yarn dev:admin:watch

# Database
yarn db:generate          # Generate Prisma clients
yarn db:migrate:all       # Run migrations
yarn db:studio:order      # Open Prisma Studio

# Build & Test
yarn build:all            # Build all services
yarn test:all             # Run tests
yarn lint:all             # Lint code
```

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** NestJS
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL + Prisma
- **Message Queue:** RabbitMQ
- **Cache:** Redis
- **Monorepo:** Nx
- **API Docs:** Swagger/OpenAPI

## Architecture Patterns

✅ Event Sourcing • CQRS • Hexagonal Architecture • Saga Pattern  
✅ Outbox Pattern • Circuit Breaker • API Versioning

## Project Structure

```
apps/
├── order-service/     # Order management with event sourcing
├── api-gateway/       # Entry point, routing, resilience
└── admin-panel/       # Admin UI and system management

libs/
├── core/             # Shared CQRS, event sourcing, DDD patterns
└── shared-kernel/    # Common utilities and types
```

## License

MIT
