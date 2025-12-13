# Flexobo Infrastructure Setup Guide

A step-by-step guide for deploying the Flexobo microservices infrastructure from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup (Terraform)](#infrastructure-setup-terraform)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Helm Charts Installation](#helm-charts-installation)
5. [Service Deployment](#service-deployment)
6. [DNS & SSL Configuration](#dns--ssl-configuration)
7. [Verification](#verification)
8. [Local Development](#local-development)

---

## Prerequisites

### Required Tools

| Tool | Version | Installation |
|------|---------|--------------|
| AWS CLI | 2.x | `brew install awscli` |
| Terraform | 1.5.7+ | `brew install terraform` |
| kubectl | 1.29+ | `brew install kubectl` |
| Helm | 3.x | `brew install helm` |
| Docker | 24+ | Docker Desktop |

### AWS Account Setup

1. Create an AWS account or use existing one
2. Create an IAM user with programmatic access
3. Attach these policies: `AdministratorAccess` (or specific policies for EKS, RDS, S3, etc.)
4. Configure AWS CLI:

```bash
aws configure
# Enter: AWS Access Key ID, Secret Access Key, Region (us-east-1)
```

### Domain Setup

Register a domain (e.g., `flexobo-mock.site`) and note the hosted zone ID if using Route53.

---

## Infrastructure Setup (Terraform)

### Step 1: Clone Repository

```bash
git clone https://github.com/achilovbakhrom/flexobo-microservice-example.git
cd flexobo-microservice-example
```

### Step 2: Create Terraform Backend (First Time Only)

Create S3 bucket and DynamoDB table for Terraform state:

```bash
# Create S3 bucket for state
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

### Step 3: Configure Variables

Create `infrastructure/terraform/environments/dev/terraform.tfvars`:

```hcl
project_name       = "flexobo"
environment        = "dev"
aws_region         = "us-east-1"
domain_name        = "flexobo-mock.site"
vpc_cidr           = "10.0.0.0/16"
kubernetes_version = "1.29"

# Sensitive - use environment variables or secrets manager
db_password         = "your-secure-db-password"
opensearch_password = "your-opensearch-password"

# Third-party (optional)
stripe_secret_key      = ""
stripe_webhook_secret  = ""
telegram_bot_token     = ""
click_secret_key       = ""
```

### Step 4: Initialize and Apply Terraform

```bash
cd infrastructure/terraform/environments/dev

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply infrastructure (takes 15-20 minutes)
terraform apply
```

This creates:

- VPC with public/private subnets
- EKS cluster with node groups
- RDS PostgreSQL database
- S3 buckets
- ECR repositories
- Route53 hosted zone
- ACM SSL certificates
- Security groups
- IAM roles

### Step 5: Connect to EKS Cluster

```bash
aws eks update-kubeconfig --region us-east-1 --name flexobo-dev

# Verify connection
kubectl get nodes
```

---

## Kubernetes Deployment

### Step 1: Install AWS Load Balancer Controller

```bash
# Add Helm repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Get OIDC provider
OIDC_ID=$(aws eks describe-cluster --name flexobo-dev --query "cluster.identity.oidc.issuer" --output text | cut -d'/' -f5)

# Create IAM service account (check if policy exists first)
eksctl create iamserviceaccount \
  --cluster=flexobo-dev \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --attach-policy-arn=arn:aws:iam::aws:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

# Install controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=flexobo-dev \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

### Step 2: Apply Base Kubernetes Resources

```bash
cd infrastructure/k8s/base

# Apply namespace and core resources
kubectl apply -f namespace.yaml
kubectl apply -f storage-class.yaml
kubectl apply -f configmap.yaml

# Apply RBAC
kubectl apply -k rbac/

# Apply network policies
kubectl apply -k network-policies/
```

### Step 3: Deploy RabbitMQ and Redis

```bash
kubectl apply -k rabbitmq/
kubectl apply -k redis/

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=rabbitmq -n flexobo --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n flexobo --timeout=120s
```

---

## Helm Charts Installation

### Rancher (Cluster Management UI)

```bash
# Add Rancher repo
helm repo add rancher-latest https://releases.rancher.com/server-charts/latest
helm repo update

# Create namespace
kubectl create namespace cattle-system

# Install Rancher
helm install rancher rancher-latest/rancher \
  --namespace cattle-system \
  --set hostname=rancher.flexobo-mock.site \
  --set bootstrapPassword=admin \
  --set ingress.ingressClassName=alb \
  --set ingress.tls.source=secret \
  --set 'ingress.extraAnnotations.alb\.ingress\.kubernetes\.io/scheme=internet-facing' \
  --set 'ingress.extraAnnotations.alb\.ingress\.kubernetes\.io/target-type=ip' \
  --set 'ingress.extraAnnotations.alb\.ingress\.kubernetes\.io/certificate-arn=<YOUR_ACM_CERT_ARN>' \
  --set 'ingress.extraAnnotations.alb\.ingress\.kubernetes\.io/listen-ports=[{"HTTP": 80}, {"HTTPS": 443}]' \
  --set 'ingress.extraAnnotations.alb\.ingress\.kubernetes\.io/ssl-redirect=443' \
  --set 'ingress.extraAnnotations.alb\.ingress\.kubernetes\.io/group\.name=flexobo-rancher' \
  --set 'ingress.extraAnnotations.alb\.ingress\.kubernetes\.io/success-codes=200-399' \
  --set 'ingress.extraAnnotations.alb\.ingress\.kubernetes\.io/healthcheck-path=/healthz'

# Fix path type for ALB
kubectl patch ingress rancher -n cattle-system --type='json' \
  -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/pathType", "value": "Prefix"}]'
```

---

## Service Deployment

### Step 1: Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build and push each service
for svc in main-service users-service chat-service file-service billing-service notification-service telegram-service; do
  docker build --platform linux/amd64 \
    -t <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/flexobo/$svc:latest \
    -f apps/$svc/Dockerfile .
  docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/flexobo/$svc:latest
done
```

### Step 2: Create Database Schemas

Each service uses a separate schema in the shared RDS instance:

```bash
# Get RDS endpoint
RDS_HOST=$(terraform output -raw db_instance_address)

# Create schemas (from a bastion or pod with psql)
kubectl run db-setup --rm -i --restart=Never \
  --image=postgres:15-alpine \
  -n flexobo \
  --env="PGPASSWORD=<DB_PASSWORD>" \
  -- psql -h $RDS_HOST -U postgres -d flexobo -c "
    CREATE SCHEMA IF NOT EXISTS main;
    CREATE SCHEMA IF NOT EXISTS users;
    CREATE SCHEMA IF NOT EXISTS chat;
    CREATE SCHEMA IF NOT EXISTS files;
    CREATE SCHEMA IF NOT EXISTS billing;
    CREATE SCHEMA IF NOT EXISTS notifications;
    CREATE SCHEMA IF NOT EXISTS telegram;
  "
```

### Step 3: Update ConfigMap with Database Connection

```bash
kubectl edit configmap flexobo-config -n flexobo
# Update DB_HOST with RDS endpoint
```

### Step 4: Create Secrets

```bash
kubectl create secret generic flexobo-secrets -n flexobo \
  --from-literal=DB_PASSWORD=<your-db-password> \
  --from-literal=JWT_SECRET=<your-jwt-secret> \
  --from-literal=STRIPE_SECRET_KEY=<stripe-key> \
  --from-literal=STRIPE_WEBHOOK_SECRET=<stripe-webhook> \
  --from-literal=TELEGRAM_BOT_TOKEN=<telegram-token>
```

### Step 5: Deploy Services

```bash
kubectl apply -k infrastructure/k8s/base/services/
```

### Step 6: Apply Ingress

```bash
kubectl apply -f infrastructure/k8s/base/ingress/alb-ingress.yaml
```

---

## DNS & SSL Configuration

### Step 1: Get ALB DNS Name

```bash
# Wait for ALB to be created
kubectl get ingress -n flexobo -w

# Get ALB DNS
ALB_DNS=$(kubectl get ingress flexobo-ingress -n flexobo -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "ALB DNS: $ALB_DNS"
```

### Step 2: Create Route53 Records

```bash
HOSTED_ZONE_ID=<your-hosted-zone-id>
ALB_HOSTED_ZONE_ID=Z35SXDOTRQ7X7K  # us-east-1 ALB zone

# Create alias record for API
aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch '{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "dev-api.flexobo-mock.site",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "'$ALB_HOSTED_ZONE_ID'",
        "DNSName": "'$ALB_DNS'",
        "EvaluateTargetHealth": true
      }
    }
  }]
}'
```

Repeat for other subdomains as needed.

---

## Verification

### Check All Pods Running

```bash
kubectl get pods -n flexobo
kubectl get pods -n cattle-system
kubectl get pods -n kube-system | grep aws-load-balancer
```

### Check Services

```bash
kubectl get svc -n flexobo
```

### Check Ingress and ALB

```bash
kubectl get ingress -A
```

### Test Endpoints

```bash
# Test API
curl -I https://dev-api.flexobo-mock.site

# Test Rancher
curl -I https://rancher.flexobo-mock.site
```

### Access Rancher UI

1. Open <https://rancher.flexobo-mock.site>
2. Login with bootstrap password: `admin`
3. Set new admin password

---

## Local Development

### Quick Start

```bash
# Install dependencies
yarn install

# Start shared infrastructure (RabbitMQ)
cd infrastructure && docker-compose up -d && cd ..

# Start service-specific database
cd apps/users-service && docker-compose up -d && cd ../..

# Generate Prisma client
yarn db:generate:users

# Push schema
yarn db:push:users

# Start service
yarn start:users
```

### Port Assignments

| Service | Port |
|---------|------|
| main-service | 3008 |
| users-service | 3005 |
| chat-service | 3006 |
| file-service | 3007 |
| billing-service | 3009 |
| notification-service | 3010 |
| telegram-service | 3012 |

---

## Troubleshooting

### Terraform Issues

```bash
# Re-initialize if module changes
terraform init -upgrade

# Import existing resource
terraform import module.eks.aws_eks_cluster.this flexobo-dev

# Force unlock state
terraform force-unlock <LOCK_ID>
```

### EKS Connection Issues

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name flexobo-dev

# Check current context
kubectl config current-context

# Check cluster info
kubectl cluster-info
```

### Pod Issues

```bash
# Check pod status
kubectl describe pod <pod-name> -n flexobo

# Check logs
kubectl logs -f <pod-name> -n flexobo

# Shell into pod
kubectl exec -it <pod-name> -n flexobo -- /bin/sh
```

### ALB Issues

```bash
# Check ALB controller logs
kubectl logs -f deployment/aws-load-balancer-controller -n kube-system

# Describe ingress
kubectl describe ingress flexobo-ingress -n flexobo
```

### Database Connection

```bash
# Port-forward to RDS (for debugging)
kubectl run pg-client --rm -i --tty --restart=Never \
  --image=postgres:15-alpine \
  -n flexobo \
  -- psql -h <RDS_HOST> -U postgres -d flexobo
```

---

## Quick Reference

### Common Commands

```bash
# Kubernetes
kubectl get pods -n flexobo
kubectl logs -f deployment/<service> -n flexobo
kubectl rollout restart deployment/<service> -n flexobo

# Docker/ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker build -t <repo>:<tag> -f apps/<service>/Dockerfile .
docker push <repo>:<tag>

# Terraform
terraform plan
terraform apply
terraform destroy
```

### Service URLs (Production)

| Service | URL |
|---------|-----|
| Main API | <https://dev-api.flexobo-mock.site> |
| Users API | <https://dev-users-api.flexobo-mock.site> |
| Chat API | <https://dev-chat-api.flexobo-mock.site> |
| File API | <https://dev-file-api.flexobo-mock.site> |
| Billing API | <https://dev-billing-api.flexobo-mock.site> |
| Notification API | <https://dev-notification-api.flexobo-mock.site> |
| Telegram API | <https://dev-telegram-api.flexobo-mock.site> |
| Rancher UI | <https://rancher.flexobo-mock.site> |
