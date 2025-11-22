# API Gateway

A production-ready API Gateway that serves as the single entry point for all microservices with:
- ✅ **Dynamic Routing** - Route requests to appropriate microservices
- ✅ **Circuit Breaker** - Protect downstream services with circuit breaker pattern
- ✅ **Request Aggregation** - Combine multiple API calls into one
- ✅ **Health Checks** - Kubernetes-ready probes
- ✅ **OpenTelemetry** - Distributed tracing and metrics
- ✅ **CORS Support** - Cross-origin resource sharing
- ✅ **Request Validation** - Automatic validation with class-validator

## Architecture

```
apps/api-gateway/
├── src/
│   ├── gateway/
│   │   ├── gateway.types.ts       # Type definitions
│   │   ├── proxy.service.ts       # HTTP proxy with circuit breaker
│   │   ├── routing.service.ts     # Route registration and matching
│   │   ├── aggregation.service.ts # Multi-request aggregation
│   │   ├── gateway.controller.ts  # Main request handler
│   │   └── gateway.module.ts      # NestJS module configuration
│   └── main.ts                    # Application entry point
```

## Features

### 1. Dynamic Routing

Routes incoming requests to the appropriate microservice based on path prefix:

```typescript
// Configuration
{
  name: 'order-service',
  baseUrl: 'http://localhost:3001',
  prefix: '/api/v1/orders',    // All /api/v1/orders/* go here
  healthCheckPath: '/api/health',
  timeout: 5000
}
```

Requests are automatically forwarded:
- `GET /api/v1/orders/123` → `http://localhost:3001/api/v1/orders/123`
- `POST /api/v1/orders` → `http://localhost:3001/api/v1/orders`

### 2. Circuit Breaker

Protects downstream services from cascading failures:

- **CLOSED**: Normal operation, requests flow through
- **OPEN**: Service is failing, requests are rejected immediately
- **HALF_OPEN**: Testing if service recovered

Each service gets its own circuit breaker with configurable thresholds.

### 3. Request Aggregation

Combine multiple API calls into a single request:

```http
POST /api/aggregate
Content-Type: application/json

{
  "endpoints": [
    {
      "name": "order",
      "url": "/api/v1/orders/order-123"
    },
    {
      "name": "user",
      "url": "/api/v1/users/user-456"
    }
  ],
  "failFast": false,
  "timeout": 10000
}

Response: 200 OK
{
  "order": {
    "success": true,
    "data": { "id": "order-123", ... },
    "statusCode": 200
  },
  "user": {
    "success": true,
    "data": { "id": "user-456", ... },
    "statusCode": 200
  }
}
```

### 4. Health Checks

```http
# Overall health
GET /api/health

# Liveness probe (Kubernetes)
GET /api/health/live

# Readiness probe (Kubernetes)
GET /api/health/ready
```

### 5. Route Discovery

```http
GET /api/gateway/routes

Response: 200 OK
[
  {
    "name": "order-service",
    "baseUrl": "http://localhost:3001",
    "prefix": "/api/v1/orders",
    "enabled": true,
    "timeout": 5000
  }
]
```

## Configuration

### Environment Variables

```bash
# Gateway Configuration
PORT=3000
NODE_ENV=production

# CORS
CORS_ORIGIN=*

# Service URLs
ORDER_SERVICE_URL=http://localhost:3001
INVENTORY_SERVICE_URL=http://localhost:3002
PAYMENT_SERVICE_URL=http://localhost:3003

# OpenTelemetry
OTEL_TRACE_ENDPOINT=http://localhost:4318/v1/traces
OTEL_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
```

### Adding New Services

Edit `gateway.module.ts`:

```typescript
onModuleInit() {
  const config: GatewayConfig = {
    port: 3000,
    services: [
      {
        name: 'order-service',
        baseUrl: 'http://localhost:3001',
        prefix: '/api/v1/orders',
        healthCheckPath: '/api/health',
        enabled: true,
        timeout: 5000,
        retry: {
          attempts: 3,
          delay: 1000,
        },
      },
      {
        name: 'inventory-service',
        baseUrl: 'http://localhost:3002',
        prefix: '/api/v1/inventory',
        healthCheckPath: '/api/health',
        enabled: true,
        timeout: 5000,
      },
      // Add more services...
    ],
  };

  this.routingService.registerRoutes(config.services);
}
```

