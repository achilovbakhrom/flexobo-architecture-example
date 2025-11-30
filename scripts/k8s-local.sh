#!/bin/bash
# Kubernetes Local Development Helper Script
# Usage: ./scripts/k8s-local.sh [command]

set -e

NAMESPACE="flexobo-dev"
OVERLAY="k8s/overlays/development"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
  echo -e "\n${BLUE}==== $1 ====${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}! $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

check_prerequisites() {
  print_header "Checking Prerequisites"

  # Check kubectl
  if ! command -v kubectl &> /dev/null; then
    print_error "kubectl not found. Install with: brew install kubectl"
    exit 1
  fi
  print_success "kubectl found"

  # Check Kubernetes cluster
  if ! kubectl cluster-info &> /dev/null; then
    print_error "Kubernetes cluster not running. Enable Kubernetes in Docker Desktop."
    exit 1
  fi
  print_success "Kubernetes cluster is running"

  # Check Docker
  if ! command -v docker &> /dev/null; then
    print_error "Docker not found"
    exit 1
  fi
  print_success "Docker found"
}

build_images() {
  print_header "Building Docker Images"

  echo "Building order-service..."
  docker build -f apps/order-service/Dockerfile -t flexobo/order-service:latest . || {
    print_error "Failed to build order-service"
    exit 1
  }
  print_success "order-service built"

  echo "Building api-gateway..."
  docker build -f apps/api-gateway/Dockerfile -t flexobo/api-gateway:latest . || {
    print_error "Failed to build api-gateway"
    exit 1
  }
  print_success "api-gateway built"

  echo "Building admin-panel..."
  docker build -f apps/admin-panel/Dockerfile -t flexobo/admin-panel:latest . || {
    print_error "Failed to build admin-panel"
    exit 1
  }
  print_success "admin-panel built"
}

deploy() {
  check_prerequisites

  print_header "Deploying to Kubernetes"

  # Build images first
  build_images

  # Apply Kubernetes manifests
  echo "Applying Kubernetes manifests..."
  kubectl apply -k $OVERLAY
  print_success "Manifests applied"

  # Wait for pods
  echo "Waiting for pods to be ready (timeout: 120s)..."
  kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=flexobo -n $NAMESPACE --timeout=120s 2>/dev/null || {
    print_warning "Some pods may not be ready yet. Check status with: $0 status"
  }

  print_header "Deployment Complete"
  echo "Run the following commands:"
  echo "  $0 status   - Check deployment status"
  echo "  $0 forward  - Start port forwarding"
  echo "  $0 logs     - View logs"
}

status() {
  print_header "Deployment Status"

  echo -e "${BLUE}Namespaces:${NC}"
  kubectl get namespace | grep -E "NAME|flexobo" || echo "No flexobo namespaces found"

  echo -e "\n${BLUE}Pods:${NC}"
  kubectl get pods -n $NAMESPACE 2>/dev/null || echo "Namespace $NAMESPACE not found"

  echo -e "\n${BLUE}Services:${NC}"
  kubectl get svc -n $NAMESPACE 2>/dev/null || echo "No services found"

  echo -e "\n${BLUE}Deployments:${NC}"
  kubectl get deployments -n $NAMESPACE 2>/dev/null || echo "No deployments found"
}

logs() {
  SERVICE=${1:-order-service-dev}
  print_header "Logs for $SERVICE"

  kubectl logs -n $NAMESPACE -l app=$SERVICE -f --tail=100 2>/dev/null || {
    print_error "No logs found for $SERVICE"
    echo "Available pods:"
    kubectl get pods -n $NAMESPACE 2>/dev/null
  }
}

