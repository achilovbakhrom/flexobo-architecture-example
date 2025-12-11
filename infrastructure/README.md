# Flexobo Infrastructure

Production-grade AWS infrastructure for Flexobo microservices platform.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Component Versions](#component-versions)
- [Directory Structure](#directory-structure)
- [Estimated Costs](#estimated-costs)
- [Prerequisites](#prerequisites)
- [Deployment Guide](#deployment-guide)
  - [Phase 1: AWS Foundation](#phase-1-aws-foundation)
  - [Phase 2: Kubernetes Setup](#phase-2-kubernetes-setup)
  - [Phase 3: Service Mesh & Gateway](#phase-3-service-mesh--gateway)
  - [Phase 4: Monitoring Stack](#phase-4-monitoring-stack)
  - [Phase 5: Application Deployment](#phase-5-application-deployment)
- [CI/CD Workflows](#cicd-workflows)
- [Security Features](#security-features)
- [Monitoring & Observability](#monitoring--observability)
- [Backup Strategy](#backup-strategy)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

---

## Architecture Overview

```
                                    +-------------------------------------------------------------+
                                    |                        AWS Cloud                             |
                                    |  +-------------------------------------------------------+  |
                                    |  |                     Route53 (DNS)                      |  |
                                    |  |                    flexobo.com                         |  |
                                    |  +-------------------------------------------------------+  |
                                    |                           |                                  |
                                    |  +-------------------------------------------------------+  |
                                    |  |                ACM (SSL Certificates)                  |  |
                                    |  |              *.flexobo.com, *.dev.flexobo.com          |  |
                                    |  +-------------------------------------------------------+  |
                                    |                           |                                  |
                                    |  +-------------------------------------------------------+  |
                                    |  |                    VPC (10.0.0.0/16)                   |  |
                                    |  |  +------------------+    +------------------+         |  |
                                    |  |  |  Public Subnets  |    |  Private Subnets |         |  |
                                    |  |  |   NAT Gateway    |    |      EKS         |         |  |
                                    |  |  |   Kong (ALB)     |<---|    RDS (PG)      |         |  |
                                    |  |  +------------------+    |   OpenSearch     |         |  |
                                    |  |                          +------------------+         |  |
                                    |  +-------------------------------------------------------+  |
                                    |                                                              |
                                    |  +-----------------+  +-----------------+  +-------------+  |
                                    |  |  Secrets Manager |  |       S3        |  |    ECR     |  |
                                    |  |   (Credentials)  |  |   (Backups)     |  |  (Images)  |  |
                                    |  +-----------------+  +-----------------+  +-------------+  |
                                    +-------------------------------------------------------------+
```

### Kubernetes Architecture

```
+-----------------------------------------------------------------------------------+
|                              EKS Cluster                                           |
|  +-----------------------------------------------------------------------------+  |
|  |                           Istio Service Mesh                                 |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  |   auth-service   |  |   main-service   |  |   users-service  |            |  |
|  |  |   + istio-proxy  |  |   + istio-proxy  |  |   + istio-proxy  |            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  |  billing-service |  |   chat-service   |  |   file-service   |            |  |
|  |  |   + istio-proxy  |  |   + istio-proxy  |  |   + istio-proxy  |            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  +------------------+  +------------------+                                  |  |
|  |  |notification-svc  |  | telegram-service |                                  |  |
|  |  |   + istio-proxy  |  |   + istio-proxy  |                                  |  |
|  |  +------------------+  +------------------+                                  |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  +------------------+  +------------------+  +------------------+                  |
|  |     RabbitMQ     |  |      Redis       |  |  External Secrets |                 |
|  +------------------+  +------------------+  +------------------+                  |
|                                                                                    |
|  +------------------+  +------------------+  +------------------+                  |
|  |   Kong Gateway   |  |   cert-manager   |  |   Istio Control  |                 |
|  |   (Ingress)      |  |  (TLS Certs)     |  |     Plane        |                 |
|  +------------------+  +------------------+  +------------------+                  |
+-----------------------------------------------------------------------------------+
                                        |
                    +-------------------+-------------------+
                    |                   |                   |
            +-------v-------+   +-------v-------+   +-------v-------+
            |   Prometheus  |   |    Grafana    |   |    Jaeger     |
            |   (Metrics)   |   |  (Dashboards) |   |   (Tracing)   |
            +---------------+   +---------------+   +---------------+
```

---

## Component Versions

| Component | Version | Purpose |
|-----------|---------|---------|
| Terraform AWS Provider | 6.26.0 | Infrastructure as Code |
| Terraform EKS Module | 21.10.1 | EKS cluster management |
| Kubernetes | 1.29+ | Container orchestration |
| Istio | 1.28.1 | Service mesh, mTLS |
| Kong Ingress Controller | 3.5.3 | API Gateway |
| cert-manager | 1.19.2 | TLS certificate management |
| External Secrets Operator | latest | Secrets from AWS |
| Rancher | 2.13.0 | Cluster management UI |
| Jaeger | 2.13.0 | Distributed tracing |
| Prometheus | latest | Metrics collection |
| Grafana | latest | Visualization |
| Loki | latest | Log aggregation |

---

## Directory Structure

```
infrastructure/
├── terraform/
│   ├── modules/
│   │   ├── vpc/              # VPC with public/private subnets
│   │   ├── eks/              # EKS cluster with managed node groups
│   │   ├── rds/              # PostgreSQL database
│   │   ├── ecr/              # Container registry
│   │   ├── iam/              # IAM roles and policies
│   │   ├── security-groups/  # Security groups
│   │   ├── route53/          # DNS management
│   │   ├── acm/              # SSL certificates
│   │   ├── s3/               # Storage buckets
│   │   ├── opensearch/       # Jaeger backend
│   │   └── secrets-manager/  # Centralized secrets
│   ├── environments/
│   │   ├── dev/              # Development environment
│   │   └── prod/             # Production environment
│   └── shared/
│       └── versions.tf       # Provider versions
├── k8s/
│   ├── base/                 # Base Kustomize configuration
│   │   ├── cert-manager/     # TLS certificates
│   │   ├── external-secrets/ # AWS Secrets Manager integration
│   │   ├── istio/            # Service mesh configuration
│   │   ├── kong/             # API Gateway
│   │   ├── monitoring/       # Prometheus, Grafana, Loki, Jaeger
│   │   ├── network-policies/ # Network security
│   │   ├── rbac/             # Role-based access control
│   │   ├── rabbitmq/         # Message queue
│   │   ├── redis/            # Cache
│   │   └── services/         # Microservice deployments
│   ├── overlays/
│   │   ├── development/      # Dev-specific overrides
│   │   └── production/       # Prod-specific overrides
│   └── rancher/              # Rancher installation
└── README.md
```

---

## Estimated Costs

### Development Environment (~$166/month)

| Component | Spec | Cost |
|-----------|------|------|
| EKS Control Plane | 1 cluster | $73 |
| EC2 Nodes | 2x t3.small | $30 |
| RDS PostgreSQL | db.t3.micro | $13 |
| NAT Gateway | 1 gateway | $33 |
| OpenSearch | Free tier | $0 |
| ALB | 1 load balancer | $16 |
| S3 | ~10GB | $1 |

### Production Environment (~$382/month)

| Component | Spec | Cost |
|-----------|------|------|
| EKS Control Plane | 1 cluster | $73 |
| EC2 Nodes | 2x t3.large | $122 |
| RDS PostgreSQL | db.t3.medium Multi-AZ | $106 |
| NAT Gateway | 1 gateway | $33 |
| OpenSearch | t3.small.search | $26 |
| ALB | 1 load balancer | $20 |
| S3 | ~50GB | $2 |

### Combined Total: ~$548/month

---

## Prerequisites

Before starting, ensure you have the following installed:

```bash
# Required tools
aws --version          # AWS CLI v2.x
terraform --version    # >= 1.5.7
kubectl version        # >= 1.29
helm version           # >= 3.18
istioctl version       # 1.28.x

# Verify AWS credentials
aws sts get-caller-identity
```

### Required AWS Permissions

The IAM user/role needs these permissions:

- `AdministratorAccess` (for initial setup) or
- Custom policy with: EKS, EC2, VPC, RDS, S3, ECR, Route53, ACM, SecretsManager, IAM

---

## Deployment Guide

### Phase 1: AWS Foundation

#### Step 1.1: Create Terraform Backend

```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://flexobo-terraform-state --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket flexobo-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name flexobo-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

#### Step 1.2: Deploy Development Infrastructure

```bash
cd infrastructure/terraform/environments/dev

# Create terraform.tfvars with your secrets
cat > terraform.tfvars <<EOF
db_password         = "$(openssl rand -base64 24)"
opensearch_password = "$(openssl rand -base64 24)"
EOF

# Save the passwords securely!
cat terraform.tfvars

# Initialize Terraform
terraform init

# Review the plan
terraform plan -out=tfplan

# Apply (this takes 15-20 minutes)
terraform apply tfplan
```

#### Step 1.3: Configure kubectl

```bash
# Get the kubeconfig command from Terraform output
terraform output kubeconfig_command

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name flexobo-dev

# Verify connection
kubectl get nodes
kubectl cluster-info
```

#### Step 1.4: Update DNS (Domain Registrar)

```bash
# Get Route53 nameservers
terraform output route53_name_servers

# Update your domain registrar with these NS records
# This may take up to 48 hours to propagate
```

---

### Phase 2: Kubernetes Setup

#### Step 2.1: Install cert-manager

```bash
# Add Helm repo
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.19.2 \
  --set installCRDs=true

# Verify installation
kubectl get pods -n cert-manager
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=120s
```

#### Step 2.2: Install External Secrets Operator

```bash
# Add Helm repo
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install External Secrets
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace

# Verify
kubectl get pods -n external-secrets
```

#### Step 2.3: Apply Base Kubernetes Configuration

```bash
# Apply RBAC, Network Policies, ConfigMaps
kubectl apply -k infrastructure/k8s/base

# Verify namespaces
kubectl get namespaces
```

---

### Phase 3: Service Mesh & Gateway

#### Step 3.1: Install Istio

```bash
# Download Istio (if not already installed)
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.28.1 sh -

# Install Istio with custom configuration
istioctl install -f infrastructure/k8s/base/istio/istio-operator.yaml -y

# Verify Istio installation
kubectl get pods -n istio-system
istioctl verify-install

# Enable sidecar injection for flexobo namespace
kubectl label namespace flexobo istio-injection=enabled
```

#### Step 3.2: Install Kong Ingress Controller

```bash
# Add Helm repo
helm repo add kong https://charts.konghq.com
helm repo update

# Install Kong
helm install kong kong/kong \
  --namespace kong \
  --create-namespace \
  -f infrastructure/k8s/base/kong/helm-values.yaml

# Verify
kubectl get pods -n kong
kubectl get svc -n kong

# Get Kong's external IP/hostname
kubectl get svc kong-kong-proxy -n kong -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

#### Step 3.3: Configure DNS for Kong

```bash
# Create Route53 A record pointing to Kong ALB
# Update in infrastructure/terraform/modules/route53 or manually:
# api.flexobo.com -> Kong ALB
# dev.api.flexobo.com -> Kong ALB
```

---

### Phase 4: Monitoring Stack

#### Step 4.1: Install Prometheus Stack

```bash
# Add Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus, Alertmanager, and Grafana
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  -f infrastructure/k8s/base/monitoring/prometheus/helm-values.yaml

# Verify
kubectl get pods -n monitoring
```

#### Step 4.2: Install Loki (Log Aggregation)

```bash
# Add Grafana Helm repo
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Loki
helm install loki grafana/loki \
  --namespace monitoring \
  -f infrastructure/k8s/base/monitoring/loki/helm-values.yaml

# Verify
kubectl get pods -n monitoring -l app.kubernetes.io/name=loki
```

#### Step 4.3: Install Jaeger (Distributed Tracing)

```bash
# Add Jaeger Helm repo
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update

# Install Jaeger
helm install jaeger jaegertracing/jaeger \
  --namespace monitoring \
  -f infrastructure/k8s/base/monitoring/jaeger/helm-values.yaml

# Verify
kubectl get pods -n monitoring -l app.kubernetes.io/name=jaeger
```

#### Step 4.4: Install Rancher (Optional - Cluster Management UI)

```bash
# Run the Rancher installation script
chmod +x infrastructure/k8s/rancher/install.sh
./infrastructure/k8s/rancher/install.sh

# Save the bootstrap password displayed!
```

---

### Phase 5: Application Deployment

#### Step 5.1: Create ECR Repositories

```bash
# Terraform should have created these, verify:
aws ecr describe-repositories --region us-east-1 | jq '.repositories[].repositoryName'

# Expected repositories:
# flexobo/auth-service
# flexobo/main-service
# flexobo/users-service
# flexobo/billing-service
# flexobo/chat-service
# flexobo/file-service
# flexobo/notification-service
# flexobo/telegram-service
```

#### Step 5.2: Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push each service (from project root)
for service in auth-service main-service users-service billing-service chat-service file-service notification-service telegram-service; do
  docker build -t flexobo/$service -f apps/$service/Dockerfile .
  docker tag flexobo/$service:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/flexobo/$service:latest
  docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/flexobo/$service:latest
done
```

#### Step 5.3: Deploy Services

```bash
# Apply development overlay
kubectl apply -k infrastructure/k8s/overlays/development

# Verify deployments
kubectl get deployments -n flexobo
kubectl get pods -n flexobo

# Check Istio sidecars are injected
kubectl get pods -n flexobo -o jsonpath='{range .items[*]}{.metadata.name}{" - "}{.spec.containers[*].name}{"\n"}{end}'
```

#### Step 5.4: Run Database Migrations

```bash
# For each service with Prisma
for service in auth-service users-service chat-service file-service main-service billing-service notification-service telegram-service; do
  POD=$(kubectl get pod -n flexobo -l app=$service -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
  if [ -n "$POD" ]; then
    echo "Running migrations for $service..."
    kubectl exec -n flexobo $POD -- npx prisma migrate deploy || echo "No migrations for $service"
  fi
done
```

#### Step 5.5: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n flexobo

# Check services
kubectl get svc -n flexobo

# Check ingress
kubectl get ingress -n flexobo

# Test API endpoint
curl -k https://api.flexobo.com/health
```

---

## CI/CD Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI | `ci.yml` | PR, Push to dev/main | Lint, test, build affected projects |
| Deploy | `deploy.yml` | Push to dev/main | Build images, deploy to K8s |
| Security Scan | `security-scan.yml` | PR, Push, Daily 2AM | CodeQL, Trivy, dependency audit |
| Backup | `backup.yml` | Daily, Manual | RDS snapshots to S3 |
| Terraform | `terraform.yml` | PR, Push to infra changes | Plan/apply infrastructure |

### How Deployment Works

1. **Push to `dev` branch** triggers deployment to development environment
2. **Push to `main` branch** triggers deployment to production environment
3. Only **affected services** are built and deployed (Nx monorepo detection)
4. Deployment uses `kubectl set image` for rolling updates
5. Successful deployments are tagged: `deployed-{branch}-{sha}`

---

## Security Features

| Feature | Implementation |
|---------|----------------|
| mTLS | Istio service mesh with STRICT mode |
| Network Policies | Default deny-all, explicit allow rules |
| Secrets Management | External Secrets Operator + AWS Secrets Manager |
| RBAC | Per-service accounts with least-privilege |
| Container Security | Trivy scanning in CI/CD |
| API Gateway | Kong with rate limiting, JWT validation |
| TLS | Let's Encrypt via cert-manager |
| Secret Detection | Gitleaks + TruffleHog in CI |

---

## Monitoring & Observability

| Tool | Purpose | Access |
|------|---------|--------|
| Grafana | Dashboards | `https://grafana.flexobo.com` |
| Prometheus | Metrics | Internal (port-forward: 9090) |
| Loki | Logs | Via Grafana |
| Jaeger | Tracing | Internal (port-forward: 16686) |
| Rancher | Cluster UI | `https://rancher.flexobo.com` |

### Port Forwarding (Development)

```bash
# Grafana
kubectl port-forward svc/prometheus-grafana -n monitoring 3000:80

# Prometheus
kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090

# Jaeger UI
kubectl port-forward svc/jaeger-query -n monitoring 16686:16686
```

---

## Backup Strategy

| Data | Method | Retention |
|------|--------|-----------|
| RDS Database | Automated snapshots | Dev: 7 days, Prod: 30 days |
| S3 Files | Cross-region replication | Indefinite |
| Kubernetes Secrets | External Secrets (AWS) | N/A (source of truth) |

### Manual Backup

```bash
# Trigger manual RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier flexobo-dev-postgres \
  --db-snapshot-identifier flexobo-manual-$(date +%Y%m%d)

# Export to S3 (optional)
aws rds start-export-task \
  --export-task-identifier flexobo-export-$(date +%Y%m%d) \
  --source-arn <snapshot-arn> \
  --s3-bucket-name flexobo-db-backups \
  --iam-role-arn <export-role-arn> \
  --kms-key-id <kms-key-id>
```

---

## Troubleshooting

### Common Issues

#### 1. Terraform State Lock

```bash
# Force unlock (use with caution)
terraform force-unlock <LOCK_ID>
```

#### 2. EKS Authentication Issues

```bash
# Refresh kubeconfig
aws eks update-kubeconfig --region us-east-1 --name flexobo-dev

# Check AWS identity
aws sts get-caller-identity
```

#### 3. Certificate Not Ready

```bash
# Check certificate status
kubectl describe certificate -n flexobo

# Check certificate request
kubectl describe certificaterequest -n flexobo

# Check cert-manager logs
kubectl logs -n cert-manager -l app.kubernetes.io/name=cert-manager
```

#### 4. Istio Sidecar Not Injected

```bash
# Verify namespace label
kubectl get namespace flexobo -o jsonpath='{.metadata.labels}'

# Enable injection
kubectl label namespace flexobo istio-injection=enabled --overwrite

# Restart deployments
kubectl rollout restart deployment -n flexobo
```

#### 5. Pod Stuck in Pending

```bash
# Check events
kubectl describe pod <pod-name> -n flexobo

# Check node resources
kubectl describe nodes | grep -A 5 "Allocated resources"
```

#### 6. External Secrets Not Syncing

```bash
# Check ExternalSecret status
kubectl get externalsecret -n flexobo

# Check secret store
kubectl describe clustersecretstore aws-secrets-manager

# Check External Secrets Operator logs
kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets
```

---

## Maintenance

### Updating Helm Releases

```bash
# Update Helm repos
helm repo update

# Upgrade cert-manager
helm upgrade cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --reuse-values

# Upgrade Kong
helm upgrade kong kong/kong \
  --namespace kong \
  --reuse-values
```

### Scaling

```bash
# Scale deployment
kubectl scale deployment auth-service -n flexobo --replicas=3

# Scale node group (via Terraform)
# Edit infrastructure/terraform/environments/dev/main.tf
# Change desired_size in eks module
terraform apply
```

### Rotating Secrets

```bash
# Update secret in AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id flexobo/dev/database \
  --secret-string '{"username":"postgres","password":"new-password"}'

# Force External Secrets to refresh
kubectl annotate externalsecret database-credentials -n flexobo force-sync=$(date +%s) --overwrite
```

---

## Support

For issues and feature requests, please use the GitHub Issues tracker.
