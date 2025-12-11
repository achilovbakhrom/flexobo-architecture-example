variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "domain_name" {
  description = "The domain name for the hosted zone (e.g., flexobo.com)"
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  type        = string
  default     = ""
}

variable "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  type        = string
  default     = ""
}

variable "rancher_alb_dns_name" {
  description = "DNS name of the Rancher ALB"
  type        = string
  default     = ""
}

variable "rancher_alb_zone_id" {
  description = "Zone ID of the Rancher ALB"
  type        = string
  default     = ""
}

variable "create_api_record" {
  description = "Whether to create the API A record"
  type        = bool
  default     = true
}

variable "create_rancher_record" {
  description = "Whether to create the Rancher A record"
  type        = bool
  default     = false
}

variable "create_monitoring_records" {
  description = "Whether to create monitoring A records (Grafana)"
  type        = bool
  default     = true
}

variable "create_wildcard_record" {
  description = "Whether to create a wildcard A record"
  type        = bool
  default     = false
}

variable "create_health_check" {
  description = "Whether to create Route53 health checks"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
