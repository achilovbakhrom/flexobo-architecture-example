output "domain_id" {
  description = "The unique identifier for the OpenSearch domain"
  value       = aws_opensearch_domain.jaeger.domain_id
}

output "domain_name" {
  description = "The name of the OpenSearch domain"
  value       = aws_opensearch_domain.jaeger.domain_name
}

output "domain_arn" {
  description = "The ARN of the OpenSearch domain"
  value       = aws_opensearch_domain.jaeger.arn
}

output "endpoint" {
  description = "Domain-specific endpoint for the OpenSearch domain"
  value       = aws_opensearch_domain.jaeger.endpoint
}

output "dashboard_endpoint" {
  description = "Domain-specific endpoint for OpenSearch Dashboards"
  value       = aws_opensearch_domain.jaeger.dashboard_endpoint
}

output "vpc_endpoint" {
  description = "VPC endpoint for the OpenSearch domain (if VPC enabled)"
  value       = var.vpc_enabled ? aws_opensearch_domain.jaeger.endpoint : null
}

output "security_group_id" {
  description = "Security group ID for OpenSearch (if VPC enabled)"
  value       = var.vpc_enabled ? aws_security_group.opensearch[0].id : null
}

output "jaeger_policy_arn" {
  description = "ARN of the IAM policy for Jaeger access"
  value       = aws_iam_policy.jaeger_opensearch.arn
}

output "connection_url" {
  description = "Full connection URL for Jaeger"
  value       = "https://${aws_opensearch_domain.jaeger.endpoint}"
}
