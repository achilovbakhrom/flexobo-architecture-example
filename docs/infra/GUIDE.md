# Flexobo Developer Guide

A comprehensive guide for developing, deploying, and maintaining Flexobo microservices.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Local Development](#local-development)
4. [Creating a New Microservice](#creating-a-new-microservice)
5. [Database Management](#database-management)
6. [Working with Message Queues](#working-with-message-queues)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Environment Configuration](#environment-configuration)
10. [Common Patterns](#common-patterns)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

Ensure you have the following installed:

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22+ | Runtime |
| Yarn | 1.22+ | Package manager |
| Docker | 24+ | Containerization |
| kubectl | 1.29+ | Kubernetes CLI |
| AWS CLI | 2.x | AWS operations |
| Terraform | 1.5.7+ | Infrastructure |

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/achilovbakhrom/flexobo-microservice-example.git
cd flexobo-microservice-example

# Install dependencies
yarn install

# Start local infrastructure
cd infrastructure && docker-compose up -d && cd ..

# Start a service (e.g., users-service)
yarn start:users
```

### AWS Configuration

```bash
# Configure AWS credentials
aws configure

# Verify access
aws sts get-caller-identity

# Update kubeconfig for EKS
aws eks update-kubeconfig --region us-east-1 --name flexobo-dev
```

---

## Project Structure

```
flexobo-microservice-example/
├── apps/                          # Microservices
│   ├── main-service/              # Main API gateway service
│   ├── users-service/             # User management
│   ├── chat-service/              # Chat functionality
│   ├── file-service/              # File management
│   ├── billing-service/           # Billing & payments
│   ├── notification-service/      # Push notifications
│   └── telegram-service/          # Telegram bot integration
├── libs/                          # Shared libraries
│   ├── core/                      # CQRS, event sourcing, messaging
│   └── shared-kernel/             # Event contracts, value objects
├── infrastructure/                # Infrastructure as Code
│   ├── terraform/                 # AWS resources (Terraform)
│   ├── k8s/                       # Kubernetes manifests
│   └── docker-compose.yml         # Local development
├── docs/                          # Documentation
│   ├── INFRASTRUCTURE.md          # Infrastructure details
│   └── GUIDE.md                   # This file
├── scripts/                       # Utility scripts
├── nx.json                        # NX monorepo configuration
├── package.json                   # Root package.json
└── tsconfig.base.json             # Base TypeScript config
```

### Service Structure

Each microservice follows the hexagonal architecture pattern:

```
apps/{service-name}/
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Database migrations
├── src/
│   ├── main.ts                    # Application entry point
│   ├── {service}.module.ts        # Root NestJS module
│   ├── prisma.module.ts           # Prisma client module
│   ├── domain/                    # Domain layer
│   │   ├── aggregates/            # Domain aggregates
│   │   ├── entities/              # Domain entities
│   │   ├── events/                # Domain events
│   │   └── value-objects/         # Value objects
│   ├── application/               # Application layer
│   │   ├── commands/              # Command handlers
│   │   ├── queries/               # Query handlers
│   │   └── use-cases/             # Use case implementations
│   ├── adapters/                  # Adapters layer
│   │   ├── http/                  # REST controllers
│   │   │   └── v1/                # API version 1
│   │   ├── persistence/           # Repository implementations
│   │   ├── eventbus/              # Event handlers
│   │   └── messaging/             # Message consumers
│   └── ports/                     # Port interfaces
│       └── repositories/          # Repository interfaces
├── Dockerfile                     # Container image
├── docker-compose.yml             # Service-specific infrastructure
├── .env                           # Environment variables
├── .env.example                   # Environment template
├── project.json                   # NX project configuration
├── prisma.config.ts               # Prisma configuration
└── tsconfig.*.json                # TypeScript configs
```

---

## Local Development

### Starting Services

```bash
# Start all services
yarn start

# Start specific service
yarn start:main          # Main service (port 3008)
yarn start:users         # Users service (port 3005)
yarn start:chat          # Chat service (port 3006)
yarn start:file          # File service (port 3007)
yarn start:billing       # Billing service (port 3009)
yarn start:notification  # Notification service (port 3010)
yarn start:telegram      # Telegram service (port 3012)

# Stop all services
yarn stop
```

### Local Infrastructure

```bash
# Start shared infrastructure (RabbitMQ)
cd infrastructure && docker-compose up -d && cd ..

# Start service-specific infrastructure
cd apps/users-service && docker-compose up -d && cd ../..

# View logs
docker-compose logs -f

# Stop and remove volumes
docker-compose down -v
```

### Environment Variables

Each service uses a `.env` file:

```bash
# apps/users-service/.env
NODE_ENV=development
USERS_SERVICE_PORT=3005

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5437/users_service

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# JWT
JWT_SECRET=your-local-jwt-secret

# OpenTelemetry (optional)
OTEL_TRACE_ENDPOINT=http://localhost:4318/v1/traces
OTEL_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
```

### Port Assignments

| Service | HTTP Port | Debug Port | Prisma Studio |
|---------|-----------|------------|---------------|
| main-service | 3008 | 9229 | 5555 |
| users-service | 3005 | 9230 | 5556 |
| chat-service | 3006 | 9231 | 5557 |
| file-service | 3007 | 9232 | 5558 |
| billing-service | 3009 | 9233 | 5559 |
| notification-service | 3010 | 9234 | 5560 |
| telegram-service | 3012 | 9235 | 5561 |

### Hot Reloading

Services automatically rebuild and restart on file changes:

```bash
# NX watch mode (automatic)
yarn start:{service}

# Manual rebuild
npx nx build {service-name}
```

---

## Creating a New Microservice

### Step 1: Generate Service

```bash
# Generate NestJS application
npx nx g @nx/nest:application apps/inventory-service \
  --name=inventory-service \
  --e2eTestRunner=none
```

### Step 2: Configure project.json

Replace `apps/inventory-service/project.json`:

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
      "options": {
        "outputPath": "dist/apps/inventory-service",
        "main": "apps/inventory-service/src/main.ts",
        "tsConfig": "apps/inventory-service/tsconfig.app.json",
        "assets": ["apps/inventory-service/src/assets"]
      }
    },
    "serve": {
      "executor": "@nx/js:node",
      "dependsOn": ["build"],
      "options": {
        "buildTarget": "inventory-service:build",
        "watch": true,
        "inspect": "inspect",
        "port": 9236,
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

### Step 3: Create Docker Compose

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
      - "5440:5432"
    volumes:
      - postgres_inventory_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_inventory_data:
```

### Step 4: Setup Prisma

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

### Step 5: Create Environment File

Create `apps/inventory-service/.env`:

```bash
NODE_ENV=development
INVENTORY_SERVICE_PORT=3013
DATABASE_URL=postgresql://postgres:postgres@localhost:5440/inventory_service
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

### Step 6: Add Package Scripts

Update root `package.json`:

```json
{
  "scripts": {
    "start:inventory": "npx tsx scripts/dev.ts inventory",
    "db:generate:inventory": "npx prisma generate --config apps/inventory-service/prisma.config.ts",
    "db:push:inventory": "npx prisma db push --config apps/inventory-service/prisma.config.ts",
    "db:migrate:inventory": "npx prisma migrate dev --config apps/inventory-service/prisma.config.ts",
    "db:studio:inventory": "npx prisma studio --config apps/inventory-service/prisma.config.ts --port 5562"
  }
}
```

### Step 7: Create Dockerfile

Create `apps/inventory-service/Dockerfile`:

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN npx nx build inventory-service --prod

FROM node:22-alpine

WORKDIR /app
COPY --from=builder /app/dist/apps/inventory-service ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3013

CMD ["node", "main.js"]
```

### Step 8: Create Kubernetes Manifests

Create `infrastructure/k8s/base/services/inventory-service/`:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inventory-service
  namespace: flexobo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: inventory-service
  template:
    metadata:
      labels:
        app: inventory-service
        tier: backend
    spec:
      containers:
        - name: inventory-service
          image: 677109604279.dkr.ecr.us-east-1.amazonaws.com/flexobo/inventory-service:latest
          ports:
            - containerPort: 3013
          envFrom:
            - configMapRef:
                name: flexobo-config
            - secretRef:
                name: flexobo-secrets
          env:
            - name: HOST
              value: "0.0.0.0"
            - name: PORT
              value: "3013"
            - name: DATABASE_URL
              value: "postgresql://postgres:$(DB_PASSWORD)@$(DB_HOST):5432/flexobo?schema=inventory&sslmode=no-verify"
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          readinessProbe:
            tcpSocket:
              port: 3013
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            tcpSocket:
              port: 3013
            initialDelaySeconds: 30
            periodSeconds: 30
---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: inventory-service
  namespace: flexobo
spec:
  selector:
    app: inventory-service
  ports:
    - port: 3013
      targetPort: 3013
```

### Step 9: Start the Service

```bash
# Start infrastructure
cd apps/inventory-service && docker-compose up -d && cd ../..

# Generate Prisma client
yarn db:generate:inventory

# Push schema
yarn db:push:inventory

# Start service
yarn start:inventory
```

---

## Database Management

### Prisma Commands

```bash
# Generate client
yarn db:generate:{service}

# Push schema (development)
yarn db:push:{service}

# Create migration
yarn db:migrate:{service}

# Open Prisma Studio
yarn db:studio:{service}

# Reset database (caution!)
npx prisma migrate reset --config apps/{service}/prisma.config.ts
```

### Database URLs

Local development:

```bash
# Each service has its own database
DATABASE_URL=postgresql://postgres:postgres@localhost:{port}/{database}

# Port mapping
# users-service:    5437
# chat-service:     5436
# file-service:     5438
# billing-service:  5440
# notification-service: 5441
# telegram-service: 5442
```

Production (EKS):

```bash
# All services share one RDS instance with different schemas
DATABASE_URL=postgresql://postgres:{password}@{rds-host}:5432/flexobo?schema={schema}&sslmode=no-verify
```

### Creating Database Schema in Production

```bash
# Create schema using a temporary pod
kubectl run db-migrate --rm -i --restart=Never \
  --image=postgres:15-alpine \
  -n flexobo \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h ${DB_HOST} -U postgres -d flexobo \
  -c "CREATE SCHEMA IF NOT EXISTS inventory;"
```

---

## Working with Message Queues

### RabbitMQ Configuration

```typescript
// In service module
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
  },
  enablePublisher: true,
  enableConsumer: true,
}),
```

### Publishing Events

```typescript
// Using outbox pattern (recommended)
@Injectable()
export class OrderService {
  constructor(private readonly outboxService: OutboxService) {}

  async createOrder(data: CreateOrderDto) {
    const order = await this.prisma.order.create({ data });
    
    await this.outboxService.publish({
      eventType: 'OrderCreated',
      payload: {
        orderId: order.id,
        userId: order.userId,
      },
    });
    
    return order;
  }
}
```

### Consuming Events

```typescript
// Event handler
@MessageHandler({
  exchange: 'flexobo.events',
  queue: 'inventory-service.on-order-created',
  routingKey: 'order.created',
})
export class OrderCreatedHandler {
  async handle(event: OrderCreatedEvent) {
    // Update inventory
  }
}
```

### Shared Event Contracts

```typescript
import { EVENT_TYPES, ROUTING_KEYS, EXCHANGES } from '@flexobo/shared-kernel';

// Event types
EVENT_TYPES.ORDER.CREATED    // 'OrderCreated'
EVENT_TYPES.PAYMENT.COMPLETED // 'PaymentCompleted'

// Routing keys
ROUTING_KEYS.ORDER.CREATED   // 'order.created'
ROUTING_KEYS.ORDER.ALL       // 'order.*'
```

---

## Testing

### Running Tests

```bash
# Run all tests
yarn test

# Run specific service tests
npx nx test {service-name}

# Run with coverage
npx nx test {service-name} --coverage

# Run e2e tests
npx nx e2e {service-name}-e2e
```

### Test Structure

```
apps/{service}/src/
├── domain/
│   └── aggregates/
│       └── order.aggregate.spec.ts
├── application/
│   └── commands/
│       └── create-order.handler.spec.ts
└── adapters/
    └── http/
        └── orders.controller.spec.ts
```

### Writing Tests

```typescript
// Unit test example
describe('OrderAggregate', () => {
  it('should create order with valid data', () => {
    const order = new OrderAggregate();
    order.create({
      userId: 'user-123',
      items: [{ productId: 'prod-1', quantity: 2 }],
    });
    
    expect(order.status).toBe('PENDING');
    expect(order.getUncommittedEvents()).toHaveLength(1);
  });
});

// Integration test example
describe('OrdersController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [OrderModule],
    }).compile();
    
    app = module.createNestApplication();
    await app.init();
  });

  it('POST /orders should create order', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .send({ userId: 'user-123', items: [] })
      .expect(201);
    
    expect(response.body.id).toBeDefined();
  });
});
```

---

## Deployment

### Building Images

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  677109604279.dkr.ecr.us-east-1.amazonaws.com

# Build for production
docker build --platform linux/amd64 \
  -t 677109604279.dkr.ecr.us-east-1.amazonaws.com/flexobo/{service}:latest \
  -f apps/{service}/Dockerfile .

# Push to ECR
docker push 677109604279.dkr.ecr.us-east-1.amazonaws.com/flexobo/{service}:latest
```

