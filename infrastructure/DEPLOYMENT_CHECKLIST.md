# Deployment Checklist

Step-by-step instructions to deploy Flexobo infrastructure from scratch.

---

## Pre-Deployment Checklist

- [ ] AWS account created
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] Terraform installed (>= 1.5.7)
- [ ] kubectl installed (>= 1.29)
- [ ] Helm installed (>= 3.18)
- [ ] istioctl installed (1.28.x)
- [ ] Domain registered (flexobo.com or your domain)
- [ ] Docker installed (for building images)

Verify:

```bash
aws --version
terraform --version
kubectl version --client
helm version
istioctl version --remote=false
docker --version
aws sts get-caller-identity
```

---

## Phase 1: AWS Foundation (Terraform)

### Step 1: Create Terraform Backend

```bash
# Create S3 bucket for state
aws s3 mb s3://flexobo-terraform-state --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket flexobo-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name flexobo-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

- [ ] S3 bucket created
- [ ] Versioning enabled
- [ ] DynamoDB table created

### Step 2: Generate Secrets

```bash
# Generate and save these passwords securely
DB_PASSWORD=$(openssl rand -base64 24)
OPENSEARCH_PASSWORD=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -base64 32)

echo "DB_PASSWORD: $DB_PASSWORD"
echo "OPENSEARCH_PASSWORD: $OPENSEARCH_PASSWORD"
echo "JWT_SECRET: $JWT_SECRET"

# SAVE THESE SOMEWHERE SECURE (1Password, AWS Secrets Manager, etc.)
```

- [ ] Passwords generated
- [ ] Passwords saved securely

### Step 3: Deploy Dev Infrastructure

```bash
cd infrastructure/terraform/environments/dev

# Create tfvars file (only required variables - others have defaults)
cat > terraform.tfvars <<EOF
db_password         = "$DB_PASSWORD"
opensearch_password = "$OPENSEARCH_PASSWORD"
EOF

# Initialize
terraform init

# STAGE 1: Plan core infrastructure (required due to OIDC dependency)
terraform plan -out=tfplan \
  -target=module.vpc \
  -target=module.route53 \
  -target=module.acm \
  -target=module.s3 \
  -target=module.security_groups \
  -target=module.iam \
  -target=module.eks \
  -target=module.rds \
  -target=module.ecr

# Review the plan output, then apply Stage 1
terraform apply tfplan

# STAGE 2: After EKS is created, run full plan for remaining resources
terraform plan -out=tfplan
terraform apply tfplan
```

**Notes:**

- Stage 1 takes 15-20 minutes (EKS cluster ~10min, ACM validation depends on DNS)
- ACM certificate validation requires NS records at registrar (Step 5) - may timeout on first run
- If ACM times out, continue to Step 5 to configure DNS, then re-run `terraform apply`

**Default values** (override in terraform.tfvars if needed):

| Variable | Default |
|----------|---------|
| `project_name` | flexobo |
| `environment` | dev |
| `aws_region` | us-east-1 |
| `domain_name` | flexobo.com |
| `vpc_cidr` | 10.0.0.0/16 |
| `kubernetes_version` | 1.29 |

- [ ] terraform init successful
- [ ] Stage 1 terraform plan reviewed
- [ ] Stage 1 terraform apply completed (takes 15-20 min)
- [ ] Stage 2 terraform plan reviewed
- [ ] Stage 2 terraform apply completed

### Step 4: Configure kubectl

```bash
# Get cluster name from output
terraform output cluster_name

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name flexobo-dev

# Verify
kubectl get nodes
kubectl cluster-info
```

- [ ] kubeconfig updated
- [ ] Can see nodes
- [ ] Cluster info displayed

### Step 5: Update Domain DNS

```bash
# Get nameservers
terraform output route53_name_servers
```

Go to your domain registrar and update NS records to point to Route53.

- [ ] NS records updated at registrar
- [ ] DNS propagation verified (can take 24-48 hours)

---

## Phase 2: Kubernetes Core Components

### Step 6: Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.19.2 \
  --set installCRDs=true

# Wait for pods
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=120s

# Verify
kubectl get pods -n cert-manager
```

- [ ] cert-manager installed
- [ ] All pods running

### Step 7: Install External Secrets Operator

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace

