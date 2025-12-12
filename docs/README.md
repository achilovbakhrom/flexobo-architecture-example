# Flexobo Documentation

Welcome to the Flexobo microservices documentation.

## Available Documentation

| Document | Description |
|----------|-------------|
| [INFRASTRUCTURE.md](INFRASTRUCTURE.md) | Detailed AWS and Kubernetes infrastructure documentation |
| [GUIDE.md](GUIDE.md) | Developer guide for building and deploying services |

## Quick Links

### Infrastructure

- [Architecture Overview](INFRASTRUCTURE.md#architecture-overview)
- [AWS Resources](INFRASTRUCTURE.md#aws-resources)
- [Kubernetes Resources](INFRASTRUCTURE.md#kubernetes-resources)
- [Networking](INFRASTRUCTURE.md#networking)
- [Security](INFRASTRUCTURE.md#security)
- [Troubleshooting](INFRASTRUCTURE.md#troubleshooting)

### Development

- [Getting Started](GUIDE.md#getting-started)
- [Creating a New Microservice](GUIDE.md#creating-a-new-microservice)
- [Database Management](GUIDE.md#database-management)
- [Deployment](GUIDE.md#deployment)
- [Common Patterns](GUIDE.md#common-patterns)

## Service Endpoints

### Local Development

| Service | Port | URL |
|---------|------|-----|
| main-service | 3008 | http://localhost:3008 |
| users-service | 3005 | http://localhost:3005 |
| chat-service | 3006 | http://localhost:3006 |
| file-service | 3007 | http://localhost:3007 |
| billing-service | 3009 | http://localhost:3009 |
| notification-service | 3010 | http://localhost:3010 |
| telegram-service | 3012 | http://localhost:3012 |

### Production (Dev Environment)

| Service | URL |
|---------|-----|
| main-service | https://dev-api.flexobo-mock.site |
| users-service | https://dev-users-api.flexobo-mock.site |
| chat-service | https://dev-chat-api.flexobo-mock.site |
| file-service | https://dev-file-api.flexobo-mock.site |
| billing-service | https://dev-billing-api.flexobo-mock.site |
| notification-service | https://dev-notification-api.flexobo-mock.site |
| telegram-service | https://dev-telegram-api.flexobo-mock.site |

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 22 |
| Framework | NestJS |
| Language | TypeScript |
| Database | PostgreSQL (Prisma ORM) |
| Cache | Redis |
| Message Queue | RabbitMQ |
| Monorepo | NX |
| Container Orchestration | Kubernetes (EKS) |
| Cloud Provider | AWS |
| CI/CD | GitHub Actions |

## Project Structure

```
flexobo-microservice-example/
├── apps/                    # Microservices
│   ├── main-service/
│   ├── users-service/
│   ├── chat-service/
│   ├── file-service/
│   ├── billing-service/
│   ├── notification-service/
│   └── telegram-service/
├── libs/                    # Shared libraries
│   ├── core/
│   └── shared-kernel/
├── infrastructure/          # Infrastructure as Code
│   ├── terraform/           # AWS resources
│   ├── k8s/                 # Kubernetes manifests
│   └── docker-compose.yml   # Local development
└── docs/                    # Documentation
    ├── README.md            # This file
    ├── INFRASTRUCTURE.md    # Infrastructure docs
    └── GUIDE.md             # Developer guide
```
