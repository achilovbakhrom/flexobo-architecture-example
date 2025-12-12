variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "engine_version" {
  description = "OpenSearch engine version"
  type        = string
  default     = "OpenSearch_2.11"
}

variable "instance_type" {
  description = "Instance type for OpenSearch nodes"
  type        = string
  default     = "t3.small.search"
}

variable "instance_count" {
  description = "Number of instances in the cluster"
  type        = number
  default     = 1
}

variable "zone_awareness_enabled" {
  description = "Whether zone awareness is enabled"
  type        = bool
  default     = false
}

variable "availability_zone_count" {
  description = "Number of availability zones for zone awareness"
  type        = number
  default     = 2
}

variable "dedicated_master_enabled" {
  description = "Whether dedicated master nodes are enabled"
  type        = bool
  default     = false
}

variable "cold_storage_enabled" {
  description = "Whether cold storage is enabled"
  type        = bool
  default     = false
}

variable "ebs_volume_type" {
  description = "EBS volume type"
  type        = string
  default     = "gp3"
}

variable "ebs_volume_size" {
  description = "EBS volume size in GB"
  type        = number
  default     = 20
}

variable "ebs_iops" {
  description = "IOPS for gp3 volumes"
  type        = number
  default     = 3000
}

variable "ebs_throughput" {
  description = "Throughput for gp3 volumes in MiB/s"
  type        = number
  default     = 125
}

variable "kms_key_id" {
  description = "KMS key ID for encryption at rest"
  type        = string
  default     = null
}

variable "vpc_enabled" {
  description = "Whether to deploy OpenSearch in a VPC"
  type        = bool
  default     = true
}

variable "vpc_id" {
  description = "VPC ID for OpenSearch"
  type        = string
  default     = ""
}

variable "subnet_ids" {
  description = "Subnet IDs for OpenSearch"
  type        = list(string)
  default     = []
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to access OpenSearch"
  type        = list(string)
  default     = []
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access OpenSearch"
  type        = list(string)
  default     = []
}

variable "master_user_name" {
  description = "Master user name for OpenSearch"
  type        = string
  default     = "admin"
}

variable "master_user_password" {
  description = "Master user password for OpenSearch"
  type        = string
  sensitive   = true
}

variable "auto_tune_enabled" {
<<<<<<< HEAD
  description = "Whether auto-tune is enabled (not supported on t2/t3 instance types)"
  type        = bool
  default     = false
=======
  description = "Whether auto-tune is enabled"
  type        = bool
  default     = true
>>>>>>> b52bf1b21edabe00c94bd5ea88572ef807a79f9a
}

variable "create_service_linked_role" {
  description = "Whether to create the OpenSearch service-linked role"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
