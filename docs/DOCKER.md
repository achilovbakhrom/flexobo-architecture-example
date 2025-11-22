# Docker Configuration Guide

## Overview

This guide covers Docker configuration for the Flexobo microservices architecture, including:
- Multi-stage Dockerfiles for each service
- Docker Compose for orchestration
- Development and production configurations
- Best practices and optimization

## Architecture

```
Docker Network: flexobo-network
├── PostgreSQL (5432)
├── RabbitMQ (5672, 15672)
├── Redis (6379)
├── Order Service (3000)
├── API Gateway (3001)
└── Admin Panel (3002)
```

## Dockerfiles

### Multi-Stage Build Strategy

Each service uses a multi-stage Dockerfile with four stages:

1. **Base Stage** - Common dependencies (Node.js, OpenSSL)
2. **Dependencies Stage** - Install npm packages
3. **Build Stage** - Build the application
4. **Production Stage** - Minimal runtime image

### Order Service Dockerfile

**Location:** `apps/order-service/Dockerfile`

```dockerfile
# Base stage - common dependencies
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# Dependencies stage
FROM base AS dependencies
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./
RUN npm ci --legacy-peer-deps

# Build stage
FROM dependencies AS build
COPY . .
RUN npx nx build order-service --configuration=production

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist/apps/order-service ./
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

USER nodejs

EXPOSE 3000

CMD ["node", "main.js"]
```

**Build command:**
```bash
docker build -f apps/order-service/Dockerfile -t flexobo-order-service:latest .
```

### API Gateway Dockerfile

**Location:** `apps/api-gateway/Dockerfile`

Similar structure, but:
- Builds `api-gateway` app
- Exposes port 3001
- Different service name

**Build command:**
```bash
docker build -f apps/api-gateway/Dockerfile -t flexobo-api-gateway:latest .
```

### Admin Panel Dockerfile

**Location:** `apps/admin-panel/Dockerfile`

Similar structure, but:
- Builds `admin-panel` app
- Exposes port 3002
- Different service name

**Build command:**
```bash
docker build -f apps/admin-panel/Dockerfile -t flexobo-admin-panel:latest .
```

## Docker Compose

### Production Configuration

**Location:** `docker-compose.yml`

Complete production stack with:
- All infrastructure services (PostgreSQL, RabbitMQ, Redis)
- All application services (Order Service, API Gateway, Admin Panel)
- Health checks for each service
- Dependency management
- Persistent volumes
- Network isolation

**Start production stack:**
```bash
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f
```

**Stop stack:**
```bash
docker-compose down
```

**Stop and remove volumes:**
```bash
docker-compose down -v
```

### Development Configuration

**Location:** `docker-compose.dev.yml`

Infrastructure only (PostgreSQL, RabbitMQ, Redis) for local development:

**Start development infrastructure:**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

**Use with local services:**
```bash
# Start infrastructure
docker-compose -f docker-compose.dev.yml up -d

# Run services locally
npx nx serve order-service
npx nx serve api-gateway
npx nx serve admin-panel
```

## Environment Variables

### Order Service

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/flexobo?schema=order
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-secret-key-change-in-production
LOG_LEVEL=info
```

### API Gateway

```env
NODE_ENV=production
PORT=3001
ORDER_SERVICE_URL=http://order-service:3000
ADMIN_PANEL_URL=http://admin-panel:3002
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-secret-key-change-in-production
LOG_LEVEL=info
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### Admin Panel

```env
NODE_ENV=production
PORT=3002
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/flexobo?schema=admin
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-secret-key-change-in-production
LOG_LEVEL=info
```

## Docker Commands

### Building Images

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build order-service

# Build with no cache
docker-compose build --no-cache
```

### Running Containers

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Start specific service
docker-compose up order-service

# Scale service
docker-compose up --scale order-service=3
```

### Managing Containers

```bash
# List running containers
docker-compose ps

# Stop all services
docker-compose stop

# Restart service
docker-compose restart order-service

# Remove stopped containers
docker-compose rm

# View logs
docker-compose logs
docker-compose logs -f order-service
docker-compose logs --tail=100 api-gateway
```

### Debugging

```bash
# Execute command in container
docker-compose exec order-service sh

# View container details
docker-compose exec order-service env

# Check service health
docker-compose exec order-service wget -qO- http://localhost:3000/health
```

## Health Checks

Each service has a health check configured:

### Infrastructure Services

**PostgreSQL:**
```bash
pg_isready -U postgres
```

**RabbitMQ:**
```bash
rabbitmq-diagnostics ping
```

**Redis:**
```bash
redis-cli ping
```

### Application Services

**All services:**
```bash
wget --quiet --tries=1 --spider http://localhost:<port>/health
```

