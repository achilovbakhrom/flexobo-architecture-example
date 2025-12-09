# Terraform Backend Configuration
# S3 bucket and DynamoDB table for state management

terraform {
  backend "s3" {
    bucket         = "flexobo-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "flexobo-terraform-locks"
  }
}

# Note: The S3 bucket and DynamoDB table must be created manually before using this backend
#
# Create S3 bucket:
# aws s3api create-bucket --bucket flexobo-terraform-state --region us-east-1
# aws s3api put-bucket-versioning --bucket flexobo-terraform-state --versioning-configuration Status=Enabled
# aws s3api put-bucket-encryption --bucket flexobo-terraform-state --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
#
# Create DynamoDB table:
# aws dynamodb create-table \
#   --table-name flexobo-terraform-locks \
#   --attribute-definitions AttributeName=LockID,AttributeType=S \
#   --key-schema AttributeName=LockID,KeyType=HASH \
#   --billing-mode PAY_PER_REQUEST \
#   --region us-east-1
