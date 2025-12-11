# Route53 Hosted Zone and DNS Records
# Terraform AWS Provider 6.x compatible

locals {
  domain_name = var.domain_name
  tags = merge(var.tags, {
    Module = "route53"
  })
}

# Primary hosted zone for the domain
resource "aws_route53_zone" "main" {
  name    = local.domain_name
  comment = "Managed by Terraform - ${var.project_name} ${var.environment}"

  tags = local.tags
}

# A record for API endpoint (pointing to ALB)
resource "aws_route53_record" "api" {
  count = var.create_api_record && var.alb_dns_name != "" ? 1 : 0

  zone_id = aws_route53_zone.main.zone_id
  name    = var.environment == "prod" ? "api.${local.domain_name}" : "${var.environment}-api.${local.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# A record for Rancher
resource "aws_route53_record" "rancher" {
  count = var.create_rancher_record && var.rancher_alb_dns_name != "" ? 1 : 0

  zone_id = aws_route53_zone.main.zone_id
  name    = "rancher.${local.domain_name}"
  type    = "A"

  alias {
    name                   = var.rancher_alb_dns_name
    zone_id                = var.rancher_alb_zone_id
    evaluate_target_health = true
  }
}

# A record for Grafana monitoring
resource "aws_route53_record" "grafana" {
  count = var.create_monitoring_records && var.alb_dns_name != "" ? 1 : 0

  zone_id = aws_route53_zone.main.zone_id
  name    = var.environment == "prod" ? "grafana.${local.domain_name}" : "${var.environment}-grafana.${local.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Wildcard record for subdomains
resource "aws_route53_record" "wildcard" {
  count = var.create_wildcard_record && var.alb_dns_name != "" ? 1 : 0

  zone_id = aws_route53_zone.main.zone_id
  name    = var.environment == "prod" ? "*.${local.domain_name}" : "*.${var.environment}.${local.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Health check for API endpoint
resource "aws_route53_health_check" "api" {
  count = var.create_health_check && var.alb_dns_name != "" ? 1 : 0

  fqdn              = var.environment == "prod" ? "api.${local.domain_name}" : "${var.environment}-api.${local.domain_name}"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  tags = merge(local.tags, {
    Name = "${var.project_name}-${var.environment}-api-health-check"
  })
}
