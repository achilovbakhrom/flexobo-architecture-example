# AWS Secrets Manager for centralized secrets management
# Terraform AWS Provider 6.x compatible

locals {
  secret_prefix = "${var.project_name}/${var.environment}"
  tags = merge(var.tags, {
    Module = "secrets-manager"
  })
}

# Generate random passwords for initial secrets
resource "random_password" "jwt_secret" {
  length           = 64
  special          = true
  override_special = "!@#$%^&*"
}

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*"
}

# JWT Secret
resource "aws_secretsmanager_secret" "jwt" {
  name        = "${local.secret_prefix}/jwt-secret"
  description = "JWT signing secret for ${var.project_name} ${var.environment}"

  recovery_window_in_days = var.recovery_window_days

  tags = merge(local.tags, {
    Name = "${var.project_name}-${var.environment}-jwt-secret"
  })
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id = aws_secretsmanager_secret.jwt.id
  secret_string = jsonencode({
    secret = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret.result
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Database Credentials
resource "aws_secretsmanager_secret" "database" {
  name        = "${local.secret_prefix}/database-credentials"
  description = "Database credentials for ${var.project_name} ${var.environment}"

  recovery_window_in_days = var.recovery_window_days

  tags = merge(local.tags, {
    Name = "${var.project_name}-${var.environment}-database-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password != "" ? var.db_password : random_password.db_password.result
    host     = var.db_host
    port     = var.db_port
    dbname   = var.db_name
    url      = "postgresql://${var.db_username}:${var.db_password != "" ? var.db_password : random_password.db_password.result}@${var.db_host}:${var.db_port}/${var.db_name}"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Third-party API Keys
resource "aws_secretsmanager_secret" "api_keys" {
  name        = "${local.secret_prefix}/api-keys"
  description = "Third-party API keys for ${var.project_name} ${var.environment}"

  recovery_window_in_days = var.recovery_window_days

  tags = merge(local.tags, {
    Name = "${var.project_name}-${var.environment}-api-keys"
  })
}

resource "aws_secretsmanager_secret_version" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id
  secret_string = jsonencode({
    stripe_secret_key     = var.stripe_secret_key
    stripe_webhook_secret = var.stripe_webhook_secret
    click_secret_key      = var.click_secret_key
    telegram_bot_token    = var.telegram_bot_token
    sms_api_key           = var.sms_api_key
    email_api_key         = var.email_api_key
    google_client_id      = var.google_client_id
    google_client_secret  = var.google_client_secret
    firebase_config       = var.firebase_config
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# OpenSearch Credentials
resource "aws_secretsmanager_secret" "opensearch" {
  name        = "${local.secret_prefix}/opensearch-credentials"
  description = "OpenSearch credentials for ${var.project_name} ${var.environment}"

  recovery_window_in_days = var.recovery_window_days

  tags = merge(local.tags, {
    Name = "${var.project_name}-${var.environment}-opensearch-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "opensearch" {
  secret_id = aws_secretsmanager_secret.opensearch.id
  secret_string = jsonencode({
    username = var.opensearch_username
    password = var.opensearch_password
    endpoint = var.opensearch_endpoint
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# IAM Policy for External Secrets Operator
resource "aws_iam_policy" "external_secrets" {
  name        = "${var.project_name}-${var.environment}-external-secrets"
  description = "Policy for External Secrets Operator to access secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecrets"
        ]
        Resource = [
          aws_secretsmanager_secret.jwt.arn,
          aws_secretsmanager_secret.database.arn,
          aws_secretsmanager_secret.api_keys.arn,
          aws_secretsmanager_secret.opensearch.arn,
          "arn:aws:secretsmanager:*:*:secret:${local.secret_prefix}/*"
        ]
      }
    ]
  })

  tags = local.tags
}

# KMS Key for secrets encryption (optional)
resource "aws_kms_key" "secrets" {
  count = var.create_kms_key ? 1 : 0

  description             = "KMS key for ${var.project_name} ${var.environment} secrets"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Secrets Manager"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.tags, {
    Name = "${var.project_name}-${var.environment}-secrets-key"
  })
}

resource "aws_kms_alias" "secrets" {
  count = var.create_kms_key ? 1 : 0

  name          = "alias/${var.project_name}-${var.environment}-secrets"
  target_key_id = aws_kms_key.secrets[0].key_id
}

data "aws_caller_identity" "current" {}
