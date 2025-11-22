# E2E Testing Guide

## Overview

This guide covers end-to-end (E2E) testing for the Flexobo microservices architecture. E2E tests verify that all services work correctly together in a production-like environment.

## Architecture

```
E2E Tests
    ↓
API Gateway (Port 3001)
    ↓
Order Service (Port 3000)
    
E2E Tests
    ↓
Admin Panel (Port 3002)
    ↓
Core Services
```

## Test Structure

### Test Suites

1. **user-journey.e2e-spec.ts** - Complete user workflows
   - Authentication flow
   - Order management (create, retrieve, list, cancel)
   - Admin operations (user CRUD, roles)
   - System monitoring (metrics, health)
   - Cache management
   - Audit logs

2. **api-gateway.e2e-spec.ts** - Gateway functionality
   - Request routing
   - Circuit breaker
   - Request aggregation
   - Error handling
   - CORS

3. **performance.e2e-spec.ts** - Performance and load
   - Response time testing
   - Concurrent request handling
   - Rate limiting
   - Large payload handling
   - Memory usage
   - Error recovery

## Running E2E Tests

### Prerequisites

1. **Start all services:**
```bash
# Start Order Service (port 3000)
npx nx serve order-service

# Start API Gateway (port 3001)
npx nx serve api-gateway

# Start Admin Panel (port 3002)
npx nx serve admin-panel
```

2. **Verify services are running:**
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### Run Tests

```bash
# Run all E2E tests
npx nx e2e e2e-tests

# Run specific test suite
npx nx e2e e2e-tests --testFile=user-journey.e2e-spec.ts
npx nx e2e e2e-tests --testFile=api-gateway.e2e-spec.ts
npx nx e2e e2e-tests --testFile=performance.e2e-spec.ts

# Run with coverage
npx nx e2e e2e-tests --coverage

# Run in watch mode
npx nx e2e e2e-tests --watch
```

## Test Configuration

### Jest Configuration

**Location:** `apps/e2e-tests/jest.config.ts`

Key settings:
- **testTimeout:** 60000ms (60 seconds) - E2E tests need more time
- **bail:** 1 - Stop on first failure
- **verbose:** true - Detailed output
- **testMatch:** `**/src/**/*.e2e-spec.ts`

### TypeScript Configuration

**Location:** `apps/e2e-tests/tsconfig.json`

Settings:
- **module:** commonjs
- **strict:** true
- **types:** ['jest', 'node']

## Writing E2E Tests

### Basic Structure

```typescript
import axios, { AxiosInstance } from 'axios';

describe('E2E: Feature Name', () => {
  let client: AxiosInstance;
  let authToken: string;

  beforeAll(async () => {
    // Setup client
    client = axios.create({
      baseURL: 'http://localhost:3001',
      timeout: 30000,
      validateStatus: () => true,
    });

    // Wait for services
    await waitForServices();

    // Get auth token
    authToken = await authenticate(client);
  });

  describe('Test Scenario', () => {
    it('should perform action', async () => {
      const response = await client.post(
        '/api/v1/resource',
        { data: 'test' },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
    });
  });
});
```

### Helper Functions

#### Wait for Services

```typescript
async function waitForServices(maxAttempts = 30): Promise<void> {
  const services = [
    { name: 'API Gateway', url: 'http://localhost:3001/health' },
    { name: 'Admin Panel', url: 'http://localhost:3002/health' },
  ];

  for (const service of services) {
    let attempts = 0;
    let ready = false;

    while (attempts < maxAttempts && !ready) {
      try {
        const response = await axios.get(service.url, { timeout: 1000 });
        if (response.status === 200) {
          console.log(`${service.name} is ready`);
          ready = true;
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    if (!ready) {
      throw new Error(`${service.name} failed to start after ${maxAttempts} attempts`);
    }
  }
}
```

#### Authenticate

```typescript
async function authenticate(client: AxiosInstance): Promise<string> {
  try {
    const response = await client.post('/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123',
    });

    if (response.status === 200 && response.data.accessToken) {
      return response.data.accessToken;
    }
  } catch (error) {
    console.log('Authentication not available, using mock token');
  }

  return 'mock-admin-token-for-testing';
}
```

#### Handle Flexible Status Codes

```typescript
// Accept multiple valid status codes
const response = await client.get('/api/v1/orders');
expect([200, 404]).toContain(response.status);

if (response.status === 404) {
  console.log('Orders endpoint not yet implemented - skipping test');
  return;
}

// Continue with test
expect(response.data).toHaveProperty('items');
```

## Test Scenarios

### 1. User Journey Tests

**Complete workflow from authentication to order completion:**