## Running the Gateway

### Development

```bash
# Start the gateway
npx nx serve api-gateway

# Or build and run
npx nx build api-gateway
node dist/apps/api-gateway/main.js
```

### Production

```bash
# Build for production
npx nx build api-gateway --configuration=production

# Run
node dist/apps/api-gateway/main.js
```

## Usage Examples

### 1. Basic Request Routing

```bash
# Create an order (routed to order-service)
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123"}'

# Get order (routed to order-service)
curl http://localhost:3000/api/v1/orders/order-123
```

### 2. Request Aggregation

```bash
# Get order and user data in one request
curl -X POST http://localhost:3000/api/aggregate \
  -H "Content-Type: application/json" \
  -d '{
    "endpoints": [
      {
        "name": "order",
        "url": "/api/v1/orders/order-123"
      },
      {
        "name": "user",
        "url": "/api/v1/users/user-456"
      },
      {
        "name": "inventory",
        "url": "/api/v1/inventory/check",
        "method": "POST"
      }
    ],
    "timeout": 5000
  }'
```

### 3. Check Available Routes

```bash
curl http://localhost:3000/api/gateway/routes
```

### 4. Health Check

```bash
# Overall health
curl http://localhost:3000/api/health

# Liveness (is gateway running?)
curl http://localhost:3000/api/health/live

# Readiness (is gateway ready to serve traffic?)
curl http://localhost:3000/api/health/ready
```

## Circuit Breaker Behavior

### Normal Operation (CLOSED)

```
Request → Gateway → [Circuit Breaker: CLOSED] → Service
                                                     ↓
                                                  Success
```

### Service Failing (OPEN)

```
Request → Gateway → [Circuit Breaker: OPEN] → ❌ Immediate Reject
                    (5 failures detected)      (503 Service Unavailable)
```

After 30 seconds, circuit moves to HALF_OPEN:

```
Request → Gateway → [Circuit Breaker: HALF_OPEN] → Service
                    (testing if recovered)              ↓
                                                    Success?
                                                       ↓
                                            [Circuit: CLOSED]
```

### Configuration

Each service circuit breaker:
- **Failure Threshold**: 5 consecutive failures
- **Success Threshold**: 2 successes in HALF_OPEN to close
- **Timeout Window**: 60 seconds
- **Reset Timeout**: 30 seconds before trying HALF_OPEN

## Request/Response Flow

```
1. Client Request
   ↓
2. API Gateway
   ↓
3. Find Route (routing.service)
   ↓
4. Circuit Breaker Check
   ↓
5. Forward Request (proxy.service)
   ↓
6. Downstream Service
   ↓
7. Transform Response
   ↓
8. Return to Client
```

## Observability

### Distributed Tracing

All requests are traced end-to-end:

```
Span: Gateway.proxyRequest
  ├─ Span: CircuitBreaker.execute
  │   └─ Span: HTTP.request (to order-service)
  └─ Span: Response.transform
```

View traces in Jaeger or similar OpenTelemetry-compatible tools.

### Metrics

Automatic metrics collection:
- Request count by route
- Request duration by route
- Circuit breaker state changes
- Error rates
- Latency percentiles (p50, p95, p99)

### Logging

Structured logs with:
- Request ID
- Trace ID
- Service name
- Route matched
- Response status
- Duration

## Error Handling

### Gateway Errors

| Status | Error | Description |
|--------|-------|-------------|
| 404 | Not Found | No route matches the request path |
| 503 | Service Unavailable | Circuit breaker is OPEN |
| 504 | Gateway Timeout | Request to downstream service timed out |
| 500 | Internal Server Error | Unexpected error in gateway |

### Downstream Errors