# Wait for pods
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=external-secrets -n external-secrets --timeout=120s

# Verify
kubectl get pods -n external-secrets
```

- [ ] External Secrets installed
- [ ] All pods running

### Step 8: Apply Base K8s Configuration

```bash
# From project root
kubectl apply -k infrastructure/k8s/base

# Verify namespaces created
kubectl get namespaces

# Expected: flexobo, monitoring, cert-manager, external-secrets, kong, istio-system
```

- [ ] Base config applied
- [ ] Namespaces created

---

## Phase 3: Service Mesh and Gateway

### Step 9: Install Istio

```bash
# Download Istio if needed
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.28.1 sh -
export PATH=$PWD/istio-1.28.1/bin:$PATH

# Install with custom config
istioctl install -f infrastructure/k8s/base/istio/istio-operator.yaml -y

# Verify
kubectl get pods -n istio-system
istioctl verify-install

# Enable sidecar injection
kubectl label namespace flexobo istio-injection=enabled
```

- [ ] Istio installed
- [ ] istio-system pods running
- [ ] Sidecar injection enabled for flexobo namespace

### Step 10: Install Kong

```bash
helm repo add kong https://charts.konghq.com
helm repo update

helm install kong kong/kong \
  --namespace kong \
  --create-namespace \
  -f infrastructure/k8s/base/kong/helm-values.yaml

# Wait for pods
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=kong -n kong --timeout=180s

