variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "repository_names" {
  description = "List of repository names to create"
  type        = list(string)
  default = [
    "users-service",
    "chat-service",
    "file-service",
    "main-service",
    "billing-service",
    "notification-service",
    "telegram-service",
  ]
}

variable "scan_on_push" {
  description = "Enable image scanning on push"
  type        = bool
  default     = true
}

variable "images_to_keep" {
  description = "Number of tagged images to keep"
  type        = number
  default     = 10
}

variable "untagged_expiry_days" {
  description = "Days after which untagged images expire"
  type        = number
  default     = 7
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
