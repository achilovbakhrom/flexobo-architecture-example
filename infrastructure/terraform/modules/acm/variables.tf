variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "domain_name" {
  description = "The primary domain name for the certificate"
  type        = string
}

variable "zone_id" {
  description = "Route53 hosted zone ID for DNS validation"
  type        = string
}

variable "additional_domain_names" {
  description = "Additional domain names (SANs) for the certificate"
  type        = list(string)
  default     = []
}

variable "create_validation_records" {
  description = "Whether to create DNS validation records in Route53"
  type        = bool
  default     = true
}

variable "create_environment_cert" {
  description = "Whether to create an environment-specific subdomain certificate"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
