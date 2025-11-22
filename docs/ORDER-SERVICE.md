# Order Service

A complete example microservice demonstrating the flexobo-core library with:
- ✅ Event Sourcing with Event Store
- ✅ CQRS (Command Query Responsibility Segregation)
- ✅ Hexagonal Architecture (Ports & Adapters)
- ✅ Domain-Driven Design patterns
- ✅ Outbox Pattern for reliable messaging
- ✅ API Versioning
- ✅ Health Checks (Kubernetes-ready)
- ✅ OpenTelemetry Observability

## Architecture

```
apps/order-service/
├── src/
│   ├── domain/                    # Domain Layer (Business Logic)
│   │   └── order.aggregate.ts     # Order aggregate with event sourcing
│   ├── application/               # Application Layer (Use Cases)
│   │   ├── commands/              # Command handlers (Write operations)
│   │   │   ├── order.commands.ts
│   │   │   └── order.handlers.ts
│   │   └── queries/               # Query handlers (Read operations)
│   │       ├── order.queries.ts
│   │       └── order.handlers.ts
│   ├── presentation/              # Presentation Layer (API)
│   │   └── order.controller.ts    # REST API endpoints
│   ├── order.module.ts            # NestJS module configuration
│   └── main.ts                    # Application entry point
```

## Domain Model

### Order Aggregate

The Order aggregate is the main business entity with the following capabilities:

**States:**
- `DRAFT` - Order is being created
- `CONFIRMED` - Order confirmed (ready for payment)
- `PAID` - Payment processed
- `SHIPPED` - Order shipped
- `DELIVERED` - Order delivered
- `CANCELLED` - Order cancelled

**Commands:**
- `CreateOrderCommand` - Create new order
- `AddOrderItemCommand` - Add item to draft order
- `ConfirmOrderCommand` - Confirm draft order
- `CancelOrderCommand` - Cancel order
- `ShipOrderCommand` - Ship paid order

**Events:**
- `OrderCreated` - Order was created
- `OrderItemAdded` - Item added to order
- `OrderConfirmed` - Order confirmed
- `OrderCancelled` - Order cancelled
- `OrderShipped` - Order shipped

## API Endpoints

### Version 1.0.0

Base URL: `http://localhost:3000/api/v1/orders`

#### Create Order
```http
POST /api/v1/orders
Content-Type: application/json

{
  "userId": "user-123"
}

Response: 201 Created
{
  "orderId": "order-1234567890-abc123"
}
```

#### Add Item to Order
```http
POST /api/v1/orders/:orderId/items
Content-Type: application/json

{
  "productId": "prod-456",
  "productName": "Laptop",
  "quantity": 1,
  "price": 999.99,
  "currency": "USD"
}

Response: 200 OK
{
  "success": true
}
```

#### Confirm Order
```http
PUT /api/v1/orders/:orderId/confirm

Response: 200 OK
{
  "success": true
}
```

#### Get Order
```http
GET /api/v1/orders/:orderId

Response: 200 OK
{
  "id": "order-1234567890-abc123",
  "userId": "user-123",
  "items": [
    {
      "productId": "prod-456",
      "productName": "Laptop",
      "quantity": 1,
      "priceAmount": 999.99,
      "priceCurrency": "USD"
    }
  ],
  "status": "CONFIRMED",
  "totalAmount": 999.99,
  "currency": "USD",
  "version": 3
}
```

#### Cancel Order
```http
DELETE /api/v1/orders/:orderId
Content-Type: application/json

{
  "reason": "Customer requested cancellation"
}

Response: 200 OK
{
  "success": true
}
```

#### Ship Order
```http
PUT /api/v1/orders/:orderId/ship
Content-Type: application/json

{
  "trackingNumber": "TRACK-123456"
}

Response: 200 OK
{
  "success": true
}
```

## Health Checks

```http
# Overall health
GET /api/health

# Liveness probe (for Kubernetes)
GET /api/health/live

# Readiness probe (for Kubernetes)
GET /api/health/ready
```

## Running the Service

### Prerequisites

1. PostgreSQL database running
2. Set environment variables (optional):
```bash
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=order_service
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export PORT=3000
```

