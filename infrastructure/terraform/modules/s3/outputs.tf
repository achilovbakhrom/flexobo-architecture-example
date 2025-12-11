output "db_backups_bucket_name" {
  description = "Name of the database backups bucket"
  value       = aws_s3_bucket.db_backups.id
}

output "db_backups_bucket_arn" {
  description = "ARN of the database backups bucket"
  value       = aws_s3_bucket.db_backups.arn
}

output "monitoring_bucket_name" {
  description = "Name of the monitoring data bucket"
  value       = aws_s3_bucket.monitoring.id
}

output "monitoring_bucket_arn" {
  description = "ARN of the monitoring data bucket"
  value       = aws_s3_bucket.monitoring.arn
}

output "files_bucket_name" {
  description = "Name of the files bucket"
  value       = var.create_files_bucket ? aws_s3_bucket.files[0].id : null
}

output "files_bucket_arn" {
  description = "ARN of the files bucket"
  value       = var.create_files_bucket ? aws_s3_bucket.files[0].arn : null
}

output "s3_access_policy_arn" {
  description = "ARN of the IAM policy for S3 access"
  value       = aws_iam_policy.s3_access.arn
}

output "bucket_names" {
  description = "Map of all bucket names"
  value = {
    db_backups = aws_s3_bucket.db_backups.id
    monitoring = aws_s3_bucket.monitoring.id
    files      = var.create_files_bucket ? aws_s3_bucket.files[0].id : null
  }
}
