output "zone_id" {
  description = "The hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "zone_arn" {
  description = "The hosted zone ARN"
  value       = aws_route53_zone.main.arn
}

output "name_servers" {
  description = "Name servers for the hosted zone"
  value       = aws_route53_zone.main.name_servers
}

output "domain_name" {
  description = "The domain name"
  value       = aws_route53_zone.main.name
}

output "api_fqdn" {
  description = "FQDN for the API endpoint"
  value       = var.create_api_record && var.alb_dns_name != "" ? aws_route53_record.api[0].fqdn : null
}

output "grafana_fqdn" {
  description = "FQDN for Grafana"
  value       = var.create_monitoring_records && var.alb_dns_name != "" ? aws_route53_record.grafana[0].fqdn : null
}

output "rancher_fqdn" {
  description = "FQDN for Rancher"
  value       = var.create_rancher_record && var.rancher_alb_dns_name != "" ? aws_route53_record.rancher[0].fqdn : null
}

output "health_check_id" {
  description = "ID of the API health check"
  value       = var.create_health_check && var.alb_dns_name != "" ? aws_route53_health_check.api[0].id : null
}
