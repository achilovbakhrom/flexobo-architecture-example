# API Documentation

## Overview

This document describes the REST APIs for the Flexobo microservices architecture.

## Base URLs

- **API Gateway:** http://localhost:3001
- **Order Service:** http://localhost:3000 (internal)
- **Admin Panel:** http://localhost:3002 (internal)

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <jwt-token>
```

### Get Access Token

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

## Order Service API

### Create Order

**Endpoint:** `POST /api/v1/orders`

**Authentication:** Required

**Request:**
```json
{
  "items": [
    {
      "productId": "prod-123",
      "productName": "Laptop",
      "quantity": 1,
      "price": 999.99
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "order-abc-123",
  "items": [
    {
      "productId": "prod-123",
      "productName": "Laptop",
      "quantity": 1,
      "price": 999.99
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "status": "PENDING",
  "totalAmount": 999.99,
  "createdAt": "2024-11-22T10:30:00Z",
  "version": 1
}
```

**Errors:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid token
- `422 Unprocessable Entity` - Validation errors

### Get Order by ID

**Endpoint:** `GET /api/v1/orders/:id`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "id": "order-abc-123",
  "items": [...],
  "shippingAddress": {...},
  "status": "PENDING",
  "totalAmount": 999.99,
  "createdAt": "2024-11-22T10:30:00Z",
  "updatedAt": "2024-11-22T10:30:00Z",
  "version": 1
}
```

**Errors:**
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Order not found

### List Orders

**Endpoint:** `GET /api/v1/orders`

**Authentication:** Required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `status` (optional): Filter by status (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)

**Example:** `GET /api/v1/orders?page=1&limit=20&status=PENDING`

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "order-abc-123",
      "status": "PENDING",
      "totalAmount": 999.99,
      "createdAt": "2024-11-22T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Update Order Status

**Endpoint:** `PATCH /api/v1/orders/:id/status`

**Authentication:** Required (ADMIN role)

**Request:**
```json
{
  "status": "PROCESSING"
}
```

**Response:** `200 OK`
```json
{
  "id": "order-abc-123",
  "status": "PROCESSING",
  "updatedAt": "2024-11-22T10:35:00Z",
  "version": 2
}
```

### Cancel Order

**Endpoint:** `PATCH /api/v1/orders/:id/cancel`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "id": "order-abc-123",
  "status": "CANCELLED",
  "cancelledAt": "2024-11-22T10:40:00Z",
  "version": 3
}
```

**Errors:**
- `400 Bad Request` - Order cannot be cancelled (already shipped)
- `404 Not Found` - Order not found

## Admin Panel API

### User Management

#### Create User

**Endpoint:** `POST /api/v1/admin/users`

**Authentication:** Required (ADMIN role)

**Request:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "roles": ["USER"]
}
```

**Response:** `201 Created`
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "roles": ["USER"],
  "active": true,
  "createdAt": "2024-11-22T10:30:00Z"
}
```

#### Get User by ID

**Endpoint:** `GET /api/v1/admin/users/:id`

**Authentication:** Required (ADMIN role)

**Response:** `200 OK`
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "roles": ["USER"],
  "active": true,
  "createdAt": "2024-11-22T10:30:00Z",
  "updatedAt": "2024-11-22T10:30:00Z"
}
```

#### List Users

**Endpoint:** `GET /api/v1/admin/users`

**Authentication:** Required (ADMIN role)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by email or username

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "user-123",
      "email": "user@example.com",
      "username": "johndoe",
      "roles": ["USER"],
      "active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

#### Update User

**Endpoint:** `PATCH /api/v1/admin/users/:id`

**Authentication:** Required (ADMIN role)

**Request:**
```json
{
  "roles": ["USER", "MANAGER"],
  "active": true
}
```

**Response:** `200 OK`
```json
{
  "id": "user-123",
  "roles": ["USER", "MANAGER"],
  "active": true,
  "updatedAt": "2024-11-22T10:35:00Z"
}
```

#### Delete User

**Endpoint:** `DELETE /api/v1/admin/users/:id`

**Authentication:** Required (ADMIN role)

**Response:** `204 No Content`

### System Metrics

#### Get System Metrics

**Endpoint:** `GET /api/v1/admin/metrics`

**Authentication:** Required (ADMIN role)

**Response:** `200 OK`
```json
{
  "services": {
    "orderService": {
      "status": "healthy",
      "uptime": 86400,
      "requests": 12543,
      "errors": 23
    },
    "apiGateway": {
      "status": "healthy",
      "uptime": 86400,
      "requests": 45678,
      "errors": 12
    }
  },
  "events": {
    "total": 98765,
    "last24h": 1234,
    "byType": {
      "OrderCreated": 500,
      "OrderCancelled": 50,
      "OrderStatusChanged": 684
    }
  },
  "cache": {
    "hits": 25000,
    "misses": 5000,
    "hitRate": 0.833,
    "totalKeys": 1500,
    "memoryUsage": "512MB"
  }
}
```

#### Get Service Health

**Endpoint:** `GET /api/v1/admin/health`

**Authentication:** Required (ADMIN role)

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "services": [
    {
      "name": "order-service",
      "status": "healthy",
      "latency": 25
    },
    {
      "name": "database",
      "status": "healthy",
      "latency": 5
    },
    {
      "name": "message-bus",
      "status": "healthy",
      "latency": 2
    },
    {
      "name": "cache",
      "status": "healthy",
      "latency": 1
    }
  ]
}
```

### Event Statistics

**Endpoint:** `GET /api/v1/admin/events/stats`

**Authentication:** Required (ADMIN role)

**Response:** `200 OK`
```json
{
  "totalEvents": 98765,
  "eventsLast24h": 1234,
  "eventsByType": [
    {
      "type": "OrderCreated",
      "count": 45678
    },
    {
      "type": "OrderCancelled",
      "count": 3456
    }
  ],
  "aggregateTypes": [
    {
      "type": "Order",
      "count": 45678
    }
  ]
}
```

### Cache Management

#### List Cache Entries

**Endpoint:** `GET /api/v1/admin/cache`

**Authentication:** Required (ADMIN role)

**Response:** `200 OK`
```json
{
  "keys": [
    {
      "key": "order:abc-123",
      "ttl": 300,
      "size": "2KB"
    }
  ],
  "totalKeys": 1500,
  "memoryUsage": "512MB"
}
```

#### Invalidate Cache

**Endpoint:** `DELETE /api/v1/admin/cache/:key`

**Authentication:** Required (ADMIN role)

**Response:** `204 No Content`

#### Clear All Cache

**Endpoint:** `DELETE /api/v1/admin/cache`

**Authentication:** Required (ADMIN role)

**Response:** `204 No Content`

### Audit Logs

**Endpoint:** `GET /api/v1/admin/audit-logs`

**Authentication:** Required (ADMIN role)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `userId` (optional): Filter by user ID
- `action` (optional): Filter by action type
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "log-123",
      "userId": "user-456",
      "action": "ORDER_CREATED",
      "resource": "order:abc-123",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2024-11-22T10:30:00Z",
      "metadata": {
        "orderId": "abc-123",
        "amount": 999.99
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5000,
    "totalPages": 100
  }
}
```

## Health Check Endpoints

### Order Service Health

**Endpoint:** `GET /health`

**Authentication:** Not required

**Response:** `200 OK`
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "messagebus": {
      "status": "up"
    },
    "cache": {
      "status": "up"
    }
  }
}
```

### API Gateway Health

**Endpoint:** `GET /health`

**Authentication:** Not required

**Response:** `200 OK`
```json
{
  "status": "ok",
  "services": {
    "orderService": "healthy",
    "adminPanel": "healthy"
  }
}
```

## Error Responses

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2024-11-22T10:30:00Z",
  "path": "/api/v1/admin/users"
}
```

