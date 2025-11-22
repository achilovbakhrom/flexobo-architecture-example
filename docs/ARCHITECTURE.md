# Flexobo Microservices - Architecture Overview

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Design Principles](#design-principles)
3. [Services Overview](#services-overview)
4. [Data Flow](#data-flow)
5. [Pattern Implementations](#pattern-implementations)
6. [Infrastructure](#infrastructure)
7. [Security](#security)
8. [Scalability](#scalability)

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         External Clients                         │
│                    (Web, Mobile, API Consumers)                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ↓
                    ┌──────────────────┐
                    │   Ingress/LB     │
                    │  (Kubernetes)    │
                    └────────┬─────────┘
                             │
                             ↓
                ┌────────────────────────┐
                │    API Gateway         │ ← Port 3001
                │  - Routing             │
                │  - Circuit Breaker     │
                │  - Rate Limiting       │
                │  - Authentication      │
                └───────┬────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ↓             ↓             ↓
   ┌─────────┐   ┌─────────┐   ┌──────────┐
   │ Order   │   │  Admin  │   │  Future  │
   │ Service │   │  Panel  │   │ Services │
   │ (3000)  │   │ (3002)  │   │          │
   └────┬────┘   └────┬────┘   └──────────┘
        │             │
        └──────┬──────┘
               ↓
    ┌──────────────────────┐
    │   Message Bus        │
    │   (RabbitMQ)         │
    │  - Events            │
    │  - Commands          │
    │  - Sagas             │
    └──────────┬───────────┘
               │
        ┌──────┴──────┐
        ↓             ↓
   ┌─────────┐   ┌─────────┐
   │PostgreSQL│   │  Redis  │
   │  Event   │   │  Cache  │
   │  Store   │   │  Store  │
   └─────────┘   └─────────┘
```

## Design Principles

### 1. Hexagonal Architecture (Ports & Adapters)

Each service follows hexagonal architecture:

```
┌────────────────────────────────────────────┐
│              Application Layer             │
│  ┌──────────────────────────────────────┐ │
│  │         Domain Layer (Core)          │ │
│  │  - Aggregates                        │ │
│  │  - Entities                          │ │
│  │  - Value Objects                     │ │
│  │  - Domain Events                     │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │    Application Services (Use Cases)  │ │
│  │  - Commands (Write)                  │ │
│  │  - Queries (Read)                    │ │
│  │  - Event Handlers                    │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
         ↑                         ↑
         │                         │
   ┌─────┴──────┐           ┌─────┴──────┐
   │   Inbound  │           │  Outbound  │
   │   Adapters │           │  Adapters  │
   │            │           │            │
   │ - REST API │           │ - Event    │
   │ - GraphQL  │           │   Store    │
   │ - CLI      │           │ - Message  │
   │            │           │   Bus      │
   └────────────┘           └────────────┘
```

### 2. CQRS (Command Query Responsibility Segregation)

Separate read and write operations:

**Write Side (Commands):**
- Handles state changes
- Emits domain events
- Uses event sourcing
- Optimized for writes

**Read Side (Queries):**
- Handles queries
- Uses projections
- Denormalized views
- Optimized for reads

### 3. Event-Driven Architecture

All state changes flow as events:

```
Command → Aggregate → Event → Event Store → Message Bus → Subscribers
```

### 4. Domain-Driven Design

- **Bounded Contexts:** Each service is a bounded context
- **Ubiquitous Language:** Consistent terminology
- **Aggregates:** Transactional boundaries
- **Domain Events:** Cross-aggregate communication

## Services Overview

### Order Service

**Responsibility:** Order lifecycle management

**Bounded Context:**
- Order Aggregate
- OrderItem Value Object
- Address Value Object
- Order Domain Events

**Commands:**
- CreateOrder
- CancelOrder
- UpdateOrderStatus

**Events:**
- OrderCreated
- OrderCancelled
- OrderStatusChanged

**Technology:**
- Event Store: PostgreSQL
- Snapshots: Every 10 events
- Outbox Pattern: Reliable messaging
- CQRS: Separate read/write models

### API Gateway

**Responsibility:** Entry point and routing

**Features:**
- **Request Routing:** Forward to appropriate service
- **Circuit Breaker:** Prevent cascade failures
- **Rate Limiting:** Protect from overload
- **Request Aggregation:** Combine multiple service calls
- **Authentication:** JWT validation
- **CORS:** Cross-origin support

**Patterns:**
- Circuit Breaker (Hystrix-style)
- Retry with exponential backoff
- Timeout handling
- Request caching

### Admin Panel

**Responsibility:** System administration

**Features:**
- User Management (CRUD)
- Role Management (RBAC)
- System Metrics
- Event Statistics
- Cache Management
- Audit Logs

**Technology:**
- PostgreSQL for persistence
- Redis for caching
- RabbitMQ for events
- JWT authentication

## Data Flow

### 1. Write Flow (Command)

```
1. Client sends POST /api/v1/orders
   ↓
2. API Gateway validates JWT
   ↓
3. Gateway routes to Order Service
   ↓
4. Order Service receives CreateOrderCommand
   ↓
5. Command Handler loads or creates Order Aggregate
   ↓
6. Aggregate validates business rules
   ↓
7. Aggregate generates OrderCreated event
   ↓
8. Event Store saves event
   ↓
9. Outbox Pattern writes to outbox table
   ↓
10. Outbox Processor publishes to RabbitMQ
    ↓
11. Event subscribers receive event
    ↓
12. Projections update read models
    ↓
13. Response returned to client
```

### 2. Read Flow (Query)

```
1. Client sends GET /api/v1/orders
   ↓
2. API Gateway validates JWT
   ↓
3. Gateway checks cache (Redis)
   ↓
4. If cache miss, route to Order Service
   ↓
5. Query Handler fetches from read model
   ↓
6. Result cached in Redis
   ↓
7. Response returned to client
```

### 3. Saga Flow (Distributed Transaction)

```
1. Order created
   ↓
2. OrderCreated event published
   ↓
3. Saga Orchestrator receives event
   ↓
4. Saga starts compensation-aware workflow
   ↓
5. Step 1: Reserve Inventory (external)
   ↓
6. Step 2: Process Payment (external)
   ↓
7. Step 3: Confirm Order
   ↓
8. If any step fails, compensate previous steps
   ↓
9. Saga completes or compensates
```

## Pattern Implementations

### 1. Event Sourcing

**Implementation:**
```typescript
// Event Store
interface EventStore {
  saveEvents(aggregateId: string, events: DomainEvent[]): Promise<void>;
  loadEvents(aggregateId: string): Promise<DomainEvent[]>;
  loadEventsFromVersion(aggregateId: string, version: number): Promise<DomainEvent[]>;
}

// Aggregate Base
abstract class AggregateRoot {
  private uncommittedEvents: DomainEvent[] = [];
  
  protected applyEvent(event: DomainEvent): void {
    this.apply(event);
    this.uncommittedEvents.push(event);
  }
  
  abstract apply(event: DomainEvent): void;
  
  getUncommittedEvents(): DomainEvent[] {
    return this.uncommittedEvents;
  }
}
```

**Benefits:**
- Complete audit trail
- Time-travel debugging
- Event replay
- Temporal queries

### 2. CQRS

**Write Model:**
```typescript
// Command
class CreateOrderCommand {
  constructor(
    public readonly items: OrderItem[],
    public readonly address: Address,
  ) {}
}

// Handler
class CreateOrderHandler {
  async execute(command: CreateOrderCommand): Promise<void> {
    const order = Order.create(command.items, command.address);
    await this.eventStore.save(order);
  }
}
```

**Read Model:**
```typescript
// Query
class GetOrderQuery {
  constructor(public readonly orderId: string) {}
}

// Handler
class GetOrderHandler {
  async execute(query: GetOrderQuery): Promise<OrderView> {
    return await this.repository.findById(query.orderId);
  }
}
```

### 3. Outbox Pattern

**Implementation:**
```typescript
// Transactional save
async saveOrder(order: Order): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    // Save events to event store
    await tx.event.createMany({
      data: order.getUncommittedEvents().map(event => ({
        aggregateId: order.id,
        type: event.type,
        data: event.data,
      })),
    });
    
    // Save to outbox for reliable delivery
    await tx.outbox.createMany({
      data: order.getUncommittedEvents().map(event => ({
        aggregateId: order.id,
        eventType: event.type,
        payload: event.data,
      })),
    });
  });
}

// Background processor
async processOutbox(): Promise<void> {
  const messages = await this.prisma.outbox.findMany({
    where: { processed: false },
    take: 100,
  });
  
  for (const message of messages) {
    await this.messageBus.publish(message.eventType, message.payload);
    await this.prisma.outbox.update({
      where: { id: message.id },
      data: { processed: true },
    });
  }
}
```

### 4. Circuit Breaker

**Implementation:**
```typescript
enum CircuitState {
  CLOSED = 'closed',    // Normal operation
  OPEN = 'open',        // Failing, reject requests
  HALF_OPEN = 'half_open', // Testing recovery
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failures = 0;
  private lastFailureTime?: Date;
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = CircuitState.CLOSED;
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    
    if (this.failures >= this.threshold) {
      this.state = CircuitState.OPEN;
    }
  }
}
```

### 5. Saga Pattern

**Choreography-based Saga:**
```typescript
// Saga definition
class OrderSaga {
  @SagaStart(OrderCreated)
  async onOrderCreated(event: OrderCreated): Promise<void> {
    // Start saga workflow
    await this.sagaManager.startSaga(event.orderId, {
      currentStep: 'RESERVE_INVENTORY',
      compensations: [],
    });
    
    // Emit command to reserve inventory
    await this.commandBus.send(new ReserveInventoryCommand(event.orderId));
  }
  
  @SagaStep(InventoryReserved)
  async onInventoryReserved(event: InventoryReserved): Promise<void> {
    // Move to next step
    await this.sagaManager.updateStep(event.orderId, 'PROCESS_PAYMENT');
    await this.commandBus.send(new ProcessPaymentCommand(event.orderId));
  }
  
  @SagaCompensation(PaymentFailed)
  async onPaymentFailed(event: PaymentFailed): Promise<void> {
    // Compensate: Release inventory
    await this.commandBus.send(new ReleaseInventoryCommand(event.orderId));
    await this.commandBus.send(new CancelOrderCommand(event.orderId));
  }
}
```

## Infrastructure

### PostgreSQL (Event Store)

**Schema Design:**
```sql
-- Event Store
CREATE TABLE events (
  id UUID PRIMARY KEY,
  aggregate_id VARCHAR(255) NOT NULL,
  aggregate_type VARCHAR(255) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(aggregate_id, version)
);

-- Outbox
CREATE TABLE outbox (
  id UUID PRIMARY KEY,
  aggregate_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Snapshots
CREATE TABLE snapshots (
  aggregate_id VARCHAR(255) PRIMARY KEY,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### RabbitMQ (Message Bus)

**Exchange Types:**
- **Topic Exchange:** Event routing by pattern
- **Direct Exchange:** Command routing
- **Fanout Exchange:** Broadcast events

**Queues:**
- `order.events` - Order domain events
- `admin.events` - Admin panel events
- `saga.orchestration` - Saga coordination

### Redis (Cache)

**Usage:**
- Query result caching
- Session storage
- Circuit breaker state
- Rate limiting counters

**Patterns:**
- Cache-Aside
- Write-Through
- TTL-based expiration

## Security

### Authentication

**JWT Token Structure:**
```json
{
  "sub": "user-id",
  "username": "john.doe",
  "email": "john@example.com",
  "roles": ["USER", "ADMIN"],
  "iat": 1635724800,
  "exp": 1635728400
}
```

### Authorization

**RBAC Implementation:**
- Roles: USER, MANAGER, ADMIN
- Guards: @Roles('ADMIN')
- Middleware: JWT validation
- Policies: Resource-based access

### Security Layers

1. **Network:** Service mesh / private network
2. **Transport:** TLS/SSL encryption
3. **Application:** JWT authentication
4. **Data:** Encrypted secrets, hashed passwords
5. **Audit:** Complete audit trail via events

## Scalability

### Horizontal Scaling

**Kubernetes Configuration:**
```yaml
# API Gateway: 3-20 replicas
# Order Service: 2-10 replicas
# Admin Panel: 2-5 replicas

horizontalPodAutoscaler:
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilization: 70%
  targetMemoryUtilization: 80%
```

### Database Scaling

**Read Replicas:**
- Master: Writes
- Replicas: Reads

**Partitioning:**
- Partition by aggregate ID
- Time-based partitioning for events

### Cache Strategy

**Multi-Layer Caching:**
1. **L1:** Application memory
2. **L2:** Redis (distributed)
3. **L3:** CDN (static content)

### Message Bus Scaling

**RabbitMQ Clustering:**
- Multiple nodes
- Queue mirroring
- Load balancing

## Performance Optimizations

### 1. Event Store Snapshots

Save snapshot every 10 events:
```typescript
if (events.length >= 10) {
  await this.snapshotStore.save(aggregateId, aggregate.getState());
}
```

### 2. Projection Optimization

Denormalized read models for fast queries:
```typescript
// Instead of joins, store denormalized view
interface OrderView {
  id: string;
  items: OrderItemView[];  // Embedded
  customer: CustomerView;  // Embedded
  totalAmount: number;     // Calculated
}
```

### 3. Caching Strategy

```typescript
// Cache frequently accessed data
async getOrder(id: string): Promise<OrderView> {
  const cached = await this.cache.get(`order:${id}`);
  if (cached) return cached;
  
  const order = await this.repository.findById(id);
  await this.cache.set(`order:${id}`, order, { ttl: 300 });
  return order;
}
```

## Monitoring & Observability

### Metrics

- **Business Metrics:** Orders/sec, revenue, conversion rate
- **System Metrics:** CPU, memory, disk, network
- **Application Metrics:** Request rate, error rate, latency

### Distributed Tracing

**OpenTelemetry Integration:**
```
Request ID: abc-123
├── API Gateway (5ms)
├── Order Service (25ms)
│   ├── Event Store Write (10ms)
│   └── Outbox Write (5ms)
└── Message Bus Publish (2ms)
Total: 47ms
```

### Logging

**Structured Logging:**
```json
{
  "timestamp": "2024-11-22T10:30:00Z",
  "level": "info",
  "service": "order-service",
  "traceId": "abc-123",
  "message": "Order created",
  "context": {
    "orderId": "order-456",
    "userId": "user-789",
    "amount": 299.99
  }
}
```

## Summary

This architecture provides:
- ✅ **Scalability:** Horizontal scaling, caching, async processing
- ✅ **Reliability:** Circuit breakers, retries, saga compensation
- ✅ **Maintainability:** Hexagonal architecture, CQRS, DDD
- ✅ **Observability:** Tracing, metrics, structured logging
- ✅ **Auditability:** Complete event history
- ✅ **Performance:** Snapshots, caching, denormalization
- ✅ **Security:** JWT, RBAC, encryption

The system is production-ready and can handle enterprise-level workloads.