# Get external URL
kubectl get svc kong-kong-proxy -n kong
```

- [ ] Kong installed
- [ ] Kong pods running
- [ ] External LoadBalancer IP/hostname obtained

### Step 11: Configure Kong DNS

Create Route53 A record or CNAME:

- `api.flexobo.com` -> Kong LoadBalancer
- `dev.api.flexobo.com` -> Kong LoadBalancer (for dev)

```bash
# Get Kong's address
KONG_LB=$(kubectl get svc kong-kong-proxy -n kong -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Kong LB: $KONG_LB"
```

- [ ] DNS record created for api.flexobo.com

---

## Phase 4: Monitoring Stack

### Step 12: Install Prometheus Stack

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  -f infrastructure/k8s/base/monitoring/prometheus/helm-values.yaml

# Wait (this can take a few minutes)
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus -n monitoring --timeout=300s

# Verify
kubectl get pods -n monitoring
```

- [ ] Prometheus stack installed
- [ ] Prometheus pods running
- [ ] Grafana pods running

### Step 13: Install Loki

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install loki grafana/loki \
  --namespace monitoring \
  -f infrastructure/k8s/base/monitoring/loki/helm-values.yaml

# Verify
kubectl get pods -n monitoring -l app.kubernetes.io/name=loki
```

- [ ] Loki installed
- [ ] Loki pods running

### Step 14: Install Jaeger

```bash
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update

helm install jaeger jaegertracing/jaeger \
  --namespace monitoring \
  -f infrastructure/k8s/base/monitoring/jaeger/helm-values.yaml

# Verify
kubectl get pods -n monitoring -l app.kubernetes.io/name=jaeger
```

- [ ] Jaeger installed
- [ ] Jaeger pods running

### Step 15: Install Rancher (Optional)

```bash
chmod +x infrastructure/k8s/rancher/install.sh
./infrastructure/k8s/rancher/install.sh

# SAVE THE BOOTSTRAP PASSWORD!
```

- [ ] Rancher installed (optional)
- [ ] Bootstrap password saved

---

## Phase 5: Application Deployment

### Step 16: Verify ECR Repositories

```bash
aws ecr describe-repositories --region us-east-1 --query 'repositories[].repositoryName' --output table
```

Expected repositories:

- [ ] flexobo/auth-service
- [ ] flexobo/main-service
- [ ] flexobo/users-service
- [ ] flexobo/billing-service
- [ ] flexobo/chat-service
- [ ] flexobo/file-service
- [ ] flexobo/notification-service
- [ ] flexobo/telegram-service

### Step 17: Build and Push Images (First Time)

```bash
# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push each service
SERVICES="auth-service main-service users-service billing-service chat-service file-service notification-service telegram-service"

for service in $SERVICES; do
  echo "Building $service..."
  docker build -t flexobo/$service -f apps/$service/Dockerfile .
  docker tag flexobo/$service:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/flexobo/$service:latest
  docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/flexobo/$service:latest
done
```

- [ ] All images built
- [ ] All images pushed to ECR

### Step 18: Deploy Services

```bash
# Apply development overlay
kubectl apply -k infrastructure/k8s/overlays/development

# Wait for deployments
kubectl wait --for=condition=available deployment --all -n flexobo --timeout=300s

# Verify all pods are running
kubectl get pods -n flexobo
```

- [ ] All deployments created
- [ ] All pods running
- [ ] Istio sidecars injected (2/2 containers per pod)

### Step 19: Run Migrations

```bash
SERVICES="auth-service users-service chat-service file-service main-service billing-service notification-service telegram-service"

for service in $SERVICES; do
  POD=$(kubectl get pod -n flexobo -l app=$service -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
  if [ -n "$POD" ]; then
    echo "Running migrations for $service..."
    kubectl exec -n flexobo $POD -- npx prisma migrate deploy 2>/dev/null || echo "No migrations or error for $service"
  fi
done
```

- [ ] Migrations completed for all services

### Step 20: Verify Deployment

```bash
# Check all pods
kubectl get pods -n flexobo

# Check services
kubectl get svc -n flexobo

# Check ingress
kubectl get ingress -n flexobo

# Test health endpoint
curl -k https://api.flexobo.com/health
```

- [ ] All pods healthy
- [ ] Services exposed
- [ ] Ingress configured
- [ ] Health check passes

---

## Post-Deployment

### Access Monitoring

```bash
# Grafana (default: admin/prom-operator)
kubectl port-forward svc/prometheus-grafana -n monitoring 3000:80
# Open: http://localhost:3000

# Prometheus
kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090
# Open: http://localhost:9090

# Jaeger
kubectl port-forward svc/jaeger-query -n monitoring 16686:16686
# Open: http://localhost:16686
```

### Setup GitHub Secrets

Add these secrets to your GitHub repository for CI/CD:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
| `CODECOV_TOKEN` | From codecov.io (optional) |

- [ ] GitHub secrets configured

### Verify CI/CD

1. Push a small change to `dev` branch
2. Watch the GitHub Actions workflow
3. Verify deployment completes successfully

- [ ] CI workflow passes
- [ ] Deploy workflow passes
- [ ] Service updated in cluster

---

## Production Deployment

Repeat the above steps for production:

```bash
cd infrastructure/terraform/environments/prod

# Create terraform.tfvars with prod passwords
cat > terraform.tfvars <<EOF
db_password           = "$DB_PASSWORD_PROD"
opensearch_password   = "$OPENSEARCH_PASSWORD_PROD"
stripe_secret_key     = "sk_live_xxx"
stripe_webhook_secret = "whsec_xxx"
telegram_bot_token    = "xxx"
click_secret_key      = "xxx"
EOF

terraform init

# STAGE 1: Core infrastructure
terraform plan -out=tfplan \
  -target=module.vpc \
  -target=module.route53 \
  -target=module.acm \
  -target=module.s3 \
  -target=module.security_groups \
  -target=module.iam \
  -target=module.eks \
  -target=module.rds \
  -target=module.ecr

terraform apply tfplan

# STAGE 2: OIDC-dependent resources
terraform plan -out=tfplan
terraform apply tfplan

# Configure kubectl for prod cluster
aws eks update-kubeconfig --region us-east-1 --name flexobo-prod

# Install all Helm charts (same commands as dev, different cluster)
# Apply prod overlay
kubectl apply -k infrastructure/k8s/overlays/production
```

---

## Quick Reference

### Useful Commands

```bash
# View logs
kubectl logs -f deployment/auth-service -n flexobo

# Shell into pod
kubectl exec -it deployment/auth-service -n flexobo -- sh

# Restart deployment
kubectl rollout restart deployment/auth-service -n flexobo

# Scale deployment
kubectl scale deployment auth-service -n flexobo --replicas=3

# Check resource usage
kubectl top pods -n flexobo

# Istio dashboard
istioctl dashboard kiali
```

### Emergency Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/auth-service -n flexobo

# Rollback to specific revision
kubectl rollout undo deployment/auth-service -n flexobo --to-revision=2

# Check rollout history
kubectl rollout history deployment/auth-service -n flexobo
```
