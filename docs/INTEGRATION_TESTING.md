# Integration Testing Guide

This guide covers integration testing for the Flexobo microservices architecture.

## Overview

Integration tests verify that components work together correctly:
- HTTP endpoints and request validation
- Authentication and authorization
- Service-to-service communication
- Database operations
- Event handling
- Cache operations

## Test Structure

### Order Service Tests
Location: `apps/order-service/src/app/__tests__/order.integration.spec.ts`

**Coverage:**
- ✅ Order creation with validation
- ✅ Order retrieval by ID
- ✅ Order listing with pagination
- ✅ Order cancellation
- ✅ Status transitions
- ✅ Total amount calculations
- ✅ Input validation (negative quantities, prices)
- ✅ Error handling (404, 400 responses)

### Admin Panel Tests
Location: `apps/admin-panel/src/app/__tests__/admin-panel.integration.spec.ts`

**Coverage:**
- ✅ User management (CRUD operations)
- ✅ JWT authentication requirement
- ✅ ADMIN role enforcement
- ✅ Email/username uniqueness validation
- ✅ Role management
- ✅ Audit log retrieval
- ✅ System metrics endpoints
- ✅ Cache management
- ✅ Pagination and search

### Core Library Tests
Location: `libs/core/src/lib/__tests__/core.integration.spec.ts`

**Coverage:**
- ✅ Event Store operations
- ✅ Optimistic locking
- ✅ Outbox pattern
- ✅ Cache service operations
- ✅ Circuit breaker states
- ✅ Timeout handling

## Running Tests

### Run All Integration Tests

```bash
# Run all tests across the monorepo
npx nx run-many --target=test --all

# Run tests in parallel
npx nx run-many --target=test --all --parallel=3
```

### Run Tests for Specific Project

```bash
# Order service tests
npx nx test order-service

# Admin panel tests
npx nx test admin-panel

# Core library tests
npx nx test core
```

### Run Tests in Watch Mode

```bash
# Watch mode for development
npx nx test order-service --watch

# With coverage
npx nx test order-service --coverage
```

### Run Specific Test File

```bash
# Run specific test file
npx nx test order-service --testFile=order.integration.spec.ts
```

### Run Tests with Verbose Output

```bash
npx nx test order-service --verbose
```

## Test Configuration

### Jest Configuration

Each project has its own `jest.config.cts`:

```typescript
export default {
  displayName: 'order-service',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/order-service',
  testMatch: ['**/__tests__/**/*.spec.ts'],
};
```

### Required Dependencies

Add to `package.json` if missing:

```json
{
  "devDependencies": {
    "@nestjs/testing": "^11.0.0",
    "@types/jest": "^29.5.0",
    "@types/supertest": "^2.0.12",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0"
  }
}
```

## Writing Integration Tests

### Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { YourModule } from '../your.module';

describe('Your Service Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [YourModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same middleware as production
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /endpoint', () => {
    it('should return data', async () => {
      const response = await request(app.getHttpServer())
        .get('/endpoint')
        .expect(200);

      expect(response.body).toMatchObject({
        key: 'value',
      });
    });
  });
});
```

### Testing with Authentication

```typescript
import { JwtService } from '@flexobo/core';