Health check parameters:
- **interval:** 30s - Check every 30 seconds
- **timeout:** 10s - Timeout after 10 seconds
- **retries:** 3 - Retry 3 times before marking unhealthy
- **start_period:** 40s - Grace period for startup

## Volumes

Persistent data volumes:

```yaml
volumes:
  postgres_data:     # PostgreSQL data
  rabbitmq_data:     # RabbitMQ data
  redis_data:        # Redis data
```

**Inspect volume:**
```bash
docker volume inspect flexobo-microservice-example_postgres_data
```

**Backup volume:**
```bash
docker run --rm -v flexobo-microservice-example_postgres_data:/data \
  -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

**Restore volume:**
```bash
docker run --rm -v flexobo-microservice-example_postgres_data:/data \
  -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /
```

## Networks

Custom bridge network `flexobo-network` provides:
- Service discovery by name
- Network isolation
- Inter-service communication

**Inspect network:**
```bash
docker network inspect flexobo-microservice-example_flexobo-network
```

## Best Practices

### 1. Multi-Stage Builds

Reduces image size by:
- Building in one stage
- Copying only production artifacts to final stage
- Excluding dev dependencies

**Image size comparison:**
```
Without multi-stage: ~1.5GB
With multi-stage: ~300MB
```

### 2. Non-Root User

Run containers as non-root user for security:

```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs
```

### 3. Layer Caching

Optimize build time by ordering commands:

```dockerfile
# 1. Copy package files first (changes rarely)
COPY package*.json ./

# 2. Install dependencies
RUN npm ci

# 3. Copy source code (changes often)
COPY . .

# 4. Build
RUN npm run build
```

### 4. .dockerignore

Exclude unnecessary files:

**Key exclusions:**
- node_modules
- .git
- Test files
- Documentation
- IDE config

### 5. Health Checks

Always include health checks:
- Enables automatic recovery
- Provides service status
- Used by orchestrators

### 6. Environment Variables

Never hardcode secrets:
- Use environment variables
- Use Docker secrets in Swarm
- Use Kubernetes secrets in K8s

## Production Deployment

### Security Checklist

- [ ] Change default passwords
- [ ] Use secrets management
- [ ] Enable TLS/SSL
- [ ] Run as non-root user
- [ ] Limit container resources
- [ ] Enable security scanning
- [ ] Update base images regularly

### Resource Limits

Add resource limits in docker-compose.yml:

```yaml
services:
  order-service:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Monitoring

**View resource usage:**
```bash
docker stats
```

**Export logs to file:**
```bash
docker-compose logs > logs.txt
```

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker-compose logs order-service
```

**Check last container:**
```bash
docker logs $(docker ps -lq)
```

### Network Issues

**Test connectivity:**
```bash
docker-compose exec order-service ping postgres
docker-compose exec order-service wget -qO- http://api-gateway:3001/health
```

### Database Connection Issues

**Check database is ready:**
```bash
docker-compose exec postgres pg_isready -U postgres
```

**Connect to database:**
```bash
docker-compose exec postgres psql -U postgres -d flexobo
```

### High Memory Usage

**Check memory usage:**
```bash
docker stats --no-stream
```

**Set memory limits:**
```yaml
services:
  order-service:
    mem_limit: 1g
```

### Port Conflicts

**Check what's using port:**
```bash
lsof -i :3000
```

**Use different port:**
```yaml
ports:
  - "3010:3000"  # Map to different host port
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Docker Build

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build images
        run: docker-compose build
      
      - name: Start services
        run: docker-compose up -d
      
      - name: Wait for services
        run: sleep 30
      
      - name: Test services
        run: |
          curl http://localhost:3000/health
          curl http://localhost:3001/health
          curl http://localhost:3002/health
      
      - name: Stop services
        run: docker-compose down
```

### Registry Push

```bash
# Tag images
docker tag flexobo-order-service:latest registry.example.com/order-service:v1.0.0

# Push to registry
docker push registry.example.com/order-service:v1.0.0
```

## Quick Reference

### Start Everything

```bash
docker-compose up -d
```

### View All Logs

```bash
docker-compose logs -f
```

### Rebuild and Restart

```bash
docker-compose up -d --build
```

### Clean Everything

```bash
docker-compose down -v
docker system prune -a
```

### Access Services

- Order Service: http://localhost:3000
- API Gateway: http://localhost:3001
- Admin Panel: http://localhost:3002
- RabbitMQ Management: http://localhost:15672 (guest/guest)

## Summary

Docker configuration provides:
- ✅ Consistent environments
- ✅ Easy deployment
- ✅ Service isolation
- ✅ Scalability
- ✅ Development parity
- ✅ Quick startup
- ✅ Resource management

Next: Kubernetes deployment for production orchestration.
