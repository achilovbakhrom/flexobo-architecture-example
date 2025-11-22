# Flexobo Microservice Architecture

A production-ready microservices architecture built with **NestJS**, **Nx**, and implementing advanced patterns like **Event Sourcing**, **CQRS**, **Saga**, and **Circuit Breaker**.

## 🎯 Project Overview

This project demonstrates a complete microservices ecosystem with:
- **3 Microservices:** Order Service, API Gateway, Admin Panel
- **17 Advanced Patterns:** Event Sourcing, CQRS, Outbox, Saga, 2PC, Snapshots, Circuit Breaker, etc.
- **Full Testing Suite:** Unit, Integration, and E2E tests
- **Production Deployment:** Docker & Kubernetes configurations
- **CLI Tools:** System management and monitoring

## 🏗️ Architecture

```
┌─────────────────┐
│   API Gateway   │ ← Entry point (Port 3001)
│   (3 replicas)  │
└────────┬────────┘
         │
    ┌────┴────┬──────────────┐
    ↓         ↓              ↓
┌────────┐ ┌──────────┐ ┌───────────┐
│ Order  │ │  Admin   │ │   Cache   │
│Service │ │  Panel   │ │  (Redis)  │
│        │ │          │ │           │
└───┬────┘ └────┬─────┘ └───────────┘
    │           │
    ↓           ↓
┌────────────────────┐
│    PostgreSQL      │ ← Event Store + Data
│  (Event Sourcing)  │
└────────────────────┘
         ↑
    ┌────┴────┐
    │ RabbitMQ│ ← Message Bus
    │  (AMQP) │
    └─────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15
- RabbitMQ 3.12
- Redis 7

### Installation

```bash
# Clone repository
git clone <repository-url>
cd flexobo-microservice-example

# Install dependencies
npm install

# Start infrastructure (PostgreSQL, RabbitMQ, Redis)
docker-compose -f docker-compose.dev.yml up -d

# Run database migrations
npx prisma migrate dev
```

### Run Services

```bash
# Order Service (Port 3000)
npx nx serve order-service

# API Gateway (Port 3001)
npx nx serve api-gateway

# Admin Panel (Port 3002)
npx nx serve admin-panel
```

### Run with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📦 Services

### Order Service (Port 3000)
- **Purpose:** Order management with event sourcing
- **Features:** CQRS, Event Store, Outbox Pattern, Saga orchestration
- **Endpoints:** `/api/v1/orders`

### API Gateway (Port 3001)
- **Purpose:** Single entry point, routing, resilience
- **Features:** Circuit Breaker, Rate Limiting, Request Aggregation
- **Endpoints:** `/api/v1/*`

### Admin Panel (Port 3002)
- **Purpose:** System administration and monitoring
- **Features:** User management, Metrics, Audit logs, Cache management
- **Endpoints:** `/api/v1/admin/*`

## 🏛️ Implemented Patterns

### Core Patterns
1. **Event Sourcing** - Store all state changes as events
2. **CQRS** - Separate read and write models
3. **Outbox Pattern** - Reliable message delivery
4. **Saga Pattern** - Distributed transaction orchestration
5. **Two-Phase Commit** - Coordinated transactions
6. **Event Store Snapshots** - Performance optimization

### Resilience Patterns
7. **Circuit Breaker** - Prevent cascade failures
8. **Retry Pattern** - Automatic retry with backoff
9. **Bulkhead Pattern** - Resource isolation
10. **Rate Limiting** - Protect from overload

### Infrastructure Patterns
11. **Distributed Caching** - Redis-based caching
12. **Distributed Tracing** - OpenTelemetry integration
13. **API Versioning** - Backward compatibility
14. **Health Checks** - Liveness & readiness probes
15. **Structured Logging** - JSON logging with correlation IDs
16. **Idempotency** - Safe request retries
17. **Message Bus** - RabbitMQ event-driven communication

## 🧪 Testing

### Run All Tests

```bash
# Unit tests
npx nx test order-service
npx nx test api-gateway
npx nx test admin-panel

# Integration tests
npx nx test order-service --testMatch="**/*.integration-spec.ts"

# E2E tests (requires running services)
npx nx e2e e2e-tests
```

### Test Coverage

```bash
# Generate coverage report
npx nx test order-service --coverage

# View coverage
open coverage/apps/order-service/index.html
```

## 📚 Documentation

- **[Integration Testing Guide](docs/INTEGRATION_TESTING.md)** - Integration test patterns and examples
- **[E2E Testing Guide](docs/E2E_TESTING.md)** - End-to-end testing strategies
- **[Docker Guide](docs/DOCKER.md)** - Docker configuration and deployment
- **[Kubernetes Guide](docs/KUBERNETES.md)** - Kubernetes deployment and scaling
- **[Architecture Overview](docs/ARCHITECTURE.md)** - Detailed architecture documentation

## 🛠️ CLI Tools

```bash
# List all commands
npm run cli -- --help