describe('Protected Endpoints', () => {
  let jwtService: JwtService;
  let adminToken: string;

  beforeAll(async () => {
    jwtService = moduleFixture.get<JwtService>(JwtService);
    adminToken = jwtService.generateAccessToken({
      sub: 'admin-123',
      email: 'admin@test.com',
      username: 'admin',
      roles: ['ADMIN'],
    });
  });

  it('should require authentication', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .expect(401);
  });

  it('should accept valid token', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
```

### Testing Error Cases

```typescript
describe('Error Handling', () => {
  it('should return 400 for invalid input', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send({
        items: [], // Invalid: empty array
      })
      .expect(400);
  });

  it('should return 404 for non-existent resource', async () => {
    await request(app.getHttpServer())
      .get('/orders/non-existent-id')
      .expect(404);
  });

  it('should return 409 for conflicts', async () => {
    // Create first user
    await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@test.com', username: 'test', password: 'pass' });

    // Try to create duplicate
    await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@test.com', username: 'test2', password: 'pass' })
      .expect(409);
  });
});
```

### Testing Pagination

```typescript
describe('Pagination', () => {
  it('should paginate results', async () => {
    const response = await request(app.getHttpServer())
      .get('/orders')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(response.body).toMatchObject({
      data: expect.any(Array),
      total: expect.any(Number),
      page: 1,
      limit: 10,
      totalPages: expect.any(Number),
    });
  });

  it('should respect limit parameter', async () => {
    const response = await request(app.getHttpServer())
      .get('/orders')
      .query({ limit: 5 })
      .expect(200);

    expect(response.body.data.length).toBeLessThanOrEqual(5);
  });
});
```

## Test Coverage

### Generate Coverage Report

```bash
# Generate coverage for specific project
npx nx test order-service --coverage

# View coverage report
open coverage/apps/order-service/lcov-report/index.html
```

### Coverage Thresholds

Configure in `jest.config.cts`:

```typescript
export default {
  // ... other config
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Best Practices

### 1. Test Independence

Each test should be independent and not rely on others:

```typescript
// ✅ Good: Create fresh data for each test
beforeEach(async () => {
  const response = await request(app.getHttpServer())
    .post('/users')
    .send({ email: 'test@test.com' });
  userId = response.body.id;
});

// ❌ Bad: Relying on shared state
let sharedUserId: string;
it('creates user', async () => {
  const response = await request(app.getHttpServer()).post('/users');
  sharedUserId = response.body.id;
});
it('gets user', async () => {
  await request(app.getHttpServer()).get(`/users/${sharedUserId}`);
});
```

### 2. Clean Test Data

Clean up after tests to avoid interference:

```typescript
afterEach(async () => {
  // Clean up test data
  await cleanupTestData();
});
```

### 3. Use Descriptive Test Names

```typescript
// ✅ Good
it('should reject order creation with negative quantity', async () => {});

// ❌ Bad
it('test1', async () => {});
```

### 4. Test Happy and Sad Paths

```typescript
describe('POST /orders', () => {
  it('should create order with valid data', async () => {});
  it('should reject order with invalid data', async () => {});
  it('should reject order with missing fields', async () => {});
  it('should reject order with negative values', async () => {});
});
```

### 5. Use Test Fixtures

```typescript
const validOrder = {
  items: [
    {
      productId: 'prod-123',
      productName: 'Widget',
      quantity: 2,
      price: 29.99,
    },
  ],
  shippingAddress: {
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA',
  },
};

it('should create order', async () => {
  await request(app.getHttpServer())
    .post('/orders')
    .send(validOrder)
    .expect(201);
});
```

## Troubleshooting

### Tests Timeout

Increase timeout in jest.config.cts:

```typescript
export default {
  testTimeout: 30000, // 30 seconds
};
```

### Port Already in Use

Tests use ephemeral ports by default. If issues persist:

```typescript
beforeAll(async () => {
  await app.init();
  await app.listen(0); // Let OS assign port
});
```

### Module Not Found

Check tsconfig.spec.json includes test files:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "module": "commonjs",
    "types": ["jest", "node"]
  },
  "include": ["**/*.spec.ts", "**/*.test.ts", "**/*.d.ts"]
}
```

### Supertest Errors

Install missing types:

```bash
npm install --save-dev @types/supertest
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx nx run-many --target=test --all --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/**/lcov.info
```

## Next Steps

After integration tests, proceed to:
- **Step 24**: E2E Tests (full system testing)
- **Step 25**: Docker Configuration (containerization)
- **Step 26**: Kubernetes Deployment (orchestration)

## Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Nx Testing Documentation](https://nx.dev/recipes/jest/test-setup)