forward() {
  print_header "Starting Port Forwarding"

  echo "Cleaning up existing port forwards and processes..."

  # Kill any existing kubectl port-forward processes
  pkill -f "kubectl port-forward" 2>/dev/null || true
  sleep 1

  # Force kill any processes using our ports
  for port in 3000 3001 3002; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
      echo "Killing process on port $port (PID: $pid)"
      kill -9 $pid 2>/dev/null || true
    fi
  done
  sleep 1

  echo ""
  echo "Services will be available at:"
  echo "  Admin Panel:   http://localhost:3000/api/docs"
  echo "  API Gateway:   http://localhost:3001/api/docs"
  echo "  Order Service: http://localhost:3002/api/docs"
  echo ""
  echo "Press Ctrl+C to stop all port forwarding"
  echo ""

  # Start port forwarding in background
  kubectl port-forward -n $NAMESPACE svc/admin-panel-dev 3000:3000 &
  PID1=$!
  kubectl port-forward -n $NAMESPACE svc/api-gateway-dev 3001:3001 &
  PID2=$!
  kubectl port-forward -n $NAMESPACE svc/order-service-dev 3002:3002 &
  PID3=$!

  # Give port forwards time to start
  sleep 3

  # Test endpoints
  echo "Testing endpoints..."
  for port in 3000 3001 3002; do
    if curl -s -o /dev/null -w "" --connect-timeout 2 http://localhost:$port/ 2>/dev/null; then
      print_success "Port $port is accessible"
    else
      print_warning "Port $port may not be ready yet"
    fi
  done
  echo ""
  echo "Port forwarding active. Press Ctrl+C to stop."

  # Wait for all background jobs
  wait $PID1 $PID2 $PID3
}

shell() {
  POD=${1}
  if [ -z "$POD" ]; then
    echo "Available pods:"
    kubectl get pods -n $NAMESPACE
    echo ""
    echo "Usage: $0 shell <pod-name>"
    exit 1
  fi

  print_header "Opening shell in $POD"
  kubectl exec -it -n $NAMESPACE $POD -- /bin/sh
}

events() {
  print_header "Recent Events"
  kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -20
}

describe() {
  RESOURCE=${1:-pod}
  NAME=${2}

  if [ -z "$NAME" ]; then
    echo "Available ${RESOURCE}s:"
    kubectl get $RESOURCE -n $NAMESPACE
    echo ""
    echo "Usage: $0 describe <resource-type> <name>"
    exit 1
  fi

  kubectl describe $RESOURCE -n $NAMESPACE $NAME
}

destroy() {
  print_header "Destroying Deployment"

  read -p "Are you sure you want to destroy the deployment? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    kubectl delete -k $OVERLAY 2>/dev/null || true
    print_success "Deployment destroyed"
  else
    print_warning "Cancelled"
  fi
}

validate() {
  print_header "Validating Kubernetes Manifests"

  echo "Running dry-run..."
  kubectl apply -k $OVERLAY --dry-run=client

  if [ $? -eq 0 ]; then
    print_success "Manifests are valid"
  else
    print_error "Validation failed"
    exit 1
  fi
}

restart() {
  SERVICE=${1:-all}
  print_header "Restarting $SERVICE"

  if [ "$SERVICE" == "all" ]; then
    kubectl rollout restart deployment -n $NAMESPACE
  else
    kubectl rollout restart deployment/$SERVICE -n $NAMESPACE
  fi

  print_success "Restart initiated"
  echo "Watch progress with: kubectl rollout status deployment -n $NAMESPACE"
}

help() {
  echo "Kubernetes Local Development Helper"
  echo ""
  echo "Usage: $0 <command> [options]"
  echo ""
  echo "Commands:"
  echo "  deploy    - Build images and deploy to Kubernetes"
  echo "  status    - Show deployment status"
  echo "  logs [svc] - View logs (default: order-service-dev)"
  echo "  forward   - Start port forwarding for all services"
  echo "  shell <pod> - Open shell in a pod"
  echo "  events    - Show recent Kubernetes events"
  echo "  describe <type> <name> - Describe a resource"
  echo "  restart [deployment] - Restart deployment(s)"
  echo "  validate  - Validate manifests without deploying"
  echo "  destroy   - Delete all resources"
  echo "  help      - Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 deploy              # Full deployment"
  echo "  $0 logs order-service-dev  # View order-service logs"
  echo "  $0 shell order-service-dev-xxx  # Shell into pod"
  echo "  $0 restart order-service-dev    # Restart specific deployment"
}

# Main
case "${1:-help}" in
  deploy)
    deploy
    ;;
  status)
    status
    ;;
  logs)
    logs $2
    ;;
  forward)
    forward
    ;;
  shell)
    shell $2
    ;;
  events)
    events
    ;;
  describe)
    describe $2 $3
    ;;
  destroy)
    destroy
    ;;
  validate)
    validate
    ;;
  restart)
    restart $2
    ;;
  build)
    build_images
    ;;
  help|--help|-h)
    help
    ;;
  *)
    print_error "Unknown command: $1"
    help
    exit 1
    ;;
esac
