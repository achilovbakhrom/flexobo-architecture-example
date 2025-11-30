# Kubernetes Local Testing Guide

This guide will help you test the Flexobo microservices on Kubernetes locally using Docker Desktop.

## Prerequisites

- Docker Desktop installed
- macOS (this guide is for Mac, but similar steps apply to Windows/Linux)

---

## Step 1: Enable Kubernetes in Docker Desktop

1. Open **Docker Desktop**
2. Click the **gear icon** (Settings) in the top right
3. Go to **Kubernetes** in the left sidebar
4. Check **Enable Kubernetes**
5. Click **Apply & Restart**
6. Wait for Kubernetes to start (you'll see a green indicator in the bottom left)

This typically takes 2-5 minutes on first setup.

---

## Step 2: Verify Kubernetes is Running

Open Terminal and run:

```bash
# Check if kubectl is working
kubectl version

# Check cluster info
kubectl cluster-info

# Check nodes (should show 1 node: docker-desktop)
kubectl get nodes
```

Expected output:
```
NAME             STATUS   ROLES           AGE   VERSION
docker-desktop   Ready    control-plane   1m    v1.28.x
```

---

## Step 3: Install kubectl (if not installed)

If `kubectl` command is not found:

```bash
brew install kubectl
```

---

## Step 4: Build Docker Images

Before deploying to K8s, you need to build the Docker images locally:

```bash
# Build all services
yarn docker:build:all

# Or build individually
yarn docker:build:order
yarn docker:build:gateway
yarn docker:build:admin
```

Verify images are built:
```bash
docker images | grep flexobo
```

Expected output:
```
flexobo/order-service    latest    abc123    1 minute ago    500MB
flexobo/api-gateway      latest    def456    1 minute ago    450MB
flexobo/admin-panel      latest    ghi789    1 minute ago    480MB
```

---

## Step 5: Deploy to Kubernetes

### Option A: Deploy Development Environment (Recommended for Testing)

```bash
# Apply the development overlay (1 replica per service, debug logging)
kubectl apply -k k8s/overlays/development
```

### Option B: Deploy Base Configuration

```bash
# Apply base configuration (2 replicas per service)
kubectl apply -k k8s/base
```

---

## Step 6: Monitor Deployment Progress

### Watch pods starting up
```bash
# Watch all pods in the flexobo-dev namespace (development) or flexobo (base)
kubectl get pods -n flexobo-dev -w

# Or for base deployment
kubectl get pods -n flexobo -w
```

### Check deployment status
```bash
kubectl get deployments -n flexobo-dev
```

### View all resources
```bash
kubectl get all -n flexobo-dev
```

---

## Step 7: Troubleshooting Deployment Issues

### Check pod logs
```bash
# Get pod name first
kubectl get pods -n flexobo-dev

# View logs (replace <pod-name> with actual name)
kubectl logs -n flexobo-dev <pod-name>

# Follow logs in real-time
kubectl logs -n flexobo-dev <pod-name> -f

# View logs for all order-service pods
kubectl logs -n flexobo-dev -l app=order-service-dev
```

### Check why a pod is failing
```bash
# Describe pod to see events and errors
kubectl describe pod -n flexobo-dev <pod-name>

# Check events in namespace
kubectl get events -n flexobo-dev --sort-by='.lastTimestamp'
```

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `ImagePullBackOff` | Docker image not found | Run `yarn docker:build:all` |
| `CrashLoopBackOff` | App crashing on start | Check logs with `kubectl logs` |
| `Pending` | Not enough resources | Increase Docker Desktop memory |
| `CreateContainerConfigError` | Missing ConfigMap/Secret | Check if secrets are applied |

---

## Step 8: Access Services

Since services are ClusterIP (internal only), use port-forwarding to access them:

### Forward Order Service (port 3000)
```bash
kubectl port-forward -n flexobo-dev svc/order-service-dev 3000:3000
```
Then open: http://localhost:3000/api

### Forward API Gateway (port 3001)
```bash
kubectl port-forward -n flexobo-dev svc/api-gateway-dev 3001:3000
```
Then open: http://localhost:3001/api/docs

### Forward Admin Panel (port 3002)
```bash
kubectl port-forward -n flexobo-dev svc/admin-panel-dev 3002:3000
```

### Forward Multiple Services (run in separate terminals)
```bash
# Terminal 1
kubectl port-forward -n flexobo-dev svc/order-service-dev 3000:3000

# Terminal 2
kubectl port-forward -n flexobo-dev svc/api-gateway-dev 3001:3000

# Terminal 3
kubectl port-forward -n flexobo-dev svc/admin-panel-dev 3002:3000
```

---

## Step 9: Useful Commands Cheat Sheet

### Namespace Operations
```bash
# List all namespaces
kubectl get namespaces

# Switch default namespace (optional)
kubectl config set-context --current --namespace=flexobo-dev
```

### Pod Operations
```bash
# List pods
kubectl get pods -n flexobo-dev

# Get pod details
kubectl describe pod -n flexobo-dev <pod-name>

# Execute command in pod (like SSH)
kubectl exec -it -n flexobo-dev <pod-name> -- /bin/sh

# Delete a pod (it will restart automatically)
kubectl delete pod -n flexobo-dev <pod-name>
```

### Service Operations
```bash
# List services
kubectl get svc -n flexobo-dev

# Get service endpoints
kubectl get endpoints -n flexobo-dev
```

### Logs
```bash
# View logs
kubectl logs -n flexobo-dev <pod-name>

# Follow logs
kubectl logs -n flexobo-dev <pod-name> -f

# View previous container logs (if crashed)
kubectl logs -n flexobo-dev <pod-name> --previous
```

### Scaling
```bash
# Scale deployment
kubectl scale deployment -n flexobo-dev order-service-dev --replicas=3

# Check HPA (Horizontal Pod Autoscaler)
kubectl get hpa -n flexobo-dev
```

---

## Step 10: Clean Up

### Delete development deployment
```bash
kubectl delete -k k8s/overlays/development
```

### Delete base deployment
```bash
kubectl delete -k k8s/base
```

### Delete namespace (removes everything in it)
```bash
kubectl delete namespace flexobo-dev
```

### Reset everything (nuclear option)
```bash
# Delete all namespaces created by this project
kubectl delete namespace flexobo-dev flexobo

# Or reset Kubernetes completely (Docker Desktop)
# Docker Desktop Settings → Kubernetes → Reset Kubernetes Cluster
```

---

## Quick Start Script

Create a script to automate deployment:

```bash
#!/bin/bash
# scripts/k8s-local.sh

set -e

ACTION=${1:-deploy}
NAMESPACE="flexobo-dev"

case $ACTION in
  deploy)
    echo "Building Docker images..."
    yarn docker:build:all

    echo "Deploying to Kubernetes..."
    kubectl apply -k k8s/overlays/development

    echo "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=flexobo -n $NAMESPACE --timeout=120s

    echo "Deployment complete! Run: kubectl get pods -n $NAMESPACE"
    ;;

  status)
    kubectl get all -n $NAMESPACE
    ;;

  logs)
    SERVICE=${2:-order-service-dev}
    kubectl logs -n $NAMESPACE -l app=$SERVICE -f
    ;;

  forward)
    echo "Starting port forwarding..."
    echo "Order Service: http://localhost:3000"
    echo "API Gateway: http://localhost:3001"
    echo "Admin Panel: http://localhost:3002"
    kubectl port-forward -n $NAMESPACE svc/order-service-dev 3000:3000 &
    kubectl port-forward -n $NAMESPACE svc/api-gateway-dev 3001:3000 &
    kubectl port-forward -n $NAMESPACE svc/admin-panel-dev 3002:3000 &
    wait
    ;;

  destroy)
    echo "Destroying deployment..."
    kubectl delete -k k8s/overlays/development
    ;;

  *)
    echo "Usage: $0 {deploy|status|logs|forward|destroy}"
    exit 1
    ;;
esac
```

Usage:
```bash
chmod +x scripts/k8s-local.sh

./scripts/k8s-local.sh deploy    # Build and deploy
./scripts/k8s-local.sh status    # Check status
./scripts/k8s-local.sh logs      # View logs
./scripts/k8s-local.sh forward   # Port forward all services
./scripts/k8s-local.sh destroy   # Clean up
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                        │
│                    (Docker Desktop)                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Namespace: flexobo-dev                  │   │
│  │                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │   │
│  │  │Order Service │  │ API Gateway  │  │Admin Panel│  │   │
│  │  │   (Pod)      │  │   (Pod)      │  │  (Pod)    │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │   │
│  │         │                 │                │        │   │
│  │  ┌──────┴───────┐  ┌──────┴───────┐  ┌─────┴─────┐  │   │
│  │  │   Service    │  │   Service    │  │  Service  │  │   │
│  │  │  (ClusterIP) │  │  (ClusterIP) │  │(ClusterIP)│  │   │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │   │
│  │                                                      │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐        │   │
│  │  │ PostgreSQL│  │  RabbitMQ │  │   Redis   │        │   │
│  │  │   (Pod)   │  │   (Pod)   │  │   (Pod)   │        │   │
│  │  └───────────┘  └───────────┘  └───────────┘        │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Port Forward: localhost:3000 → order-service:3000          │
│  Port Forward: localhost:3001 → api-gateway:3000            │
│  Port Forward: localhost:3002 → admin-panel:3000            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

Once comfortable with local K8s:

1. **Add Ingress Controller** - For proper routing without port-forward
   ```bash
   # Enable ingress addon
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
   ```

2. **Try Minikube** - Alternative to Docker Desktop with more features
   ```bash
   brew install minikube
   minikube start
   minikube dashboard  # Opens web UI
   ```

3. **Explore k9s** - Terminal UI for Kubernetes
   ```bash
   brew install k9s
   k9s -n flexobo-dev
   ```

4. **Set up Lens** - Desktop app for Kubernetes management
   - Download from https://k8slens.dev/
