variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "use_kms_encryption" {
  description = "Whether to use KMS encryption for S3 buckets"
  type        = bool
  default     = false
}

variable "kms_key_arn" {
  description = "ARN of the KMS key for S3 encryption"
  type        = string
  default     = null
}

variable "backup_transition_days" {
  description = "Number of days before transitioning backups to Glacier"
  type        = number
  default     = 30
}

variable "backup_expiration_days" {
  description = "Number of days before expiring backups"
  type        = number
  default     = 365
}

variable "monitoring_retention_days" {
  description = "Number of days to retain monitoring data"
  type        = number
  default     = 90
}

variable "monitoring_cors_origins" {
  description = "Allowed origins for monitoring bucket CORS"
  type        = list(string)
  default     = ["*"]
}

variable "create_files_bucket" {
  description = "Whether to create the files bucket for user uploads"
  type        = bool
  default     = true
}

variable "files_cors_origins" {
  description = "Allowed origins for files bucket CORS"
  type        = list(string)
  default     = ["*"]
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
