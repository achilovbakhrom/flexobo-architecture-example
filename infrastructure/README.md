# Flexobo Infrastructure

Production-grade AWS infrastructure for Flexobo microservices platform.

## Architecture Overview

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                        AWS Cloud                             │
                                    │  ┌─────────────────────────────────────────────────────────┐│
                                    │  │                     Route53 (DNS)                        ││
                                    │  │                    flexobo.com                           ││
                                    │  └─────────────────────────────────────────────────────────┘│
                                    │                           │                                  │
                                    │  ┌─────────────────────────────────────────────────────────┐│
                                    │  │                ACM (SSL Certificates)                    ││
                                    │  │              *.flexobo.com, *.dev.flexobo.com            ││
                                    │  └─────────────────────────────────────────────────────────┘│
                                    │                           │                                  │
                                    │  ┌─────────────────────────────────────────────────────────┐│
                                    │  │                    VPC (10.0.0.0/16)                     ││
                                    │  │  ┌──────────────────┐    ┌──────────────────┐           ││
                                    │  │  │  Public Subnets  │    │  Private Subnets │           ││
                                    │  │  │   NAT Gateway    │    │      EKS         │           ││
                                    │  │  │       ALB        │◄───│    RDS (PG)      │           ││
                                    │  │  └──────────────────┘    │   OpenSearch     │           ││
                                    │  │                          └──────────────────┘           ││
                                    │  └─────────────────────────────────────────────────────────┘│
                                    │                                                              │
                                    │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
                                    │  │  Secrets Manager │  │       S3        │  │    ECR     │ │
                                    │  │   (Credentials)  │  │   (Backups)     │  │  (Images)  │ │
                                    │  └─────────────────┘  └─────────────────┘  └─────────────┘ │
                                    └─────────────────────────────────────────────────────────────┘
```

## Component Versions (December 2025)

| Component | Version |
|-----------|---------|
| Terraform AWS Provider | 6.26.0 |
| Terraform EKS Module | 21.10.1 |
| Kubernetes | 1.29+ |
| Istio | 1.28.1 |
| Kong Ingress Controller | 3.5.3 |
| cert-manager | 1.19.2 |
| External Secrets Operator | latest |
| Rancher | 2.13.0 |
| Jaeger | 2.13.0 |

## Estimated Monthly Costs

| Environment | Component | Cost |
|-------------|-----------|------|
| **Dev** | EKS Control Plane | $73 |
| | EC2 (2x t3.small) | $30 |
| | RDS (db.t3.micro) | $13 |
| | NAT Gateway | $33 |
| | OpenSearch (free tier) | $0 |
| | ALB | $16 |
| | S3 (~10GB) | $1 |
| | **Dev Total** | **~$166/mo** |
| **Prod** | EKS Control Plane | $73 |
| | EC2 (2x t3.large) | $122 |
| | RDS (db.t3.medium Multi-AZ) | $106 |
| | NAT Gateway | $33 |
| | OpenSearch (t3.small.search) | $26 |
| | ALB | $20 |
| | S3 (~50GB) | $2 |
| | **Prod Total** | **~$382/mo** |
| | **Combined Total** | **~$548/mo** |

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
└── README.md
```

## Quick Start

### Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform >= 1.5.7
3. kubectl
4. helm >= 3.18

### 1. Initialize Terraform Backend

```bash
# Create S3 bucket for state
aws s3 mb s3://flexobo-terraform-state --region us-east-1

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name flexobo-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### 2. Deploy Development Environment

```bash
cd infrastructure/terraform/environments/dev

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
db_password         = "your-secure-password"
opensearch_password = "your-opensearch-password"
EOF

# Initialize and apply
terraform init
terraform plan
terraform apply
```

### 3. Configure kubectl

```bash
# Get kubeconfig command from Terraform output
terraform output kubeconfig_command

# Run the command
aws eks update-kubeconfig --region us-east-1 --name flexobo-dev
```

### 4. Update Domain Registrar

After Route53 zone is created, update your domain registrar with the NS records:

```bash
terraform output route53_name_servers
```

### 5. Install Helm Charts

```bash
# cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true \
  -f k8s/base/cert-manager/helm-values.yaml

# External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets --create-namespace \
  -f k8s/base/external-secrets/helm-values.yaml

# Istio
istioctl install -f k8s/base/istio/istio-operator.yaml

# Kong
helm repo add kong https://charts.konghq.com
helm install kong kong/kong \
  --namespace kong --create-namespace \
  -f k8s/base/kong/helm-values.yaml

# Prometheus Stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  -f k8s/base/monitoring/prometheus/helm-values.yaml

# Grafana
helm repo add grafana https://grafana.github.io/helm-charts
helm install grafana grafana/grafana \
  --namespace monitoring \
  -f k8s/base/monitoring/grafana/helm-values.yaml

# Loki
helm install loki grafana/loki \
  --namespace monitoring \
  -f k8s/base/monitoring/loki/helm-values.yaml

# Jaeger
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm install jaeger jaegertracing/jaeger \
  --namespace monitoring \
  -f k8s/base/monitoring/jaeger/helm-values.yaml

# Rancher (on dev cluster)
./k8s/rancher/install.sh
```

### 6. Apply Kubernetes Manifests

```bash
# Apply base configuration
kubectl apply -k k8s/base

# Apply environment-specific overlay
kubectl apply -k k8s/overlays/development
```

## Security Features

- **mTLS**: Istio service mesh with STRICT mTLS mode
- **Network Policies**: Default deny-all with explicit allow rules
- **Secrets Management**: External Secrets Operator with AWS Secrets Manager
- **RBAC**: Per-service accounts with least-privilege access
- **Container Security**: Trivy scanning in CI/CD
- **API Gateway**: Kong with rate limiting, JWT validation, CORS
- **TLS**: Let's Encrypt certificates via cert-manager

## Monitoring & Observability

| Tool | Purpose | Access |
|------|---------|--------|
| Grafana | Dashboards & Visualization | https://grafana.flexobo.com |
| Prometheus | Metrics Collection | Internal only |
| Loki | Log Aggregation | Via Grafana |
| Jaeger | Distributed Tracing | Internal only |
| Rancher | Cluster Management | https://rancher.flexobo.com |

## Backup Strategy

- **RDS**: Daily automated snapshots (7-day retention for dev, 30-day for prod)
- **S3 Exports**: Optional export to S3 with Glacier transition
- **GitHub Actions**: Automated backup workflow (`.github/workflows/backup.yml`)

## CI/CD Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR, Push | Build, test, lint |
| `deploy.yml` | Push to dev/main | Build images, deploy to K8s |
| `security-scan.yml` | PR, Push, Daily | Security scanning |
| `backup.yml` | Daily, Manual | Database backups |
| `terraform.yml` | PR, Push | Infrastructure changes |

## Troubleshooting

### Common Issues

1. **Terraform state lock**:
   ```bash
   terraform force-unlock <LOCK_ID>
   ```

2. **EKS auth issues**:
   ```bash
   aws eks update-kubeconfig --region us-east-1 --name flexobo-dev
   ```

3. **Certificate not ready**:
   ```bash
   kubectl describe certificate -n flexobo
   kubectl describe certificaterequest -n flexobo
   ```

4. **Istio sidecar issues**:
   ```bash
   istioctl analyze
   kubectl logs -n istio-system -l app=istiod
   ```

## Support

For issues and feature requests, please use the GitHub Issues tracker.
