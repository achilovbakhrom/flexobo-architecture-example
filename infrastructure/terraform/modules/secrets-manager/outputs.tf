output "jwt_secret_arn" {
  description = "ARN of the JWT secret"
  value       = aws_secretsmanager_secret.jwt.arn
}

output "jwt_secret_name" {
  description = "Name of the JWT secret"
  value       = aws_secretsmanager_secret.jwt.name
}

output "database_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.database.arn
}

output "database_secret_name" {
  description = "Name of the database credentials secret"
  value       = aws_secretsmanager_secret.database.name
}

output "api_keys_secret_arn" {
  description = "ARN of the API keys secret"
  value       = aws_secretsmanager_secret.api_keys.arn
}

output "api_keys_secret_name" {
  description = "Name of the API keys secret"
  value       = aws_secretsmanager_secret.api_keys.name
}

output "opensearch_secret_arn" {
  description = "ARN of the OpenSearch credentials secret"
  value       = aws_secretsmanager_secret.opensearch.arn
}

output "opensearch_secret_name" {
  description = "Name of the OpenSearch credentials secret"
  value       = aws_secretsmanager_secret.opensearch.name
}

output "external_secrets_policy_arn" {
  description = "ARN of the IAM policy for External Secrets Operator"
  value       = aws_iam_policy.external_secrets.arn
}

output "kms_key_arn" {
  description = "ARN of the KMS key for secrets encryption"
  value       = var.create_kms_key ? aws_kms_key.secrets[0].arn : null
}

output "kms_key_id" {
  description = "ID of the KMS key for secrets encryption"
  value       = var.create_kms_key ? aws_kms_key.secrets[0].key_id : null
}

output "secret_prefix" {
  description = "Prefix for all secrets in this environment"
  value       = local.secret_prefix
}

output "all_secret_arns" {
  description = "Map of all secret ARNs"
  value = {
    jwt        = aws_secretsmanager_secret.jwt.arn
    database   = aws_secretsmanager_secret.database.arn
    api_keys   = aws_secretsmanager_secret.api_keys.arn
    opensearch = aws_secretsmanager_secret.opensearch.arn
  }
}