Gateway forwards the exact status code and body from downstream services.

## Kubernetes Deployment

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  type: LoadBalancer
  selector:
    app: api-gateway
  ports:
    - port: 80
      targetPort: 3000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: PORT
          value: "3000"
        - name: ORDER_SERVICE_URL
          value: "http://order-service:80"
        - name: INVENTORY_SERVICE_URL
          value: "http://inventory-service:80"
        - name: PAYMENT_SERVICE_URL
          value: "http://payment-service:80"
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
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Production Considerations

### Scaling

- **Horizontal Scaling**: Run multiple gateway instances behind a load balancer
- **Stateless**: Gateway is stateless, no session affinity required
- **Circuit Breaker State**: Each instance maintains its own circuit breaker state

### Performance

- **Connection Pooling**: HTTP connections are pooled automatically by Node.js
- **Timeouts**: Configure appropriate timeouts for each service
- **Retries**: Automatic retry with exponential backoff (configured per service)

### Security

1. **Rate Limiting**: Add rate limiting per IP/user
2. **Authentication**: Validate JWT tokens before forwarding
3. **Input Validation**: Validate and sanitize all inputs
4. **HTTPS**: Use TLS for all communications
5. **CORS**: Configure allowed origins properly

### Monitoring

1. **Metrics Dashboard**: Create Grafana dashboards for:
   - Request rate by service
   - Error rate by service
   - Circuit breaker states
   - Latency percentiles

2. **Alerts**: Set up alerts for:
   - High error rate
   - Circuit breaker opens
   - High latency
   - Service unavailability

3. **Logging**: Ship logs to centralized logging (ELK, Splunk)

## Advanced Features

### Request Transformation

Add middleware to transform requests before forwarding:

```typescript
// Add in gateway.controller.ts
@UseInterceptors(RequestTransformerInterceptor)
@All('*')
async proxyRequest(...) {
  // Requests are transformed before reaching here
}
```

### Response Caching

Add caching for GET requests:

```typescript
// Cache frequently accessed resources
const cacheKey = `${route.name}:${request.url}`;
const cached = await cache.get(cacheKey);

if (cached) {
  return cached;
}

const response = await proxy.forward(...);
await cache.set(cacheKey, response, 60); // 60s TTL
```

### Authentication Integration

```typescript
// Validate JWT before forwarding
const token = request.headers['authorization'];
const user = await authService.validateToken(token);

// Add user context to forwarded request
request.headers['x-user-id'] = user.id;
request.headers['x-user-roles'] = user.roles.join(',');
```

## Testing

### Unit Tests

```bash
npx nx test api-gateway
```

### Integration Tests

```bash
# Start services
docker-compose up -d

# Run tests
npx nx test api-gateway --testPathPattern=integration

# Stop services
docker-compose down
```

### Load Testing

```bash
# Install k6
brew install k6

# Run load test
k6 run load-test.js
```

## Troubleshooting

### Circuit Breaker Keeps Opening

1. Check downstream service health
2. Increase failure threshold
3. Increase timeout
4. Check network connectivity

### High Latency

1. Enable request tracing
2. Check downstream service performance
3. Review timeout configurations
4. Consider caching

### 404 Not Found

1. Check route configuration
2. Verify service URL is correct
3. Check service health
4. Review logs for routing errors

## Next Steps

1. **Add Authentication**: Implement JWT validation
2. **Add Rate Limiting**: Protect against abuse
3. **Add Caching**: Cache frequent requests
4. **Add Request/Response Transformation**: Modify data before/after forwarding
5. **Add API Composition**: Create new endpoints that aggregate data
6. **Add WebSocket Support**: Proxy WebSocket connections
7. **Add GraphQL Gateway**: Federate multiple GraphQL services

## Learn More

- [Circuit Breaker Pattern](../../docs/circuit-breaker.md)
- [API Gateway Pattern](../../docs/api-gateway.md)
- [Request Aggregation](../../docs/request-aggregation.md)
- [OpenTelemetry](../../docs/observability.md)
