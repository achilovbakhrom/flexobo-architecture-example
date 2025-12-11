# Production Environment Outputs

# VPC Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

# EKS Outputs
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_oidc_issuer_url" {
  description = "OIDC issuer URL"
  value       = module.eks.cluster_oidc_issuer_url
}

output "eks_oidc_provider_arn" {
  description = "OIDC provider ARN for IRSA"
  value       = module.eks.oidc_provider_arn
}

output "eks_cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.db_instance_endpoint
}

output "rds_address" {
  description = "RDS instance address (hostname)"
  value       = module.rds.db_instance_address
}

output "rds_database_url" {
  description = "Database connection URL"
  value       = module.rds.database_url
  sensitive   = true
}

# Route53 Outputs (using data source from dev)
output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = data.aws_route53_zone.main.zone_id
}

output "route53_domain_name" {
  description = "Domain name"
  value       = data.aws_route53_zone.main.name
}

# ACM Outputs
output "acm_certificate_arn" {
  description = "ACM certificate ARN for ALB"
  value       = module.acm.validated_certificate_arn
}

# S3 Outputs
output "s3_bucket_names" {
  description = "S3 bucket names"
  value       = module.s3.bucket_names
}

output "s3_files_bucket_name" {
  description = "Files bucket name for file-service"
  value       = module.s3.files_bucket_name
}

# OpenSearch Outputs
output "opensearch_endpoint" {
  description = "OpenSearch endpoint for Jaeger"
  value       = module.opensearch.endpoint
}

output "opensearch_dashboard_endpoint" {
  description = "OpenSearch Dashboards endpoint"
  value       = module.opensearch.dashboard_endpoint
}

output "opensearch_connection_url" {
  description = "Full OpenSearch connection URL"
  value       = module.opensearch.connection_url
}

# Secrets Manager Outputs
output "secrets_prefix" {
  description = "Prefix for all secrets in Secrets Manager"
  value       = module.secrets_manager.secret_prefix
}

output "external_secrets_policy_arn" {
  description = "IAM policy ARN for External Secrets Operator"
  value       = module.secrets_manager.external_secrets_policy_arn
}

output "all_secret_arns" {
  description = "Map of all secret ARNs"
  value       = module.secrets_manager.all_secret_arns
}

output "kms_key_arn" {
  description = "KMS key ARN for secrets encryption"
  value       = module.secrets_manager.kms_key_arn
}

# ECR Outputs
output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value       = module.ecr.repository_urls
}

# Utility Commands
output "kubeconfig_command" {
  description = "Command to update kubeconfig"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}
