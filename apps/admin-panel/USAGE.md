# Admin Panel Service - Usage Guide

Complete examples for using the Admin Panel Service API.

## Prerequisites

1. **Authentication**: All endpoints require JWT authentication with ADMIN role
2. **JWT Token**: Obtain from authentication service
3. **Base URL**: `http://localhost:3002`

## Authentication

First, get a JWT token with ADMIN role:

```bash
# Login to get JWT token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'

# Response
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900
}
```

Use the `accessToken` in all subsequent requests:

```bash
export TOKEN="your-jwt-token-here"
```

## User Management

### List All Users

```bash
curl -X GET "http://localhost:3002/api/v1/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by email or username
- `sortBy` (optional): Field to sort by
- `sortOrder` (optional): `asc` or `desc`

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "username": "john_doe",
      "roles": ["USER"],
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

### Get User by ID

```bash
curl -X GET "http://localhost:3002/api/v1/admin/users/{userId}" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "username": "john_doe",
  "roles": ["USER"],
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "lastLoginAt": "2024-01-20T08:15:00.000Z"
}
```

### Create New User

```bash
curl -X POST "http://localhost:3002/api/v1/admin/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "username": "newuser",
    "password": "SecurePass123!",
    "roles": ["USER"]
  }'
```

**Request Body:**
```typescript
{
  email: string;        // Valid email address
  username: string;     // Unique username
  password: string;     // Strong password
  roles?: UserRole[];   // Optional, defaults to [USER]
}
```

**Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "email": "newuser@example.com",
  "username": "newuser",
  "roles": ["USER"],
  "isActive": true,
  "createdAt": "2024-01-22T14:30:00.000Z",
  "updatedAt": "2024-01-22T14:30:00.000Z"
}
```

### Update User

```bash
curl -X PUT "http://localhost:3002/api/v1/admin/users/{userId}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "updated@example.com",
    "isActive": false
  }'
```

**Request Body (all fields optional):**
```typescript
{
  email?: string;
  username?: string;
  password?: string;
  isActive?: boolean;
}
```

### Update User Roles

```bash
curl -X PUT "http://localhost:3002/api/v1/admin/users/{userId}/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roles": ["USER", "MANAGER"]
  }'
```

**Available Roles:**
- `ADMIN` - Full system access
- `MANAGER` - Management access
- `USER` - Standard user access
- `GUEST` - Limited access

### Delete User

```bash
curl -X DELETE "http://localhost:3002/api/v1/admin/users/{userId}" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `204 No Content`

## Audit Logs

### List Audit Logs

```bash
curl -X GET "http://localhost:3002/api/v1/admin/audit-logs?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "username": "admin",
      "action": "CREATE",
      "resource": "USER",
      "resourceId": "660e8400-e29b-41d4-a716-446655440001",
      "metadata": {
        "email": "newuser@example.com",
        "username": "newuser"
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "curl/7.68.0",
      "timestamp": "2024-01-22T14:30:00.000Z"
    }
  ],
  "total": 1234,
  "page": 1,
  "limit": 20,
  "totalPages": 62
}
```

### Get Audit Log by ID

```bash
curl -X GET "http://localhost:3002/api/v1/admin/audit-logs/{logId}" \
  -H "Authorization: Bearer $TOKEN"
```

## System Metrics

### Get All System Metrics

```bash
curl -X GET "http://localhost:3002/api/v1/admin/metrics" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "services": [
    {
      "name": "api-gateway",
      "status": "healthy",
      "uptime": 86400,
      "responseTime": 45,
      "errorRate": 0.001,
      "lastCheck": "2024-01-22T15:00:00.000Z"
    },
    {
      "name": "order-service",
      "status": "healthy",
      "uptime": 86400,
      "responseTime": 120,
      "errorRate": 0.002,
      "lastCheck": "2024-01-22T15:00:00.000Z"
    }
  ],
  "events": {
    "totalEvents": 15432,
    "eventsByType": {
      "OrderCreated": 3421,
      "OrderUpdated": 1234,
      "PaymentProcessed": 2890
    },
    "eventsLast24h": 1234,
    "eventsLast7d": 8765,
    "averageProcessingTime": 45.5
  },
  "cache": {
    "totalKeys": 1234,
    "hitRate": 0.85,
    "missRate": 0.15,
    "memoryUsage": 52428800,
    "evictions": 45
  },
  "timestamp": "2024-01-22T15:00:00.000Z"
}
```

### Get Service Health

```bash
curl -X GET "http://localhost:3002/api/v1/admin/metrics/services" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "name": "api-gateway",
    "status": "healthy",
    "uptime": 86400,
    "responseTime": 45,
    "errorRate": 0.001,
    "lastCheck": "2024-01-22T15:00:00.000Z"
  }
]
```

### Get Event Statistics

```bash
curl -X GET "http://localhost:3002/api/v1/admin/metrics/events" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "totalEvents": 15432,
  "eventsByType": {
    "OrderCreated": 3421,
    "OrderUpdated": 1234,
    "OrderCancelled": 567,
    "PaymentProcessed": 2890
  },
  "eventsLast24h": 1234,
  "eventsLast7d": 8765,
  "averageProcessingTime": 45.5
}
```

### Get Cache Statistics

```bash
curl -X GET "http://localhost:3002/api/v1/admin/metrics/cache" \
  -H "Authorization: Bearer $TOKEN"