### Deploying to Kubernetes

```bash
# Apply configuration
kubectl apply -k infrastructure/k8s/base

# Update specific service
kubectl apply -f infrastructure/k8s/base/services/{service}/

# Trigger rolling update
kubectl rollout restart deployment/{service} -n flexobo

# Check status
kubectl rollout status deployment/{service} -n flexobo

# View logs
kubectl logs -f deployment/{service} -n flexobo
```

### Rollback

```bash
# View rollout history
kubectl rollout history deployment/{service} -n flexobo

# Rollback to previous
kubectl rollout undo deployment/{service} -n flexobo

# Rollback to specific revision
kubectl rollout undo deployment/{service} -n flexobo --to-revision=2
```

---

## Environment Configuration

### Local vs Production

| Variable | Local | Production |
|----------|-------|------------|
| NODE_ENV | development | production |
| DATABASE_URL | localhost:543x | RDS endpoint |
| RABBITMQ_URL | localhost:5672 | RabbitMQ pod |
| REDIS_URL | localhost:6379 | Redis pod |

### ConfigMaps and Secrets

```yaml
# ConfigMap (non-sensitive)
apiVersion: v1
kind: ConfigMap
metadata:
  name: flexobo-config
  namespace: flexobo
data:
  NODE_ENV: "production"
  DB_HOST: "flexobo-dev-postgres.xxx.us-east-1.rds.amazonaws.com"
  RABBITMQ_URL: "amqp://rabbitmq.flexobo.svc.cluster.local:5672"
  REDIS_URL: "redis://redis.flexobo.svc.cluster.local:6379"

---
# Secret (sensitive)
apiVersion: v1
kind: Secret
metadata:
  name: flexobo-secrets
  namespace: flexobo
type: Opaque
stringData:
  DB_PASSWORD: "xxx"
  JWT_SECRET: "xxx"
  STRIPE_SECRET_KEY: "xxx"
```

