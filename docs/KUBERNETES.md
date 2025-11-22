# Kubernetes Deployment Guide

## Overview

This guide covers deploying the Flexobo microservices architecture to Kubernetes using Kustomize for configuration management.

## Architecture

```
Kubernetes Cluster
├── Namespace: flexobo
├── Infrastructure Layer
│   ├── PostgreSQL (StatefulSet with PVC)
│   ├── RabbitMQ (StatefulSet with PVC)
│   └── Redis (StatefulSet with PVC)
├── Application Layer
│   ├── Order Service (2+ replicas)
│   ├── API Gateway (3+ replicas)
│   └── Admin Panel (2+ replicas)
├── Ingress Layer
│   └── NGINX Ingress Controller
└── Autoscaling (HPA)
```

## Directory Structure

```
k8s/
├── base/                      # Base configurations
│   ├── namespace.yaml         # Namespace definition
│   ├── configmap.yaml         # Configuration data
│   ├── secrets.yaml           # Sensitive data
│   ├── postgres.yaml          # PostgreSQL deployment
│   ├── rabbitmq.yaml          # RabbitMQ deployment
│   ├── redis.yaml             # Redis deployment
│   ├── order-service.yaml     # Order Service deployment
│   ├── api-gateway.yaml       # API Gateway deployment
│   ├── admin-panel.yaml       # Admin Panel deployment
│   ├── ingress.yaml           # Ingress rules
│   ├── pdb.yaml               # Pod Disruption Budgets
│   ├── hpa.yaml               # Horizontal Pod Autoscalers
│   └── kustomization.yaml     # Kustomize config
└── overlays/                  # Environment-specific configs
    ├── development/           # Development environment
    │   └── kustomization.yaml
    └── production/            # Production environment
        └── kustomization.yaml
```

## Prerequisites

### 1. Install Required Tools

**kubectl:**
```bash
# macOS
brew install kubectl

# Verify
kubectl version --client
```

**kustomize:**
```bash
# macOS
brew install kustomize

# Verify
kustomize version
```

**Helm (optional):**
```bash
# macOS
brew install helm
```

### 2. Kubernetes Cluster

**Options:**
- **Local Development:** Minikube, Docker Desktop, Kind
- **Cloud:** GKE (Google), EKS (AWS), AKS (Azure)
- **On-Premise:** kubeadm, k3s, RKE

**Local cluster (Minikube):**
```bash
# Install Minikube
brew install minikube

# Start cluster
minikube start --cpus=4 --memory=8192

# Verify
kubectl cluster-info
```

**Local cluster (Docker Desktop):**
```bash
# Enable Kubernetes in Docker Desktop settings
# Verify
kubectl config use-context docker-desktop
kubectl get nodes
```

## Deployment Steps

### 1. Build and Push Images

**Build images:**
```bash
# From project root
./scripts/docker-build.sh --build-only

# Or build with docker-compose
docker-compose build
```

**Tag and push to registry:**
```bash
# Tag images
docker tag flexobo/order-service:latest your-registry.com/flexobo/order-service:v1.0.0
docker tag flexobo/api-gateway:latest your-registry.com/flexobo/api-gateway:v1.0.0
docker tag flexobo/admin-panel:latest your-registry.com/flexobo/admin-panel:v1.0.0

# Push to registry
docker push your-registry.com/flexobo/order-service:v1.0.0
docker push your-registry.com/flexobo/api-gateway:v1.0.0
docker push your-registry.com/flexobo/admin-panel:v1.0.0
```

**For local development (Minikube):**
```bash
# Use Minikube's Docker daemon
eval $(minikube docker-env)

# Build images
docker-compose build

# Images are now available in Minikube
```

### 2. Update Secrets

**IMPORTANT:** Change default passwords before production deployment!

```bash
# Generate secure passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32)
RABBITMQ_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)

# Create secret manually
kubectl create secret generic flexobo-secrets \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  --from-literal=RABBITMQ_USER=guest \
  --from-literal=RABBITMQ_PASSWORD=$RABBITMQ_PASSWORD \
  --from-literal=JWT_SECRET=$JWT_SECRET \
  --from-literal=DATABASE_URL=postgresql://postgres:$POSTGRES_PASSWORD@postgres-service:5432/flexobo?schema=order \
  --from-literal=ADMIN_DATABASE_URL=postgresql://postgres:$POSTGRES_PASSWORD@postgres-service:5432/flexobo?schema=admin \
  --from-literal=RABBITMQ_URL=amqp://guest:$RABBITMQ_PASSWORD@rabbitmq-service:5672 \
  --namespace=flexobo \
  --dry-run=client -o yaml | kubectl apply -f -
```

### 3. Deploy to Development

```bash
# Navigate to k8s directory
cd k8s

# Apply development configuration
kubectl apply -k overlays/development

# Verify deployment
kubectl get all -n flexobo-dev

# Check pod status
kubectl get pods -n flexobo-dev -w
```

