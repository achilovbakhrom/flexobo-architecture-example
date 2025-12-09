#!/bin/bash

# Database Migration Script
# Runs Prisma migrations for all services

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-flexobo}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Services with their schema names
declare -A SERVICES=(
    ["users-service"]="users"
    ["chat-service"]="chat"
    ["file-service"]="files"
    ["main-service"]="main"
    ["billing-service"]="billing"
    ["notification-service"]="notifications"
    ["telegram-service"]="telegram"
)

echo "=== Running Prisma Migrations ==="
echo ""

# Get the root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

for service in "${!SERVICES[@]}"; do
    schema="${SERVICES[$service]}"
    prisma_dir="$ROOT_DIR/apps/$service/prisma"

    if [ -f "$prisma_dir/schema.prisma" ]; then
        echo "Running migrations for $service (schema: $schema)..."

        # Set the DATABASE_URL for this service
        export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=$schema"

        # Run prisma migrate deploy
        cd "$ROOT_DIR"
        npx prisma migrate deploy --schema="$prisma_dir/schema.prisma" || {
            echo "  Warning: Migration for $service failed or has no migrations"
        }

        echo "  Done"
    else
        echo "Skipping $service - no Prisma schema found"
    fi
done

echo ""
echo "=== Migrations complete ==="
