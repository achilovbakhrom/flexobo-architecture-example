variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "recovery_window_days" {
  description = "Number of days before a deleted secret is permanently removed"
  type        = number
  default     = 7
}

variable "create_kms_key" {
  description = "Whether to create a KMS key for secrets encryption"
  type        = bool
  default     = false
}

# JWT Secret
variable "jwt_secret" {
  description = "JWT signing secret (leave empty to auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

# Database credentials
variable "db_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "Database password (leave empty to auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "db_host" {
  description = "Database host"
  type        = string
  default     = ""
}

variable "db_port" {
  description = "Database port"
  type        = string
  default     = "5432"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "flexobo"
}

# Third-party API keys
variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "click_secret_key" {
  description = "Click payment secret key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "telegram_bot_token" {
  description = "Telegram bot token"
  type        = string
  default     = ""
  sensitive   = true
}

variable "sms_api_key" {
  description = "SMS service API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "email_api_key" {
  description = "Email service API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "firebase_config" {
  description = "Firebase configuration JSON"
  type        = string
  default     = "{}"
  sensitive   = true
}

# OpenSearch credentials
variable "opensearch_username" {
  description = "OpenSearch username"
  type        = string
  default     = "admin"
}

variable "opensearch_password" {
  description = "OpenSearch password"
  type        = string
  default     = ""
  sensitive   = true
}

variable "opensearch_endpoint" {
  description = "OpenSearch endpoint URL"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