### 4. Deploy to Production

```bash
# Apply production configuration
kubectl apply -k overlays/production

# Verify deployment
kubectl get all -n flexobo-prod

# Check pod status
kubectl get pods -n flexobo-prod -w
```

## Verification

### Check All Resources

```bash
# List all resources
kubectl get all -n flexobo

# Check pods
kubectl get pods -n flexobo

# Check services
kubectl get services -n flexobo

# Check ingress
kubectl get ingress -n flexobo

# Check persistent volumes
kubectl get pvc -n flexobo
```

### Check Pod Health

```bash
# Describe pod
kubectl describe pod <pod-name> -n flexobo

# View logs
kubectl logs <pod-name> -n flexobo

# Follow logs
kubectl logs -f <pod-name> -n flexobo

# View previous logs (if crashed)
kubectl logs <pod-name> -n flexobo --previous
```

### Test Services

```bash
# Port forward to test services locally
kubectl port-forward -n flexobo service/order-service 3000:3000
kubectl port-forward -n flexobo service/api-gateway 3001:80
kubectl port-forward -n flexobo service/admin-panel 3002:3002

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### Access Services via Ingress

**Local (with Minikube):**
```bash
# Get Minikube IP
minikube ip

# Add to /etc/hosts
echo "$(minikube ip) api.flexobo.com admin.flexobo.com" | sudo tee -a /etc/hosts

# Access services
curl http://api.flexobo.com/health
curl http://admin.flexobo.com/health
```

**Production:**
- Configure DNS to point to LoadBalancer IP
- Configure TLS certificates with cert-manager

## Configuration Management

### ConfigMaps

Store non-sensitive configuration:

```bash
# View ConfigMap
kubectl get configmap flexobo-config -n flexobo -o yaml

# Edit ConfigMap
kubectl edit configmap flexobo-config -n flexobo

# Update from file
kubectl create configmap flexobo-config \
  --from-file=config.yaml \
  --namespace=flexobo \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Secrets

Store sensitive data:

```bash
# View Secret (encoded)
kubectl get secret flexobo-secrets -n flexobo -o yaml

# Decode secret
kubectl get secret flexobo-secrets -n flexobo -o jsonpath='{.data.JWT_SECRET}' | base64 -d

# Update secret
kubectl create secret generic flexobo-secrets \
  --from-literal=NEW_KEY=new_value \
  --namespace=flexobo \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Environment-Specific Configuration

**Development:**
- Single replica per service
- Debug logging
- Lower resource limits

**Production:**
- Multiple replicas
- Info logging
- Higher resource limits
- Auto-scaling enabled

## Scaling

### Manual Scaling

```bash
# Scale deployment
kubectl scale deployment order-service -n flexobo --replicas=5

# View scaling
kubectl get deployment order-service -n flexobo
```

### Horizontal Pod Autoscaling

**Already configured in `hpa.yaml`:**

```yaml
# Order Service: 2-10 replicas (70% CPU, 80% memory)
# API Gateway: 3-20 replicas (70% CPU, 80% memory)
# Admin Panel: 2-5 replicas (70% CPU, 80% memory)
```

**View HPA status:**
```bash
# Get HPA status
kubectl get hpa -n flexobo

# Describe HPA
kubectl describe hpa order-service-hpa -n flexobo

# Watch HPA
kubectl get hpa -n flexobo -w
```

**Test autoscaling:**
```bash
# Generate load
kubectl run -i --tty load-generator --rm --image=busybox --restart=Never -n flexobo -- /bin/sh

# Inside pod
while sleep 0.01; do wget -q -O- http://order-service:3000/health; done
```

## Updates and Rollouts

### Rolling Updates

```bash
# Update image
kubectl set image deployment/order-service \
  order-service=flexobo/order-service:v1.1.0 \
  -n flexobo

# Check rollout status
kubectl rollout status deployment/order-service -n flexobo

# View rollout history
kubectl rollout history deployment/order-service -n flexobo
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/order-service -n flexobo

# Rollback to specific revision
kubectl rollout undo deployment/order-service -n flexobo --to-revision=2

# Check rollback status
kubectl rollout status deployment/order-service -n flexobo
```

### Zero-Downtime Deployment

**Configured via:**
- **PodDisruptionBudgets:** Ensure minimum replicas during updates
- **Rolling Update Strategy:** Gradual replacement of pods
- **Readiness Probes:** Traffic only to healthy pods
- **Liveness Probes:** Restart unhealthy pods

## Monitoring

### Pod Status

```bash
# Get pod metrics (requires metrics-server)
kubectl top pods -n flexobo

# Get node metrics
kubectl top nodes

# View events
kubectl get events -n flexobo --sort-by='.lastTimestamp'
```

### Logs

```bash
# View logs from all pods of a deployment
kubectl logs -n flexobo -l app=order-service