---

## Common Patterns

### API Versioning

```typescript
@Controller({ path: 'orders', version: '1' })
export class OrdersControllerV1 {
  @Get()
  getOrders() { /* v1 implementation */ }
}

@Controller({ path: 'orders', version: '2' })
export class OrdersControllerV2 {
  @Get()
  getOrders() { /* v2 implementation */ }
}
```

### Error Handling

```typescript
// Domain exception
export class OrderNotFoundException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} not found`, 'ORDER_NOT_FOUND');
  }
}

// Global filter
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    if (exception instanceof DomainException) {
      return response.status(400).json({
        code: exception.code,
        message: exception.message,
      });
    }
    
    // Handle other exceptions
  }
}
```

### Event Sourcing

```typescript
// Aggregate root
export class OrderAggregate extends AggregateRoot {
  private status: OrderStatus;
  private items: OrderItem[];

  create(data: CreateOrderData) {
    this.apply(new OrderCreatedEvent({
      orderId: this.id,
      userId: data.userId,
      items: data.items,
    }));
  }

  private onOrderCreated(event: OrderCreatedEvent) {
    this.status = 'PENDING';
    this.items = event.items;
  }
}

// Event store
const events = await eventStore.getEvents(aggregateId);
const aggregate = new OrderAggregate();
aggregate.loadFromHistory(events);
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check port availability
lsof -i :3008

