# AWS Certificate Manager (ACM) - SSL/TLS Certificates
# Terraform AWS Provider 6.x compatible

locals {
  tags = merge(var.tags, {
    Module = "acm"
  })
}

# Primary wildcard certificate for the domain
resource "aws_acm_certificate" "main" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = concat(
    ["*.${var.domain_name}"],
    var.additional_domain_names
  )

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.tags, {
    Name = "${var.project_name}-${var.environment}-certificate"
  })
}

# DNS validation records
resource "aws_route53_record" "validation" {
  for_each = var.create_validation_records ? {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "main" {
  count = var.create_validation_records ? 1 : 0

  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]

  timeouts {
    create = "30m"
  }
}

# Environment-specific subdomain certificate (for dev/staging)
resource "aws_acm_certificate" "environment" {
  count = var.environment != "prod" && var.create_environment_cert ? 1 : 0

  domain_name       = "${var.environment}.${var.domain_name}"
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.environment}.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.tags, {
    Name = "${var.project_name}-${var.environment}-subdomain-certificate"
  })
}

# DNS validation records for environment certificate
resource "aws_route53_record" "environment_validation" {
  for_each = var.environment != "prod" && var.create_environment_cert && var.create_validation_records ? {
    for dvo in aws_acm_certificate.environment[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.zone_id
}

# Environment certificate validation
resource "aws_acm_certificate_validation" "environment" {
  count = var.environment != "prod" && var.create_environment_cert && var.create_validation_records ? 1 : 0

  certificate_arn         = aws_acm_certificate.environment[0].arn
  validation_record_fqdns = [for record in aws_route53_record.environment_validation : record.fqdn]

  timeouts {
    create = "30m"
  }
}