```

## Cache Management

### List Cache Entries

```bash
curl -X GET "http://localhost:3002/api/v1/admin/cache" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "key": "order:123",
    "value": {
      "id": "123",
      "status": "completed"
    },
    "ttl": 3600,
    "createdAt": "2024-01-22T14:00:00.000Z"
  }
]
```

### Invalidate Cache Entry

```bash
curl -X DELETE "http://localhost:3002/api/v1/admin/cache/{cacheKey}" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `204 No Content`

### Invalidate All Cache

```bash
curl -X DELETE "http://localhost:3002/api/v1/admin/cache" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `204 No Content`

## Error Responses

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Insufficient permissions. Required roles: ADMIN",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "User with ID 123 not found",
  "error": "Not Found"
}
```

### 409 Conflict

```json
{
  "statusCode": 409,
  "message": "User with email john@example.com already exists",
  "error": "Conflict"
}
```

## TypeScript Client Example

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3002/api/v1/admin',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

// List users
const users = await client.get('/users', {
  params: { page: 1, limit: 10, search: 'john' },
});

// Create user
const newUser = await client.post('/users', {
  email: 'newuser@example.com',
  username: 'newuser',
  password: 'SecurePass123!',
  roles: ['USER'],
});

// Update user roles
await client.put(`/users/${userId}/roles`, {
  roles: ['USER', 'MANAGER'],
});

// Get system metrics
const metrics = await client.get('/metrics');

// Invalidate cache
await client.delete(`/cache/${cacheKey}`);
```

## Integration with Other Services

### With API Gateway

Route admin requests through the API Gateway:

```bash
# Via API Gateway
curl -X GET "http://localhost:3001/admin/users" \
  -H "Authorization: Bearer $TOKEN"

# Direct to Admin Panel
curl -X GET "http://localhost:3002/api/v1/admin/users" \
  -H "Authorization: Bearer $TOKEN"
```

### With Order Service

Manage users who created orders:

```typescript
// Get user who created an order
const order = await orderService.getOrder(orderId);
const user = await adminService.getUser(order.userId);

// Update user roles
await adminService.updateUserRoles(user.id, {
  roles: ['USER', 'MANAGER'],
});
```

## Best Practices

1. **Token Management**: Store JWT tokens securely, refresh before expiry
2. **Rate Limiting**: Implement rate limiting for admin endpoints
3. **Audit Everything**: All admin actions are automatically logged
4. **Validation**: All inputs are validated automatically
5. **HTTPS**: Use HTTPS in production
6. **IP Whitelisting**: Consider IP whitelisting for admin panel
7. **MFA**: Implement multi-factor authentication for admin users
8. **Session Timeout**: Set appropriate session timeout values

## Environment Variables

```env
# Server
PORT=3002
NODE_ENV=production

# JWT
JWT_SECRET=your-secure-secret-key
JWT_ACCESS_EXPIRY=900
JWT_REFRESH_EXPIRY=604800

# CORS
CORS_ORIGIN=https://admin.example.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/admin

# Redis (for cache management)
REDIS_URL=redis://localhost:6379

# RabbitMQ (for event sourcing)
RABBITMQ_URL=amqp://localhost:5672
```

## Monitoring

Monitor admin panel health:

```bash
curl -X GET "http://localhost:3002/health"
```

View admin panel metrics in Grafana:
- Request rate
- Response time
- Error rate
- Active sessions
- Cache hit/miss ratio