# Kill process on port
kill -9 $(lsof -t -i:3008)

# Check logs
npx nx build {service} 2>&1 | tail -50
```

### Database Issues

```bash
# Reset database
npx prisma migrate reset --config apps/{service}/prisma.config.ts

# Regenerate client
rm -rf node_modules/.prisma/{service}-client
npx prisma generate --config apps/{service}/prisma.config.ts
```

### Docker Issues

```bash
# Restart containers
docker-compose down && docker-compose up -d

# Clean up
docker system prune -af
docker volume prune -f

# View logs
docker-compose logs -f {service}
```

### Kubernetes Issues

```bash
# Check pod status
kubectl get pods -n flexobo

# View pod logs
kubectl logs -f deployment/{service} -n flexobo

# Describe pod for events
kubectl describe pod {pod-name} -n flexobo

# Get shell in pod
kubectl exec -it {pod-name} -n flexobo -- /bin/sh

# Check endpoints
kubectl get endpoints -n flexobo
```

### Build Errors

```bash
# Clean NX cache
npx nx reset

# Clean dist
rm -rf dist/

# Reinstall dependencies
rm -rf node_modules
yarn install

# Rebuild
npx nx build {service}
```

---

## Quick Reference

### Common Commands

```bash
# Start service
yarn start:{service}

