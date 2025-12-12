# Flexobo Infrastructure Documentation

This document provides comprehensive documentation for the Flexobo microservices infrastructure deployed on AWS EKS.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [AWS Resources](#aws-resources)
3. [Kubernetes Resources](#kubernetes-resources)
4. [Networking](#networking)
5. [Security](#security)
6. [Deployment Pipeline](#deployment-pipeline)
7. [Monitoring & Observability](#monitoring--observability)
8. [Cost Optimization](#cost-optimization)
9. [Disaster Recovery](#disaster-recovery)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### High-Level Architecture

```
                                    ┌─────────────────────────────────────────────────────────────────┐
                                    │                         AWS Cloud                                │
                                    │  ┌─────────────────────────────────────────────────────────────┐│
                                    │  │                    Route53 (DNS)                            ││
                                    │  │         *.flexobo-mock.site → ALB                           ││
                                    │  └─────────────────────────────────────────────────────────────┘│
                                    │                              │                                   │
                                    │  ┌─────────────────────────────────────────────────────────────┐│
                                    │  │               ACM (SSL/TLS Certificates)                    ││
                                    │  │         Wildcard: *.flexobo-mock.site                       ││
                                    │  └─────────────────────────────────────────────────────────────┘│
                                    │                              │                                   │
                                    │  ┌─────────────────────────────────────────────────────────────┐│
                                    │  │           Application Load Balancer (ALB)                   ││
                                    │  │    AWS Load Balancer Controller managed                     ││
                                    │  └─────────────────────────────────────────────────────────────┘│
                                    │                              │                                   │
                                    │  ┌─────────────────────────────────────────────────────────────┐│
                                    │  │                   VPC (10.0.0.0/16)                         ││
                                    │  │  ┌────────────────────┐  ┌────────────────────┐            ││
                                    │  │  │   Public Subnets   │  │  Private Subnets   │            ││
                                    │  │  │  - NAT Gateway     │  │  - EKS Nodes       │            ││
                                    │  │  │  - ALB             │──│  - RDS PostgreSQL  │            ││
                                    │  │  │                    │  │  - OpenSearch      │            ││
                                    │  │  └────────────────────┘  └────────────────────┘            ││
                                    │  └─────────────────────────────────────────────────────────────┘│
                                    │                                                                  │
                                    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
                                    │  │   ECR        │  │   S3         │  │   Secrets    │          │
                                    │  │ (Container   │  │  (Files/     │  │   Manager    │          │
                                    │  │  Images)     │  │   Backups)   │  │              │          │
                                    │  └──────────────┘  └──────────────┘  └──────────────┘          │
                                    └─────────────────────────────────────────────────────────────────┘
```

### Kubernetes Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         EKS Cluster (flexobo-dev)                                    │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    flexobo namespace                                           │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │  │
│  │  │  main-service   │  │  users-service  │  │  chat-service   │  │  file-service   │          │  │
│  │  │  Port: 3008     │  │  Port: 3005     │  │  Port: 3006     │  │  Port: 3007     │          │  │
│  │  │  2 replicas     │  │  2 replicas     │  │  2 replicas     │  │  2 replicas     │          │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘          │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                               │  │
│  │  │billing-service  │  │notification-svc │  │telegram-service │                               │  │
│  │  │  Port: 3009     │  │  Port: 3010     │  │  Port: 3012     │                               │  │
│  │  │  2 replicas     │  │  2 replicas     │  │  1 replica      │                               │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘                               │  │
│  │                                                                                               │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                                                    │  │
│  │  │    RabbitMQ     │  │     Redis       │                                                    │  │
│  │  │  StatefulSet    │  │  StatefulSet    │                                                    │  │
│  │  │  Port: 5672     │  │  Port: 6379     │                                                    │  │
│  │  └─────────────────┘  └─────────────────┘                                                    │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    kube-system namespace                                       │  │
│  │  ┌─────────────────────────────────┐                                                          │  │
│  │  │   AWS Load Balancer Controller  │                                                          │  │
│  │  │   Manages ALB Ingress           │                                                          │  │
│  │  └─────────────────────────────────┘                                                          │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                    │
                            ┌───────────────────────┼───────────────────────┐
                            │                       │                       │
                    ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
                    │     RDS       │       │   OpenSearch  │       │      S3       │
                    │  PostgreSQL   │       │   (Logging)   │       │   (Files)     │
                    │  (Database)   │       │               │       │               │
                    └───────────────┘       └───────────────┘       └───────────────┘
```

---

## AWS Resources

### Terraform Modules

The infrastructure is managed using Terraform with modular architecture:

```
infrastructure/terraform/
├── modules/
│   ├── vpc/              # VPC, subnets, NAT gateway, IGW
│   ├── eks/              # EKS cluster and node groups
│   ├── rds/              # PostgreSQL database
│   ├── ecr/              # Container registry
│   ├── iam/              # IAM roles and policies
│   ├── security-groups/  # Security groups
│   ├── route53/          # DNS management
│   ├── acm/              # SSL certificates
│   ├── s3/               # Storage buckets
│   ├── opensearch/       # Logging backend
│   └── secrets-manager/  # Centralized secrets
├── environments/
│   ├── dev/              # Development environment
│   └── prod/             # Production environment
└── shared/
    └── backend.tf        # Terraform state configuration
```

### Resource Details

#### VPC Configuration

| Resource | Value |
|----------|-------|
| CIDR | 10.0.0.0/16 |
| Public Subnets | 3 (one per AZ) |
| Private Subnets | 3 (one per AZ) |
| NAT Gateway | 1 (single for dev, 3 for prod) |
| Internet Gateway | 1 |

#### EKS Cluster

| Setting | Development | Production |
|---------|-------------|------------|
| Cluster Name | flexobo-dev | flexobo-prod |
| Kubernetes Version | 1.29+ | 1.29+ |
| Node Instance Type | t3.large | t3.xlarge |
| Desired Nodes | 2 | 3 |
| Min Nodes | 2 | 3 |
| Max Nodes | 6 | 10 |
| Disk Size | 50 GB | 100 GB |

#### RDS PostgreSQL

| Setting | Development | Production |
|---------|-------------|------------|
| Instance Class | db.t3.micro | db.t3.medium |
| Storage | 20 GB | 100 GB |
| Max Storage | 50 GB | 500 GB |
| Multi-AZ | No | Yes |
| Backup Retention | 7 days | 30 days |
| Performance Insights | No | Yes |

#### S3 Buckets

| Bucket | Purpose |
|--------|---------|
| flexobo-{env}-files | File storage for services |
| flexobo-{env}-backups | Database backups |
| flexobo-terraform-state | Terraform state |

#### ECR Repositories

| Repository | Description |
|------------|-------------|
| flexobo/main-service | Main API service |
| flexobo/users-service | User management |
| flexobo/chat-service | Chat functionality |
| flexobo/file-service | File management |
| flexobo/billing-service | Billing & payments |
| flexobo/notification-service | Notifications |
| flexobo/telegram-service | Telegram integration |

---

## Kubernetes Resources

### Directory Structure

```
infrastructure/k8s/
├── base/                        # Base configurations
│   ├── namespace.yaml           # flexobo namespace
│   ├── configmap.yaml           # Shared configuration
│   ├── secrets.yaml             # Secret references
│   ├── storage-class.yaml       # EBS storage class
│   ├── rbac/                    # Role-based access control
│   ├── network-policies/        # Network security
│   ├── ingress/                 # ALB ingress configuration
│   ├── rabbitmq/                # Message queue
│   ├── redis/                   # Cache
│   └── services/                # Microservice deployments
│       ├── main-service/
│       ├── users-service/
│       ├── chat-service/
│       ├── file-service/
│       ├── billing-service/
│       ├── notification-service/
│       └── telegram-service/
├── overlays/
│   ├── development/             # Dev-specific overrides
│   ├── staging/                 # Staging overrides
│   └── production/              # Production overrides
└── rancher/                     # Rancher installation (optional)
```

### Service Configuration

Each service deployment includes:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {service-name}
  namespace: flexobo
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: {service-name}
          image: 677109604279.dkr.ecr.us-east-1.amazonaws.com/flexobo/{service-name}:latest
          ports:
            - containerPort: {port}
          envFrom:
            - configMapRef:
                name: flexobo-config
            - secretRef:
                name: flexobo-secrets
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          readinessProbe:
            tcpSocket:
              port: {port}
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            tcpSocket:
              port: {port}
            initialDelaySeconds: 30
            periodSeconds: 30
```

### Service Ports

| Service | Container Port | Service Port |
|---------|---------------|--------------|
| main-service | 3008 | 3008 |
| users-service | 3005 | 3005 |
| chat-service | 3006 | 3006 |
| file-service | 3007 | 3007 |
| billing-service | 3009 | 3009 |
| notification-service | 3010 | 3010 |
| telegram-service | 3012 | 3012 |

### Database Schemas

Each service uses a separate PostgreSQL schema:

| Service | Schema | DATABASE_URL |
|---------|--------|--------------|
| main-service | main | ...?schema=main |
| users-service | users | ...?schema=users |
| chat-service | chat | ...?schema=chat |
| file-service | files | ...?schema=files |
| billing-service | billing | ...?schema=billing |
| notification-service | notifications | ...?schema=notifications |
| telegram-service | telegram | ...?schema=telegram |

---

## Networking

### External Access

Traffic flow for external requests:

```
Internet → Route53 → ACM → ALB → EKS Pods
```

#### DNS Configuration

| Domain | Target |
|--------|--------|
| dev-api.flexobo-mock.site | main-service |
| dev-users-api.flexobo-mock.site | users-service |
| dev-chat-api.flexobo-mock.site | chat-service |
| dev-file-api.flexobo-mock.site | file-service |
| dev-billing-api.flexobo-mock.site | billing-service |
| dev-notification-api.flexobo-mock.site | notification-service |
| dev-telegram-api.flexobo-mock.site | telegram-service |

#### ALB Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flexobo-ingress
  namespace: flexobo
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: {acm-certificate-arn}
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
spec:
  ingressClassName: alb
  rules:
    - host: dev-api.flexobo-mock.site
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: main-service
                port:
                  number: 3008
```

### Internal Communication

Services communicate internally using Kubernetes DNS:

```
{service-name}.flexobo.svc.cluster.local:{port}
```

### Security Groups

| Security Group | Purpose | Inbound Rules |
|---------------|---------|---------------|
| EKS Cluster SG | Control plane | 443 from VPC |
| EKS Node SG | Worker nodes | All from cluster SG |
| RDS SG | Database | 5432 from EKS nodes |
| ALB SG | Load balancer | 80, 443 from internet |

---

## Security

### IAM Roles

| Role | Purpose |
|------|---------|
| EKS Cluster Role | EKS control plane operations |
| EKS Node Role | Worker node operations |
| ALB Controller Role | AWS Load Balancer Controller |
| External Secrets Role | Secrets Manager access |

### Service Account Configuration

AWS Load Balancer Controller service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: aws-load-balancer-controller
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::{account}:role/AmazonEKSLoadBalancerControllerRole
```

### Secrets Management

Secrets are stored in Kubernetes secrets and injected via environment variables:

| Secret | Source |
|--------|--------|
| DB_HOST | ConfigMap |
| DB_PASSWORD | Secret |
| JWT_SECRET | Secret |
| STRIPE_SECRET_KEY | Secret |
| RABBITMQ_URL | ConfigMap |
| REDIS_URL | ConfigMap |

---

## Deployment Pipeline

### CI/CD Workflow

```
Developer Push → GitHub Actions → Build → Test → Push to ECR → Deploy to EKS
```

### Build Process

1. NX detects affected services
2. Build Docker images for affected services
3. Push to ECR with tags:
   - `latest`
   - `{git-sha}`
   - `{branch}-{timestamp}`

### Deployment Process

```bash
# Build and push image
docker build --platform linux/amd64 -t {ecr-repo}/{service}:latest -f apps/{service}/Dockerfile .
docker push {ecr-repo}/{service}:latest

# Trigger rolling update
kubectl rollout restart deployment/{service} -n flexobo
```

### Manual Deployment

```bash
# Apply all services
kubectl apply -k infrastructure/k8s/base

# Apply specific service
kubectl apply -f infrastructure/k8s/base/services/{service}/

# Check rollout status
kubectl rollout status deployment/{service} -n flexobo
```

---

## Monitoring & Observability

### Health Checks

All services use TCP socket probes:

```yaml
readinessProbe:
  tcpSocket:
    port: {port}
  initialDelaySeconds: 10
  periodSeconds: 10

livenessProbe:
  tcpSocket:
    port: {port}
  initialDelaySeconds: 30
  periodSeconds: 30
```

### Logging

- **Container Logs**: `kubectl logs -f deployment/{service} -n flexobo`
- **Aggregated Logs**: CloudWatch Logs (optional) or OpenSearch

### Metrics

- **Kubernetes Metrics**: kubectl top pods/nodes
- **Application Metrics**: Prometheus (optional)

### Useful Commands

```bash
# Check pod status
kubectl get pods -n flexobo -o wide

# Check service endpoints
kubectl get svc -n flexobo

# Check ingress status
kubectl get ingress -n flexobo

# View pod logs
kubectl logs -f deployment/{service} -n flexobo

# Describe pod events
kubectl describe pod {pod-name} -n flexobo

# Check resource usage
kubectl top pods -n flexobo
```

---

## Cost Optimization

### Development Environment (~$166/month)

| Resource | Configuration | Est. Cost |
|----------|--------------|-----------|
| EKS Control Plane | 1 cluster | $73 |
| EC2 Nodes | 2x t3.large | $60 |
| RDS | db.t3.micro | $13 |
| NAT Gateway | 1 gateway | $33 |
| ALB | 1 load balancer | $16 |
| S3 | ~10GB | $1 |

### Cost-Saving Strategies

1. **Single NAT Gateway**: Dev uses one NAT gateway instead of three
2. **Smaller RDS Instance**: t3.micro for development
3. **No Multi-AZ**: Single-AZ database for dev
4. **Spot Instances**: Optional for non-critical workloads
5. **Reserved Instances**: Consider for production

---

## Disaster Recovery

### Backup Strategy

| Data | Method | Retention |
|------|--------|-----------|
| RDS Database | Automated snapshots | 7 days (dev), 30 days (prod) |
| S3 Files | Versioning enabled | Indefinite |
| Kubernetes Configs | Git repository | Indefinite |

### Recovery Procedures

#### Database Recovery

```bash
# List snapshots
aws rds describe-db-snapshots --db-instance-identifier flexobo-dev-postgres

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier flexobo-dev-postgres-restored \
  --db-snapshot-identifier {snapshot-id}
```

#### Service Recovery

```bash
# Recreate all services
kubectl apply -k infrastructure/k8s/base

# Force pod recreation
kubectl delete pods -n flexobo --all
kubectl rollout restart deployment -n flexobo
```

---

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod events
kubectl describe pod {pod-name} -n flexobo

# Check logs
kubectl logs {pod-name} -n flexobo

# Common causes:
# - Image pull error: Check ECR permissions
# - OOMKilled: Increase memory limits
# - CrashLoopBackOff: Check application logs
```

#### 2. Service Unavailable

```bash
# Check service endpoints
kubectl get endpoints -n flexobo

# Check target group health
aws elbv2 describe-target-health --target-group-arn {arn}

# Check ALB rules
kubectl describe ingress flexobo-ingress -n flexobo
```

#### 3. Database Connection Issues

```bash
# Check database connectivity from pod
kubectl exec -it {pod} -n flexobo -- nc -zv {db-host} 5432

# Check security groups
aws ec2 describe-security-groups --group-ids {sg-id}

# Check DATABASE_URL
kubectl exec -it {pod} -n flexobo -- printenv | grep DATABASE
```

#### 4. DNS Not Resolving

```bash
# Check Route53 records
aws route53 list-resource-record-sets --hosted-zone-id {zone-id}

# Check DNS propagation
dig dev-api.flexobo-mock.site

# Check ALB address
kubectl get ingress -n flexobo -o wide
```

### Debugging Commands

```bash
# Interactive shell in pod
kubectl exec -it {pod} -n flexobo -- /bin/sh

# Port forward for local testing
kubectl port-forward svc/{service} 3000:{port} -n flexobo

# Check all events
kubectl get events -n flexobo --sort-by='.lastTimestamp'

# Resource allocation
kubectl describe nodes | grep -A 10 "Allocated resources"
```

---

## Quick Reference

### Terraform Commands

```bash
cd infrastructure/terraform/environments/dev

# Initialize
terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply

# Destroy (caution!)
terraform destroy
```

### Kubectl Commands

```bash
# Apply configuration
kubectl apply -k infrastructure/k8s/base

# Get resources
kubectl get pods,svc,ingress -n flexobo

# Restart deployment
kubectl rollout restart deployment/{service} -n flexobo

# Scale deployment
kubectl scale deployment/{service} --replicas=3 -n flexobo
```

### Docker/ECR Commands

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 677109604279.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build --platform linux/amd64 -t 677109604279.dkr.ecr.us-east-1.amazonaws.com/flexobo/{service}:latest -f apps/{service}/Dockerfile .

# Push image
docker push 677109604279.dkr.ecr.us-east-1.amazonaws.com/flexobo/{service}:latest
```
