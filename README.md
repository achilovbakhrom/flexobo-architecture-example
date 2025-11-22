# Flexobo Microservice Example

Enterprise-grade microservices architecture with event sourcing, CQRS, and domain-driven design patterns.

## 📚 Documentation

- [Architecture & Setup Guide](docs/README.md) - Complete architecture overview, patterns, and setup instructions
- [Adding a New Service](docs/ADDING-NEW-SERVICE.md) - Step-by-step guide to create a new microservice
- [HMR Development Guide](docs/HMR-GUIDE.md) - Hot module reload setup for development
- [Order Service Guide](docs/ORDER-SERVICE.md) - Detailed order service documentation with API examples

## Quick Start

```bash
# Install dependencies
yarn install

# Start infrastructure (PostgreSQL, Redis, RabbitMQ)
yarn infra:up

# Build all services
yarn build:all

# Run all services with HMR
yarn dev
```

## Services

- **Order Service** - Port 3000
- **API Gateway** - Port 3001  
- **Admin Panel** - Port 3002

For detailed information, see [docs/README.md](docs/README.md).
