# Flexobo CLI

Command-line tools for managing Flexobo microservices.

## Installation

### From Source

```bash
cd tools/cli
npm install
npm run build

# Link globally
npm link
```

### Usage

```bash
flexobo --help
```

## Commands

### Authentication

Login is required for most commands. The CLI stores your JWT token locally at `~/.flexobo/token.json`.

#### Login

```bash
flexobo auth login
# Or with options
flexobo auth login -e admin@example.com -p password123
```

#### Logout

```bash
flexobo auth logout
```

#### Check Status

```bash
flexobo auth status
```

### User Management

Manage users (requires ADMIN role).

#### List Users

```bash
# List all users
flexobo user list

# With pagination
flexobo user list -p 2 -l 20

# Search users
flexobo user list -s john
```

#### Get User Details

```bash
flexobo user get <user-id>
```

#### Create User

```bash
# Interactive mode
flexobo user create

# With options
flexobo user create -e user@example.com -u username -p password
```

#### Update User

```bash
# Update email
flexobo user update <user-id> -e newemail@example.com

# Update username
flexobo user update <user-id> -u newusername

# Activate/deactivate user
flexobo user update <user-id> --activate
flexobo user update <user-id> --deactivate
```

#### Update User Roles

```bash
flexobo user roles <user-id>
# Interactive multi-select to choose roles: ADMIN, MANAGER, USER, GUEST
```

#### Delete User

```bash
# With confirmation
flexobo user delete <user-id>

# Skip confirmation
flexobo user delete <user-id> -f
```

### Order Management

Manage orders in the system.

#### List Orders

```bash
# List all orders
flexobo order list

# With pagination
flexobo order list -p 1 -l 20
```

#### Get Order Details

```bash
flexobo order get <order-id>
```

#### Create Order

```bash
flexobo order create \
  -i '[{"productId":"123","productName":"Widget","quantity":2,"price":29.99}]' \
  -a '{"street":"123 Main St","city":"New York","state":"NY","zipCode":"10001","country":"USA"}'
```

#### Cancel Order

```bash
# With confirmation
flexobo order cancel <order-id>

# Skip confirmation
flexobo order cancel <order-id> -f
```

### Cache Management

Manage distributed cache (requires ADMIN role).

#### List Cache Entries

```bash
flexobo cache list
```

#### Invalidate Cache Entry

```bash
# With confirmation
flexobo cache invalidate <cache-key>

# Skip confirmation
flexobo cache invalidate <cache-key> -f
```

#### Clear All Cache

```bash
# With confirmation
flexobo cache clear

# Skip confirmation
flexobo cache clear -f
```

### Event Statistics

View event sourcing statistics.

#### Get Event Statistics

```bash
flexobo event stats
```

Shows:
- Total events count
- Events in last 24 hours
- Events in last 7 days
- Average processing time
- Events by type breakdown

### Health Checks

Monitor system health and performance.

#### Check Service Health

```bash
flexobo health check
```

Shows status of all services:
- API Gateway
- Order Service
- Admin Panel
- RabbitMQ
- Redis
- PostgreSQL

Each with:
- Status (healthy/degraded/down)
- Uptime
- Response time
- Error rate

#### Get System Metrics

```bash
flexobo health metrics
```

Comprehensive system metrics including:
- Service health status
- Event statistics
- Cache performance
- Memory usage

## Configuration

### API Endpoints

By default, the CLI connects to:
- API Gateway: `http://localhost:3001`
- Admin Panel: `http://localhost:3002`

To change endpoints, modify `src/api-client.ts`.

### Token Storage

JWT tokens are stored at `~/.flexobo/token.json` with:
- Access token
- Refresh token
- Expiration timestamp

The CLI automatically refreshes tokens when they expire.

## Examples

### Complete User Management Workflow

```bash
# Login
flexobo auth login -e admin@example.com -p admin123

# List users
flexobo user list

# Create new user
flexobo user create -e john@example.com -u john -p SecurePass123!

# Get user details
flexobo user get <user-id>

# Update user roles
flexobo user roles <user-id>
# Select: USER, MANAGER

# Deactivate user
flexobo user update <user-id> --deactivate

# Delete user
flexobo user delete <user-id>

# Logout
flexobo auth logout
```

### Order Management Workflow

```bash
# Login
flexobo auth login

# List orders
flexobo order list

# Create order
flexobo order create \
  -i '[{"productId":"1","productName":"Widget","quantity":2,"price":29.99}]'

# Get order details
flexobo order get <order-id>

# Cancel order
flexobo order cancel <order-id>
```

### System Monitoring

```bash
# Login
flexobo auth login -e admin@example.com

# Check all services
flexobo health check

# Get detailed metrics
flexobo health metrics

# View event statistics
flexobo event stats

# List cache entries
flexobo cache list
```

### Cache Management

```bash
# Login as admin
flexobo auth login -e admin@example.com

# List all cache entries
flexobo cache list

# Invalidate specific entry
flexobo cache invalidate order:123

# Clear all cache
flexobo cache clear -f
```

## Error Handling

The CLI provides helpful error messages:

- **401 Unauthorized**: Not logged in or token expired
  ```
  ✗ Authentication required. Please login first: flexobo auth login
  ```

- **403 Forbidden**: Insufficient permissions
  ```
  ✗ Insufficient permissions. Admin role required.
  ```

- **404 Not Found**: Resource doesn't exist
  ```
  ✗ Not found: User with ID 123 not found
  ```

- **Network Error**: Services not running
  ```
  ✗ Network error: Unable to reach the API server
  ℹ Make sure the services are running:
    - API Gateway: http://localhost:3001
    - Admin Panel: http://localhost:3002
  ```

## Development

### Run in Development Mode

```bash
npm run dev -- <command>

# Example
npm run dev -- user list
```

### Build

```bash
npm run build
```

### Project Structure

```
tools/cli/
├── src/
│   ├── index.ts           # Main entry point
│   ├── api-client.ts      # API communication
│   ├── utils.ts           # Utility functions
│   └── commands/
│       ├── auth.ts        # Authentication commands
│       ├── user.ts        # User management
│       ├── order.ts       # Order management
│       ├── cache.ts       # Cache management
│       ├── event.ts       # Event statistics
│       └── health.ts      # Health checks
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

- **commander**: CLI framework
- **axios**: HTTP client
- **chalk**: Terminal styling
- **inquirer**: Interactive prompts
- **ora**: Loading spinners
- **table**: Table formatting

## Tips

1. **Use aliases**: Add to your shell config:
   ```bash
   alias fx="flexobo"
   alias fxu="flexobo user"
   alias fxo="flexobo order"
   ```

2. **Check authentication**: Run `flexobo auth status` to check token expiration

3. **Force operations**: Use `-f` flag to skip confirmations in scripts

4. **Pagination**: Use `-p` and `-l` flags for large result sets

5. **JSON formatting**: Use `jq` for better JSON output:
   ```bash
   flexobo order get <id> | jq .
   ```

## Troubleshooting

### Command not found

After `npm link`, restart your terminal or run:
```bash
source ~/.bashrc  # or ~/.zshrc
```

### Token expired

```bash
flexobo auth login
```

### Services unreachable

Make sure services are running:
```bash
npx nx serve api-gateway
npx nx serve admin-panel
```

### Permission denied

Make sure the CLI has execute permissions:
```bash
chmod +x dist/index.js
```

## License

MIT