### Development

```bash
# Start the service
npx nx serve order-service

# Or build and run
npx nx build order-service
node dist/apps/order-service/main.js
```

### Database Setup

The service requires Prisma schema migration:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Or apply migrations in production
npx prisma migrate deploy
```

## Testing the Service

### Example Flow

```bash
# 1. Create order
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123"}'
# Response: {"orderId": "order-xxx"}

# 2. Add items
curl -X POST http://localhost:3000/api/v1/orders/order-xxx/items \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod-1",
    "productName": "Laptop",
    "quantity": 1,
    "price": 999.99,
    "currency": "USD"
  }'

# 3. Add another item
curl -X POST http://localhost:3000/api/v1/orders/order-xxx/items \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod-2",
    "productName": "Mouse",
    "quantity": 2,
    "price": 29.99,
    "currency": "USD"
  }'

# 4. Get order (see current state)
curl http://localhost:3000/api/v1/orders/order-xxx

# 5. Confirm order
curl -X PUT http://localhost:3000/api/v1/orders/order-xxx/confirm

# 6. Ship order (requires payment first in real scenario)
curl -X PUT http://localhost:3000/api/v1/orders/order-xxx/ship \
  -H "Content-Type: application/json" \
  -d '{"trackingNumber": "TRACK-123"}'
```

## Event Sourcing

All state changes are stored as immutable events in the Event Store:

```typescript
// Events are stored in PostgreSQL
{
  id: "event-uuid",
  aggregateId: "order-xxx",
  aggregateType: "Order",
  eventType: "OrderCreated",
  version: 1,
  occurredAt: "2024-01-01T00:00:00Z",
  eventData: {
    userId: "user-123",
    items: [],
    totalAmount: 0,
    currency: "USD"
  }
}
```

The Order aggregate can be reconstructed by replaying all its events:

```typescript
const events = await eventStore.getEvents(orderId);
const order = Order.fromEvents(events);
```

## Observability

### OpenTelemetry Tracing

All operations are automatically traced:

- Traces exported to: `http://localhost:4318/v1/traces`
- View traces in Jaeger or similar tools
- Automatic span creation for commands, queries, and HTTP requests

### Metrics

Business metrics are collected:

- Request counts
- Error rates  
- Latency percentiles
- Custom business metrics

### Structured Logging

All logs include:
- Trace ID
- Span ID
- Service name
- Environment
- Timestamp

## Production Considerations

### Database

1. **Event Store**: Requires PostgreSQL with Prisma migrations
2. **Outbox Pattern**: Background worker polls every 5 seconds
3. **Indexes**: Ensure proper indexing on `aggregateId`, `eventType`, `occurredAt`

### Scaling

1. **Horizontal Scaling**: Multiple instances can run behind a load balancer
2. **Event Store**: Single source of truth, supports concurrent writes with optimistic locking
3. **Outbox Worker**: Only one instance should process messages (use leader election)

### Kubernetes

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
  ports:
    - port: 80
      targetPort: 3000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-service
        image: order-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: POSTGRES_HOST
          value: "postgres"
        - name: POSTGRES_DB
          value: "order_service"
        livenessProbe:
          httpGet:
            path: /api/health/live
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Next Steps

This Order Service demonstrates the core patterns. To build a complete system:

1. **Create Inventory Service**: Track stock levels, reserve/release inventory
2. **Create Payment Service**: Process payments, handle refunds
3. **Implement Sagas**: Coordinate order fulfillment across services
4. **Add Read Models**: Create projections for efficient queries
5. **Implement API Gateway**: Single entry point with routing and auth
6. **Add Authentication**: JWT tokens, OAuth2
7. **Monitoring Dashboard**: Grafana dashboards for metrics and traces
8. **CI/CD Pipeline**: Automated testing and deployment

## Learn More

- [Hexagonal Architecture](../../docs/architecture.md)
- [Event Sourcing](../../docs/event-sourcing.md)
- [CQRS Pattern](../../docs/cqrs.md)
- [Saga Pattern](../../docs/sagas.md)
- [API Versioning](../../docs/versioning.md)
