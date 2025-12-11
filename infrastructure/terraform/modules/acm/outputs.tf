output "certificate_arn" {
  description = "ARN of the main certificate"
  value       = aws_acm_certificate.main.arn
}

output "certificate_domain_name" {
  description = "Domain name of the certificate"
  value       = aws_acm_certificate.main.domain_name
}

output "certificate_status" {
  description = "Status of the certificate"
  value       = aws_acm_certificate.main.status
}

output "validated_certificate_arn" {
  description = "ARN of the validated certificate (use this for ALB)"
  value       = var.create_validation_records ? aws_acm_certificate_validation.main[0].certificate_arn : aws_acm_certificate.main.arn
}

output "environment_certificate_arn" {
  description = "ARN of the environment-specific certificate"
  value       = var.environment != "prod" && var.create_environment_cert ? aws_acm_certificate.environment[0].arn : null
}

output "validated_environment_certificate_arn" {
  description = "ARN of the validated environment certificate"
  value       = var.environment != "prod" && var.create_environment_cert && var.create_validation_records ? aws_acm_certificate_validation.environment[0].certificate_arn : null
}

output "domain_validation_options" {
  description = "Domain validation options for manual validation"
  value       = aws_acm_certificate.main.domain_validation_options
}