### HTTP Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `204 No Content` - Successful request with no response body
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable (circuit breaker open)

## Rate Limiting

All endpoints are rate-limited:

**Limits:**
- 100 requests per minute per IP (default)
- 1000 requests per minute for authenticated users

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635724800
```

**Error Response:** `429 Too Many Requests`
```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "error": "Too Many Requests",
  "retryAfter": 60
}
```

## Versioning

API versioning is handled through URL path:

- `/api/v1/*` - Version 1 (current)
- `/api/v2/*` - Version 2 (future)

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (starting from 1)
- `limit`: Items per page (max 100)

**Response Format:**
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

## Filtering and Sorting

**Filtering:**
Use query parameters for filtering:
```
GET /api/v1/orders?status=PENDING&minAmount=100
```

**Sorting:**
Use `sort` parameter:
```
GET /api/v1/orders?sort=createdAt:desc
```

Multiple sort fields:
```
GET /api/v1/orders?sort=status:asc,createdAt:desc
```

## WebSocket Events (Future)

Real-time updates via WebSocket:

**Connect:**
```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'jwt-token'
  }
});

socket.on('order.created', (data) => {
  console.log('New order:', data);
});

socket.on('order.updated', (data) => {
  console.log('Order updated:', data);
});
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Create order
const order = await client.post('/orders', {
  items: [
    { productId: 'prod-123', quantity: 1, price: 999.99 }
  ],
  shippingAddress: {
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA'
  }
});

// List orders
const orders = await client.get('/orders', {
  params: { page: 1, limit: 10 }
});
```

### cURL

```bash
# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Create order
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [{"productId":"prod-123","quantity":1,"price":999.99}],
    "shippingAddress": {"street":"123 Main St","city":"NYC","state":"NY","zipCode":"10001","country":"USA"}
  }'

# Get order
curl http://localhost:3001/api/v1/orders/abc-123 \
  -H "Authorization: Bearer $TOKEN"
```

## Testing with Postman

Import the Postman collection:

1. Create environment with base URL and token variables
2. Set up pre-request script for authentication
3. Use collection variables for IDs

## Best Practices

1. **Always use HTTPS in production**
2. **Store JWT tokens securely** (httpOnly cookies or secure storage)
3. **Handle rate limiting** with exponential backoff
4. **Implement idempotency** for POST/PATCH requests
5. **Use correlation IDs** for request tracing
6. **Cache responses** when appropriate
7. **Handle errors gracefully** with retries

## Support

For API issues or questions:
- **Documentation:** See `/docs` directory
- **Issues:** GitHub Issues
- **Email:** support@flexobo.com
