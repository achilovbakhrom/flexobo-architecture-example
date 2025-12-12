variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "flexobo"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS"
  type        = string
  default     = "1.29"
}

variable "db_password" {
  description = "Master password for RDS PostgreSQL"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Root domain name for the application"
  type        = string
<<<<<<< HEAD
  default     = "flexobo-mock.site"
=======
  default     = "flexobo.com"
>>>>>>> b52bf1b21edabe00c94bd5ea88572ef807a79f9a
}

variable "opensearch_password" {
  description = "Master password for OpenSearch"
  type        = string
  sensitive   = true
  default     = ""  # Set via terraform.tfvars or environment variable
}

variable "stripe_secret_key" {
  description = "Stripe API secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "telegram_bot_token" {
  description = "Telegram bot token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "click_secret_key" {
  description = "Click payment provider secret key"
  type        = string
  sensitive   = true
  default     = ""
}
