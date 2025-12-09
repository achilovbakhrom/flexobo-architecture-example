#!/bin/bash

# Database Initialization Script
# Creates schemas for each microservice in the PostgreSQL database

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-flexobo}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Schema names for each service
SCHEMAS=(
    "users"
    "chat"
    "files"
    "main"
    "billing"
    "notifications"
    "telegram"
)

echo "=== Flexobo Database Initialization ==="
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done
echo "PostgreSQL is ready!"

# Create database if it doesn't exist
echo ""
echo "Creating database '$DB_NAME' if it doesn't exist..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME"

# Create schemas
echo ""
echo "Creating schemas..."
for schema in "${SCHEMAS[@]}"; do
    echo "  - Creating schema: $schema"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE SCHEMA IF NOT EXISTS $schema"
done

# Create required extensions
echo ""
echo "Creating PostgreSQL extensions..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- For full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- For JSON operations
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOF

echo ""
echo "=== Database initialization complete ==="
echo ""
echo "Connection URLs for each service:"
for schema in "${SCHEMAS[@]}"; do
    echo "  $schema: postgresql://$DB_USER:***@$DB_HOST:$DB_PORT/$DB_NAME?schema=$schema"
done