# Event Store commands
npm run cli event-store list
npm run cli event-store replay <aggregate-id>

# Cache commands
npm run cli cache list
npm run cli cache clear <key>

# System commands
npm run cli system health
npm run cli system metrics

# User management
npm run cli users list
npm run cli users create --email admin@example.com
```

## 🔧 Technology Stack

- **Framework:** NestJS 11.0.0
- **Build Tool:** Nx 22.1.0
- **Language:** TypeScript 5.7.2
- **Database:** PostgreSQL 15 + Prisma 6.19.0
- **Message Broker:** RabbitMQ 3.12
- **Cache:** Redis 7
- **Testing:** Jest 29.7.0 + Supertest
- **Container:** Docker + Docker Compose
- **Orchestration:** Kubernetes + Kustomize
- **Observability:** OpenTelemetry

## 📊 Project Structure

```
flexobo-microservice-example/
├── apps/
│   ├── order-service/        # Order management service
│   ├── api-gateway/          # API Gateway & routing
│   ├── admin-panel/          # Admin interface
│   └── e2e-tests/            # End-to-end tests
├── libs/
│   ├── core/                 # Core patterns (Event Store, CQRS, etc.)
│   └── shared-kernel/        # Shared domain logic
├── k8s/                      # Kubernetes manifests
│   ├── base/                 # Base configurations
│   └── overlays/             # Environment-specific configs
├── docs/                     # Documentation
├── scripts/                  # Build and deployment scripts
└── tools/
    └── cli/                  # CLI tools
```

## 🚢 Deployment

### Docker Deployment

```bash
# Build images
./scripts/docker-build.sh

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale order-service=3
```

### Kubernetes Deployment

```bash
# Build and push images
./scripts/docker-build.sh --push

# Deploy to development
kubectl apply -k k8s/overlays/development

# Deploy to production
kubectl apply -k k8s/overlays/production

# Check status
kubectl get all -n flexobo

# View logs
kubectl logs -f -l app=order-service -n flexobo
```

## 🔐 Security

- **Authentication:** JWT-based authentication
- **Authorization:** Role-based access control (RBAC)
- **Password Hashing:** PBKDF2 with salt
- **Secrets Management:** Kubernetes secrets / Docker secrets
- **Network Security:** Service-to-service communication via private network
- **Input Validation:** Class-validator with DTO validation

## 📈 Monitoring & Observability

- **Health Checks:** `/health` endpoint on all services
- **Metrics:** System metrics via Admin Panel
- **Distributed Tracing:** OpenTelemetry integration
- **Structured Logging:** JSON logs with correlation IDs
- **Audit Logs:** Complete audit trail of all operations

## 🎯 Key Features

### Event Sourcing
- Complete audit trail of all changes
- Time-travel debugging
- Event replay capability
- Snapshot optimization for performance

### CQRS
- Optimized read and write models
- Scalable query handling
- Event-driven projections
- Denormalized read models

### Saga Orchestration
- Distributed transaction coordination
- Automatic compensation on failure
- State machine implementation
- Timeout handling

### Circuit Breaker
- Automatic failure detection
- Graceful degradation
- Fast failure without waiting
- Automatic recovery

### Distributed Caching
- Redis-based caching layer
- Cache invalidation patterns
- TTL-based expiration
- Cache-aside pattern

## 🔄 Development Workflow

### Add New Feature

```bash
# Generate new module
npx nx g @nx/nest:module feature-name --project=order-service

# Generate controller
npx nx g @nx/nest:controller feature-name --project=order-service

# Generate service
npx nx g @nx/nest:service feature-name --project=order-service

# Generate tests
npx nx g @nx/nest:service feature-name --project=order-service --unitTestRunner=jest
```

### Run Affected Tests

```bash
# Test only affected projects
npx nx affected:test

# Build affected projects
npx nx affected:build

# Visualize dependency graph
npx nx graph
```

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check Docker containers
docker ps -a

# View logs
docker-compose logs order-service

# Restart services
docker-compose restart
```

### Database Connection Issues

```bash
# Check PostgreSQL
docker-compose exec postgres psql -U postgres -d flexobo

# Run migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset
```

### RabbitMQ Issues

```bash
# Access RabbitMQ Management UI
open http://localhost:15672
# Credentials: guest/guest

# Check queues
docker-compose exec rabbitmq rabbitmqctl list_queues
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Monorepo powered by [Nx](https://nx.dev/)
- Inspired by Domain-Driven Design principles
- Implements patterns from "Microservices Patterns" by Chris Richardson

## 📞 Support

- **Documentation:** See `/docs` directory
- **Issues:** Open an issue on GitHub
- **Discussions:** Use GitHub Discussions
