#!/bin/bash

# Vault Setup Script
# Configures HashiCorp Vault with initial secrets

set -e

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-root}"

echo "=== Vault Setup ==="
echo "Vault Address: $VAULT_ADDR"
echo ""

# Wait for Vault to be ready
echo "Waiting for Vault to be ready..."
until curl -s "${VAULT_ADDR}/v1/sys/health" > /dev/null 2>&1; do
    echo "Vault is unavailable - sleeping"
    sleep 2
done
echo "Vault is ready!"

# Check if Vault is initialized
INIT_STATUS=$(curl -s "${VAULT_ADDR}/v1/sys/init" | jq -r '.initialized')
if [ "$INIT_STATUS" != "true" ]; then
    echo ""
    echo "Initializing Vault..."
    INIT_RESPONSE=$(curl -s -X PUT "${VAULT_ADDR}/v1/sys/init" \
        -H "Content-Type: application/json" \
        -d '{"secret_shares": 1, "secret_threshold": 1}')

    ROOT_TOKEN=$(echo "$INIT_RESPONSE" | jq -r '.root_token')
    UNSEAL_KEY=$(echo "$INIT_RESPONSE" | jq -r '.keys[0]')

    echo "Root Token: $ROOT_TOKEN"
    echo "Unseal Key: $UNSEAL_KEY"

    # Unseal Vault
    echo ""
    echo "Unsealing Vault..."
    curl -s -X PUT "${VAULT_ADDR}/v1/sys/unseal" \
        -H "Content-Type: application/json" \
        -d "{\"key\": \"$UNSEAL_KEY\"}"

    VAULT_TOKEN="$ROOT_TOKEN"
fi

export VAULT_TOKEN

# Enable KV secrets engine
echo ""
echo "Enabling KV secrets engine..."
curl -s -X POST "${VAULT_ADDR}/v1/sys/mounts/secret" \
    -H "X-Vault-Token: $VAULT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"type": "kv", "options": {"version": "2"}}' || true

# Configure secrets for each environment
for ENV in dev staging prod; do
    echo ""
    echo "Configuring secrets for $ENV environment..."

    # Database credentials
    curl -s -X POST "${VAULT_ADDR}/v1/secret/data/flexobo/$ENV/database" \
        -H "X-Vault-Token: $VAULT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "data": {
                "host": "flexobo-'$ENV'-postgres.xxxxx.us-east-1.rds.amazonaws.com",
                "port": "5432",
                "database": "flexobo",
                "username": "postgres",
                "password": "CHANGE_ME"
            }
        }'

    # JWT secret
    curl -s -X POST "${VAULT_ADDR}/v1/secret/data/flexobo/$ENV/jwt" \
        -H "X-Vault-Token: $VAULT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "data": {
                "secret": "CHANGE_ME_TO_SECURE_SECRET"
            }
        }'

    # Stripe secrets (billing-service)
    curl -s -X POST "${VAULT_ADDR}/v1/secret/data/flexobo/$ENV/stripe" \
        -H "X-Vault-Token: $VAULT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "data": {
                "secret_key": "sk_test_CHANGE_ME",
                "webhook_secret": "whsec_CHANGE_ME"
            }
        }'

    # Telegram bot (telegram-service)
    curl -s -X POST "${VAULT_ADDR}/v1/secret/data/flexobo/$ENV/telegram" \
        -H "X-Vault-Token: $VAULT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "data": {
                "bot_token": "CHANGE_ME"
            }
        }'

    # Notification service secrets
    curl -s -X POST "${VAULT_ADDR}/v1/secret/data/flexobo/$ENV/notification" \
        -H "X-Vault-Token: $VAULT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "data": {
                "sms_api_key": "CHANGE_ME",
                "email_api_key": "CHANGE_ME",
                "fcm_server_key": "CHANGE_ME"
            }
        }'

    # Google OAuth (users-service)
    curl -s -X POST "${VAULT_ADDR}/v1/secret/data/flexobo/$ENV/google" \
        -H "X-Vault-Token: $VAULT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "data": {
                "client_id": "CHANGE_ME",
                "client_secret": "CHANGE_ME"
            }
        }'
done

# Enable Kubernetes auth method
echo ""
echo "Enabling Kubernetes auth method..."
curl -s -X POST "${VAULT_ADDR}/v1/sys/auth/kubernetes" \
    -H "X-Vault-Token: $VAULT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"type": "kubernetes"}' || true

echo ""
echo "=== Vault setup complete ==="
echo ""
echo "Next steps:"
echo "1. Update the placeholder secrets with real values"
echo "2. Configure Kubernetes auth method with your cluster details"
echo "3. Create policies for each service to access their secrets"
