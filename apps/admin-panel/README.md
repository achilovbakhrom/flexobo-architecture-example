# Admin Panel Service

Administrative microservice for managing users, viewing system metrics, and performing administrative operations.

## Features

- **User Management**: Create, read, update, delete users
- **Role Management**: Assign and manage user roles
- **Audit Logs**: View system-wide audit logs
- **System Metrics**: Monitor service health and performance
- **Event Stream**: View event sourcing events
- **Cache Management**: Inspect and invalidate cache entries

## Architecture

Uses hexagonal architecture with CQRS pattern:

- **Application Layer**: Use cases and commands/queries
- **Domain Layer**: User aggregate, value objects
- **Presentation Layer**: REST API controllers
- **Infrastructure**: Integration with core services

## Authentication

All endpoints require JWT authentication with ADMIN role.

## API Endpoints

### User Management

- `GET /api/v1/admin/users` - List all users
- `GET /api/v1/admin/users/:id` - Get user details
- `POST /api/v1/admin/users` - Create user
- `PUT /api/v1/admin/users/:id` - Update user
- `DELETE /api/v1/admin/users/:id` - Delete user
- `PUT /api/v1/admin/users/:id/roles` - Update user roles

### Audit Logs

- `GET /api/v1/admin/audit-logs` - List audit logs
- `GET /api/v1/admin/audit-logs/:id` - Get audit log details

### System Metrics

- `GET /api/v1/admin/metrics` - Get system metrics
- `GET /api/v1/admin/metrics/services` - Get service health
- `GET /api/v1/admin/metrics/events` - Get event statistics

### Cache Management

- `GET /api/v1/admin/cache` - List cache entries
- `DELETE /api/v1/admin/cache/:key` - Invalidate cache entry
- `DELETE /api/v1/admin/cache` - Invalidate all cache

## Usage

```bash
# Start the service
npx nx serve admin-panel

# Build the service
npx nx build admin-panel

# Test the service
npx nx test admin-panel
```

## Environment Variables

```env
PORT=3002
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/admin
RABBITMQ_URL=amqp://localhost:5672
REDIS_URL=redis://localhost:6379
```
