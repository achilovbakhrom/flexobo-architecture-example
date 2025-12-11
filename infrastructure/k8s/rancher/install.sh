#!/bin/bash
# Rancher Installation Script
# Version: 2.13.0 (December 2025)
# Prerequisites: kubectl, helm 3.18+, cert-manager installed

set -e

echo "=== Rancher Installation Script ==="
echo "Version: 2.13.0"
echo ""

# Check prerequisites
command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required but not installed. Aborting." >&2; exit 1; }
command -v helm >/dev/null 2>&1 || { echo "helm is required but not installed. Aborting." >&2; exit 1; }

# Check helm version (requires 3.18+)
HELM_VERSION=$(helm version --short | sed 's/v//' | cut -d. -f1-2)
echo "Helm version: $HELM_VERSION"

# Check if cert-manager is installed
if ! kubectl get namespace cert-manager >/dev/null 2>&1; then
    echo "Error: cert-manager namespace not found. Please install cert-manager first."
    echo "Run: helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --set installCRDs=true"
    exit 1
fi

echo "cert-manager is installed."

# Add Rancher Helm repository
echo ""
echo "Adding Rancher Helm repository..."
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

# Create cattle-system namespace
echo ""
echo "Creating cattle-system namespace..."
kubectl create namespace cattle-system --dry-run=client -o yaml | kubectl apply -f -

# Generate bootstrap password
BOOTSTRAP_PASSWORD=$(openssl rand -base64 32)
echo ""
echo "Generated bootstrap password (save this!):"
echo "$BOOTSTRAP_PASSWORD"
echo ""

# Install Rancher
echo "Installing Rancher..."
helm install rancher rancher-stable/rancher \
    --namespace cattle-system \
    --set hostname=rancher.flexobo.com \
    --set replicas=1 \
    --set ingress.tls.source=letsEncrypt \
    --set letsEncrypt.email=admin@flexobo.com \
    --set letsEncrypt.environment=production \
    --set letsEncrypt.ingress.class=kong \
    --set bootstrapPassword="$BOOTSTRAP_PASSWORD" \
    --set auditLog.level=1 \
    --wait \
    --timeout 10m

# Check installation status
echo ""
echo "Checking Rancher deployment status..."
kubectl -n cattle-system rollout status deploy/rancher

echo ""
echo "=== Rancher Installation Complete ==="
echo ""
echo "Access Rancher at: https://rancher.flexobo.com"
echo "Bootstrap password: $BOOTSTRAP_PASSWORD"
echo ""
echo "IMPORTANT: Change the admin password after first login!"
echo ""
echo "To check logs: kubectl -n cattle-system logs -f deploy/rancher"
echo "To get pods:   kubectl -n cattle-system get pods"