# Build service
npx nx build {service}

# Test service
npx nx test {service}

# Lint service
npx nx lint {service}

# Database commands
yarn db:generate:{service}
yarn db:push:{service}
yarn db:migrate:{service}
yarn db:studio:{service}

# Docker commands
docker-compose up -d
docker-compose down -v
docker-compose logs -f

# Kubernetes commands
kubectl get pods -n flexobo
kubectl logs -f deployment/{service} -n flexobo
kubectl rollout restart deployment/{service} -n flexobo
```

### Service URLs (Local)

```
http://localhost:3005  # users-service
http://localhost:3006  # chat-service
http://localhost:3007  # file-service
http://localhost:3008  # main-service
http://localhost:3009  # billing-service
http://localhost:3010  # notification-service
http://localhost:3012  # telegram-service
```

### Service URLs (Production)

```
https://dev-api.flexobo-mock.site           # main-service
https://dev-users-api.flexobo-mock.site     # users-service
https://dev-chat-api.flexobo-mock.site      # chat-service
https://dev-file-api.flexobo-mock.site      # file-service
https://dev-billing-api.flexobo-mock.site   # billing-service
https://dev-notification-api.flexobo-mock.site  # notification-service
https://dev-telegram-api.flexobo-mock.site  # telegram-service
```