# View logs from specific container
kubectl logs -n flexobo <pod-name> -c order-service

# Stream logs
kubectl logs -n flexobo -l app=order-service -f

# Export logs
kubectl logs -n flexobo <pod-name> > pod-logs.txt
```

### Dashboard

```bash
# Install Kubernetes Dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Create admin user
kubectl create serviceaccount dashboard-admin -n kubernetes-dashboard
kubectl create clusterrolebinding dashboard-admin \
  --clusterrole=cluster-admin \
  --serviceaccount=kubernetes-dashboard:dashboard-admin

# Get access token
kubectl -n kubernetes-dashboard create token dashboard-admin

# Start proxy
kubectl proxy

# Access dashboard
open http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

## Troubleshooting

### Pods Not Starting

**Check pod status:**
```bash
kubectl get pods -n flexobo
kubectl describe pod <pod-name> -n flexobo
```

**Common issues:**
- **ImagePullBackOff:** Image not found or registry authentication failed
- **CrashLoopBackOff:** Container keeps crashing
- **Pending:** Insufficient resources or PVC not bound

**Solutions:**
```bash
# Check logs
kubectl logs <pod-name> -n flexobo

# Check events
kubectl get events -n flexobo --field-selector involvedObject.name=<pod-name>

# Exec into pod
kubectl exec -it <pod-name> -n flexobo -- sh
```

### Service Not Accessible

**Check service:**
```bash
kubectl get service -n flexobo
kubectl describe service order-service -n flexobo
```

**Test connectivity:**
```bash
# Port forward
kubectl port-forward -n flexobo service/order-service 3000:3000

# Test from another pod
kubectl run test-pod --rm -i --tty --image=curlimages/curl -n flexobo -- sh
curl http://order-service:3000/health
```

### Database Connection Issues

**Check PostgreSQL:**
```bash
# Get PostgreSQL pod
kubectl get pods -n flexobo -l app=postgres

# Check logs
kubectl logs -n flexobo <postgres-pod>

# Connect to database
kubectl exec -it <postgres-pod> -n flexobo -- psql -U postgres -d flexobo

# Test connectivity from app pod
kubectl exec -it <order-service-pod> -n flexobo -- sh
wget -qO- postgres-service:5432
```

### High Resource Usage

**Check metrics:**
```bash
kubectl top pods -n flexobo
kubectl top nodes
```

**Adjust resources:**
```bash
# Edit deployment
kubectl edit deployment order-service -n flexobo

# Update resource limits
spec:
  template:
    spec:
      containers:
      - name: order-service
        resources:
          requests:
            memory: "1Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
```

## Backup and Recovery

### Database Backup

```bash
# Backup PostgreSQL
kubectl exec -n flexobo <postgres-pod> -- \
  pg_dump -U postgres -d flexobo > backup.sql

# Restore PostgreSQL
kubectl exec -i -n flexobo <postgres-pod> -- \
  psql -U postgres -d flexobo < backup.sql
```

### ConfigMap/Secret Backup

```bash
# Backup all resources
kubectl get all,configmap,secret -n flexobo -o yaml > flexobo-backup.yaml

# Restore
kubectl apply -f flexobo-backup.yaml
```

## Security Best Practices

### 1. RBAC (Role-Based Access Control)

```bash
# Create service account
kubectl create serviceaccount flexobo-app -n flexobo

# Create role
kubectl create role pod-reader \
  --verb=get,list,watch \
  --resource=pods \
  -n flexobo

# Bind role
kubectl create rolebinding pod-reader-binding \
  --role=pod-reader \
  --serviceaccount=flexobo:flexobo-app \
  -n flexobo
```

### 2. Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: order-service-policy
  namespace: flexobo
spec:
  podSelector:
    matchLabels:
      app: order-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 3000
```

### 3. Pod Security Standards

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: order-service
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    fsGroup: 1001
  containers:
  - name: order-service
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
```

## Clean Up

### Delete Specific Resources

```bash
# Delete deployment
kubectl delete deployment order-service -n flexobo

# Delete service
kubectl delete service order-service -n flexobo

# Delete all in namespace
kubectl delete all --all -n flexobo
```

### Delete Entire Environment

```bash
# Development
kubectl delete -k overlays/development

# Production
kubectl delete -k overlays/production

# Delete namespace (deletes everything)
kubectl delete namespace flexobo
```

## Summary

Kubernetes deployment provides:
- ✅ High availability (multiple replicas)
- ✅ Auto-scaling (HPA based on CPU/memory)
- ✅ Self-healing (automatic restart)
- ✅ Load balancing (service discovery)
- ✅ Rolling updates (zero downtime)
- ✅ Resource management (requests/limits)
- ✅ Configuration management (ConfigMaps/Secrets)
- ✅ Storage persistence (PVCs)

Next: Final documentation and architecture overview.
