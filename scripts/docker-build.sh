#!/bin/bash

# Flexobo Microservices - Docker Build and Deploy Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="${DOCKER_REGISTRY:-docker.io}"
NAMESPACE="${DOCKER_NAMESPACE:-flexobo}"
VERSION="${VERSION:-latest}"

# Services
SERVICES=("order-service" "api-gateway" "admin-panel")

echo -e "${GREEN}=== Flexobo Microservices Docker Build ===${NC}"
echo "Registry: $REGISTRY"
echo "Namespace: $NAMESPACE"
echo "Version: $VERSION"
echo ""

# Function to build service
build_service() {
    local service=$1
    echo -e "${YELLOW}Building ${service}...${NC}"
    
    docker build \
        -f "apps/${service}/Dockerfile" \
        -t "${NAMESPACE}/${service}:${VERSION}" \
        -t "${NAMESPACE}/${service}:latest" \
        .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${service} built successfully${NC}"
    else
        echo -e "${RED}✗ Failed to build ${service}${NC}"
        exit 1
    fi
}

# Function to tag for registry
tag_service() {
    local service=$1
    echo -e "${YELLOW}Tagging ${service} for registry...${NC}"
    
    docker tag \
        "${NAMESPACE}/${service}:${VERSION}" \
        "${REGISTRY}/${NAMESPACE}/${service}:${VERSION}"
    
    docker tag \
        "${NAMESPACE}/${service}:latest" \
        "${REGISTRY}/${NAMESPACE}/${service}:latest"
}

# Function to push to registry
push_service() {
    local service=$1
    echo -e "${YELLOW}Pushing ${service} to registry...${NC}"
    
    docker push "${REGISTRY}/${NAMESPACE}/${service}:${VERSION}"
    docker push "${REGISTRY}/${NAMESPACE}/${service}:latest"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${service} pushed successfully${NC}"
    else
        echo -e "${RED}✗ Failed to push ${service}${NC}"
        exit 1
    fi
}

# Parse arguments
BUILD=true
TAG=false
PUSH=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build-only)
            BUILD=true
            TAG=false
            PUSH=false
            shift
            ;;
        --tag)
            TAG=true
            shift
            ;;
        --push)
            TAG=true
            PUSH=true
            shift
            ;;
        --service)
            SERVICES=("$2")
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--build-only] [--tag] [--push] [--service <service-name>]"
            exit 1
            ;;
    esac
done

# Build services
if [ "$BUILD" = true ]; then
    echo -e "${GREEN}=== Building Services ===${NC}"
    for service in "${SERVICES[@]}"; do
        build_service "$service"
    done
    echo ""
fi

# Tag for registry
if [ "$TAG" = true ]; then
    echo -e "${GREEN}=== Tagging Services ===${NC}"
    for service in "${SERVICES[@]}"; do
        tag_service "$service"
    done
    echo ""
fi

# Push to registry
if [ "$PUSH" = true ]; then
    echo -e "${GREEN}=== Pushing Services ===${NC}"
    
    # Check if logged in to registry
    if ! docker info 2>/dev/null | grep -q "Username"; then
        echo -e "${YELLOW}Not logged in to registry. Attempting login...${NC}"
        docker login "$REGISTRY"
    fi
    
    for service in "${SERVICES[@]}"; do
        push_service "$service"
    done
    echo ""
fi

echo -e "${GREEN}=== Build Complete ===${NC}"
echo ""
echo "Built images:"
for service in "${SERVICES[@]}"; do
    echo "  - ${NAMESPACE}/${service}:${VERSION}"
done

if [ "$PUSH" = true ]; then
    echo ""
    echo "Images available at:"
    for service in "${SERVICES[@]}"; do
        echo "  - ${REGISTRY}/${NAMESPACE}/${service}:${VERSION}"
    done
fi
