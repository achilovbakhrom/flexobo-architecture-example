# Production Environment Configuration

terraform {
  required_version = ">= 1.5.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.17"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "flexobo-terraform-state"
    key            = "environments/prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "flexobo-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

locals {
  cluster_name = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# Route53 Module - DNS Management (shared with dev, use data source)
# Note: Route53 zone is created in dev environment and shared
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# ACM Module - SSL Certificates for Production
module "acm" {
  source = "../../modules/acm"

  domain_name                = var.domain_name
  environment                = var.environment
  route53_zone_id            = data.aws_route53_zone.main.zone_id
  create_validation_records  = true
  create_environment_cert    = false  # Use main wildcard cert for prod

  tags = local.common_tags
}

# S3 Module - Storage Buckets
module "s3" {
  source = "../../modules/s3"

  project_name        = var.project_name
  environment         = var.environment
  create_files_bucket = true

  # Production retention settings (longer retention)
  backup_retention_days     = 90
  backup_glacier_days       = 180
  monitoring_retention_days = 90

  tags = local.common_tags
}

# OpenSearch Module - Jaeger Backend
module "opensearch" {
  source = "../../modules/opensearch"

  project_name = var.project_name
  environment  = var.environment

  # Production sizing
  instance_type  = "t3.small.search"
  instance_count = 2  # HA for production
  volume_size    = 50

  # VPC configuration
  vpc_enabled = true
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = slice(module.vpc.private_subnet_ids, 0, 2)  # Two subnets for HA

  # Access configuration
  master_user_name     = "admin"
  master_user_password = var.opensearch_password
  allowed_cidr_blocks  = [var.vpc_cidr]

  # Retention (production)
  index_retention_days = 30

  tags = local.common_tags

  depends_on = [module.vpc]
}

# Secrets Manager Module
module "secrets_manager" {
  source = "../../modules/secrets-manager"

  project_name = var.project_name
  environment  = var.environment

  # Database credentials
  db_host     = module.rds.db_instance_address
  db_port     = module.rds.db_instance_port
  db_username = module.rds.db_username
  db_password = var.db_password

  # OpenSearch credentials
  opensearch_endpoint = module.opensearch.endpoint
  opensearch_username = "admin"
  opensearch_password = var.opensearch_password

  # Third-party API keys (set via terraform.tfvars or CI)
  stripe_secret_key      = var.stripe_secret_key
  stripe_webhook_secret  = var.stripe_webhook_secret
  telegram_bot_token     = var.telegram_bot_token
  click_secret_key       = var.click_secret_key

  # OIDC for External Secrets Operator
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer_url   = module.eks.cluster_oidc_issuer_url

  # KMS encryption for production
  create_kms_key = true

  tags = local.common_tags

  depends_on = [module.rds, module.opensearch, module.eks]
}

# VPC Module
module "vpc" {
  source = "../../modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  cluster_name       = local.cluster_name
  enable_nat_gateway = true
  single_nat_gateway = false  # HA for production

  tags = local.common_tags
}

# Security Groups Module
module "security_groups" {
  source = "../../modules/security-groups"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
  cluster_name = local.cluster_name

  tags = local.common_tags
}

# IAM Module (initial - without OIDC)
module "iam" {
  source = "../../modules/iam"

  project_name    = var.project_name
  environment     = var.environment
  oidc_issuer_url = ""

  tags = local.common_tags
}

# EKS Module
module "eks" {
  source = "../../modules/eks"

  cluster_name              = local.cluster_name
  kubernetes_version        = var.kubernetes_version
  cluster_role_arn          = module.iam.eks_cluster_role_arn
  node_role_arn             = module.iam.eks_nodes_role_arn
  subnet_ids                = module.vpc.private_subnet_ids
  cluster_security_group_id = module.security_groups.eks_cluster_sg_id
  ebs_csi_driver_role_arn   = ""

  # Production sizing (cost-optimized per plan: 2x t3.large)
  node_instance_types = ["t3.large"]
  node_desired_size   = 2
  node_min_size       = 2
  node_max_size       = 6

  # Disable spot nodes for production stability
  enable_spot_nodes   = false

  tags = local.common_tags

  depends_on = [module.iam, module.vpc, module.security_groups]
}

# IAM Module (with OIDC)
module "iam_irsa" {
  source = "../../modules/iam"

  project_name    = var.project_name
  environment     = var.environment
  oidc_issuer_url = module.eks.cluster_oidc_issuer_url

  tags = local.common_tags

  depends_on = [module.eks]
}

# RDS Module
module "rds" {
  source = "../../modules/rds"

  project_name      = var.project_name
  environment       = var.environment
  subnet_ids        = module.vpc.private_subnet_ids
  security_group_id = module.security_groups.rds_sg_id

  # Production sizing (cost-optimized per plan: db.t3.medium Multi-AZ)
  instance_class                = "db.t3.medium"
  allocated_storage             = 50
  max_allocated_storage         = 200
  multi_az                      = true
  performance_insights_enabled  = true
  backup_retention_period       = 30
  deletion_protection           = true
  skip_final_snapshot           = false

  master_password = var.db_password

  tags = local.common_tags

  depends_on = [module.vpc, module.security_groups]
}

# ECR Module
module "ecr" {
  source = "../../modules/ecr"

  project_name   = var.project_name
  images_to_keep = 20
  scan_on_push   = true

  tags = local.common_tags
}