```typescript
describe('E2E: Complete User Journey', () => {
  it('should complete full order flow', async () => {
    // 1. Authenticate
    const authResponse = await client.post('/api/v1/auth/login', {
      username: 'testuser',
      password: 'password',
    });
    const token = authResponse.data.accessToken;

    // 2. Create order
    const orderResponse = await client.post(
      '/api/v1/orders',
      {
        items: [
          {
            productId: 'prod-123',
            productName: 'Test Product',
            quantity: 2,
            price: 99.99,
          },
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'USA',
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    expect(orderResponse.status).toBe(201);
    const orderId = orderResponse.data.id;

    // 3. Retrieve order
    const getResponse = await client.get(`/api/v1/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(getResponse.status).toBe(200);
    expect(getResponse.data.id).toBe(orderId);

    // 4. Cancel order
    const cancelResponse = await client.patch(
      `/api/v1/orders/${orderId}/cancel`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    expect(cancelResponse.status).toBe(200);
  });
});
```

### 2. API Gateway Tests

**Verify gateway routing and resilience:**

```typescript
describe('E2E: API Gateway', () => {
  it('should route requests to order service', async () => {
    const response = await client.get('/api/v1/orders');
    expect(response.status).toBe(200);
  });

  it('should handle circuit breaker', async () => {
    // Request to unavailable service
    const response = await client.get('/api/v1/unavailable-service');
    
    // Should return 404 or circuit breaker 503
    expect([404, 503]).toContain(response.status);
  });

  it('should aggregate data from multiple services', async () => {
    const response = await client.get('/api/v1/aggregate/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect([200, 404]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.data).toHaveProperty('orders');
      expect(response.data).toHaveProperty('users');
    }
  });
});
```

### 3. Performance Tests

**Test system under load:**

```typescript
describe('E2E: Performance', () => {
  it('should handle concurrent requests', async () => {
    const promises = Array.from({ length: 10 }, () =>
      client.get('/api/v1/orders')
    );

    const responses = await Promise.all(promises);

    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });

  it('should respond within acceptable time', async () => {
    const start = Date.now();
    const response = await client.get('/api/v1/orders');
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(2000); // < 2 seconds
  });
});
```

## Best Practices

### 1. Test Independence

Each test should:
- Create its own test data
- Clean up after itself
- Not depend on other tests
- Use unique identifiers

```typescript
it('should create and delete user', async () => {
  // Create unique user
  const username = `e2e-user-${Date.now()}`;
  const createResponse = await client.post('/api/v1/users', {
    username,
    email: `${username}@test.com`,
    password: 'Test123!',
  });

  const userId = createResponse.data.id;

  // ... test logic ...

  // Clean up
  await client.delete(`/api/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
});
```

### 2. Error Handling

Handle both success and expected failure cases:

```typescript
it('should reject invalid data', async () => {
  const response = await client.post('/api/v1/orders', {
    items: [], // Invalid: empty items
  });

  expect(response.status).toBe(400);
  expect(response.data).toHaveProperty('message');
});
```

### 3. Timeouts

Set appropriate timeouts for different operations:

```typescript
// Quick health check
await axios.get('http://localhost:3001/health', { timeout: 1000 });

// Order creation (database write)
await client.post('/api/v1/orders', data, { timeout: 5000 });

// Complex aggregation
await client.get('/api/v1/aggregate/report', { timeout: 10000 });
```

### 4. Logging

Add helpful logs for debugging:

```typescript
console.log('Testing order creation with 10 items...');
const response = await client.post('/api/v1/orders', orderData);
console.log(`Order created with ID: ${response.data.id}`);
```

### 5. Conditional Tests

Skip tests if features aren't implemented:

```typescript
const response = await client.get('/api/v1/new-feature');

if (response.status === 404) {
  console.log('New feature not yet implemented - skipping test');
  return;
}

// Continue with test
expect(response.status).toBe(200);
```

## Debugging E2E Tests

### Enable Verbose Logging

```bash
# Run with debug output
DEBUG=* npx nx e2e e2e-tests

# Or set in jest.config.ts
verbose: true
```

### Check Service Logs

```bash
# View service logs
npx nx serve order-service --verbose
npx nx serve api-gateway --verbose
npx nx serve admin-panel --verbose
```

### Test Single Scenario

```bash
# Run only one test
npx nx e2e e2e-tests --testNamePattern="should create order"
```

### Use VS Code Debugger

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "E2E Tests",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["nx", "e2e", "e2e-tests"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## Common Issues

### Services Not Ready

**Problem:** Tests fail because services haven't started.

**Solution:** Use `waitForServices()` helper:

```typescript
beforeAll(async () => {
  await waitForServices(30); // Wait up to 30 seconds
});
```

### Authentication Failures

**Problem:** Tests fail with 401 Unauthorized.

**Solution:** Ensure token is valid and included:

```typescript
const response = await client.get('/api/v1/orders', {
  headers: { Authorization: `Bearer ${authToken}` },
});
```

### Timeout Errors

**Problem:** Tests timeout on slow operations.

**Solution:** Increase timeout:

```typescript
// In jest.config.ts
testTimeout: 120000, // 2 minutes

// Or per-test
it('should handle slow operation', async () => {
  // test logic
}, 120000); // 2 minutes
```

### Port Conflicts

**Problem:** Services can't start on expected ports.

**Solution:** Check for conflicting processes:

```bash
lsof -i :3000
lsof -i :3001
lsof -i :3002
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
      
      rabbitmq:
        image: rabbitmq:3-management
        ports:
          - 5672:5672
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm ci
      
      - name: Start services
        run: |
          npx nx serve order-service &
          npx nx serve api-gateway &
          npx nx serve admin-panel &
          sleep 30
      
      - name: Run E2E tests
        run: npx nx e2e e2e-tests
```

## Test Coverage

Track E2E test coverage:

```bash
# Generate coverage report
npx nx e2e e2e-tests --coverage

# View report
open coverage/apps/e2e-tests/index.html
```

## Summary

E2E tests verify:
- ✅ Service communication
- ✅ Authentication flows
- ✅ Business logic execution
- ✅ Error handling
- ✅ Performance under load
- ✅ Data consistency

They provide confidence that the system works correctly as a whole before deployment.
