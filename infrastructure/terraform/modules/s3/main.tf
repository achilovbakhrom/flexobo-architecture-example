# S3 Buckets for backups, monitoring, and file storage
# Terraform AWS Provider 6.x compatible

locals {
  tags = merge(var.tags, {
    Module = "s3"
  })
}

# Database backups bucket
resource "aws_s3_bucket" "db_backups" {
  bucket = "${var.project_name}-${var.environment}-db-backups"

  tags = merge(local.tags, {
    Name    = "${var.project_name}-${var.environment}-db-backups"
    Purpose = "database-backups"
  })
}

resource "aws_s3_bucket_versioning" "db_backups" {
  bucket = aws_s3_bucket.db_backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "db_backups" {
  bucket = aws_s3_bucket.db_backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.use_kms_encryption ? "aws:kms" : "AES256"
      kms_master_key_id = var.use_kms_encryption ? var.kms_key_arn : null
    }
    bucket_key_enabled = var.use_kms_encryption
  }
}

resource "aws_s3_bucket_public_access_block" "db_backups" {
  bucket = aws_s3_bucket.db_backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "db_backups" {
  bucket = aws_s3_bucket.db_backups.id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    transition {
      days          = var.backup_transition_days
      storage_class = "GLACIER"
    }

    expiration {
      days = var.backup_expiration_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# Monitoring data bucket (Prometheus, Loki, Thanos)
resource "aws_s3_bucket" "monitoring" {
  bucket = "${var.project_name}-${var.environment}-monitoring"

  tags = merge(local.tags, {
    Name    = "${var.project_name}-${var.environment}-monitoring"
    Purpose = "monitoring-data"
  })
}

resource "aws_s3_bucket_versioning" "monitoring" {
  bucket = aws_s3_bucket.monitoring.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "monitoring" {
  bucket = aws_s3_bucket.monitoring.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.use_kms_encryption ? "aws:kms" : "AES256"
      kms_master_key_id = var.use_kms_encryption ? var.kms_key_arn : null
    }
    bucket_key_enabled = var.use_kms_encryption
  }
}

resource "aws_s3_bucket_public_access_block" "monitoring" {
  bucket = aws_s3_bucket.monitoring.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "monitoring" {
  bucket = aws_s3_bucket.monitoring.id

  rule {
    id     = "expire-old-data"
    status = "Enabled"

    expiration {
      days = var.monitoring_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# CORS configuration for Loki (if needed)
resource "aws_s3_bucket_cors_configuration" "monitoring" {
  bucket = aws_s3_bucket.monitoring.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.monitoring_cors_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# File uploads bucket (for file-service)
resource "aws_s3_bucket" "files" {
  count  = var.create_files_bucket ? 1 : 0
  bucket = "${var.project_name}-${var.environment}-files"

  tags = merge(local.tags, {
    Name    = "${var.project_name}-${var.environment}-files"
    Purpose = "user-uploads"
  })
}

resource "aws_s3_bucket_versioning" "files" {
  count  = var.create_files_bucket ? 1 : 0
  bucket = aws_s3_bucket.files[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "files" {
  count  = var.create_files_bucket ? 1 : 0
  bucket = aws_s3_bucket.files[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.use_kms_encryption ? "aws:kms" : "AES256"
      kms_master_key_id = var.use_kms_encryption ? var.kms_key_arn : null
    }
    bucket_key_enabled = var.use_kms_encryption
  }
}

resource "aws_s3_bucket_public_access_block" "files" {
  count  = var.create_files_bucket ? 1 : 0
  bucket = aws_s3_bucket.files[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS configuration for presigned URLs
resource "aws_s3_bucket_cors_configuration" "files" {
  count  = var.create_files_bucket ? 1 : 0
  bucket = aws_s3_bucket.files[0].id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.files_cors_origins
    expose_headers  = ["ETag", "Content-Length", "Content-Type"]
    max_age_seconds = 3600
  }
}

# IAM policy for EKS pods to access S3 buckets
resource "aws_iam_policy" "s3_access" {
  name        = "${var.project_name}-${var.environment}-s3-access"
  description = "Policy for EKS pods to access S3 buckets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = concat(
          [
            aws_s3_bucket.db_backups.arn,
            "${aws_s3_bucket.db_backups.arn}/*",
            aws_s3_bucket.monitoring.arn,
            "${aws_s3_bucket.monitoring.arn}/*"
          ],
          var.create_files_bucket ? [
            aws_s3_bucket.files[0].arn,
            "${aws_s3_bucket.files[0].arn}/*"
          ] : []
        )
      }
    ]
  })

  tags = local.tags
}
