# Development Environment Configuration

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
    key            = "environments/dev/terraform.tfstate"
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

# Route53 Module - DNS Management
module "route53" {
  source = "../../modules/route53"

  domain_name              = var.domain_name
  environment              = var.environment
  create_api_record        = true
  create_monitoring_records = true
  create_rancher_record    = true  # Rancher will be on dev cluster
  alb_dns_name             = ""     # Will be updated after ALB is created
  alb_zone_id              = ""     # Will be updated after ALB is created
  rancher_alb_dns_name     = ""     # Same ALB for Rancher
  rancher_alb_zone_id      = ""     # Same zone
  create_health_check      = false  # Enable after deployment
  enable_dnssec            = false  # Can enable later

  tags = local.common_tags
}

# ACM Module - SSL Certificates
module "acm" {
  source = "../../modules/acm"

  domain_name                = var.domain_name
  environment                = var.environment
  route53_zone_id            = module.route53.zone_id
  create_validation_records  = true
  create_environment_cert    = true  # Create dev.flexobo.com cert

  tags = local.common_tags

  depends_on = [module.route53]
}

# S3 Module - Storage Buckets
module "s3" {
  source = "../../modules/s3"

  project_name        = var.project_name
  environment         = var.environment
  create_files_bucket = true

  # Dev retention settings (cost-optimized)
  backup_retention_days   = 30
  backup_glacier_days     = 60
  monitoring_retention_days = 30

  tags = local.common_tags
}

# OpenSearch Module - Jaeger Backend
module "opensearch" {
  source = "../../modules/opensearch"

  project_name = var.project_name
  environment  = var.environment

  # Dev sizing (free tier eligible)
  instance_type  = "t3.small.search"
  instance_count = 1
  volume_size    = 10

  # VPC configuration
  vpc_enabled = true
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = [module.vpc.private_subnet_ids[0]]  # Single subnet for dev

  # Access configuration
  master_user_name     = "admin"
  master_user_password = var.opensearch_password
  allowed_cidr_blocks  = [var.vpc_cidr]

  # Retention (cost-optimized for dev)
  index_retention_days = 7

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

  # Third-party API keys (empty for dev, set via console/CI)
  stripe_secret_key      = var.stripe_secret_key
  stripe_webhook_secret  = var.stripe_webhook_secret
  telegram_bot_token     = var.telegram_bot_token
  click_secret_key       = var.click_secret_key

  # OIDC for External Secrets Operator
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer_url   = module.eks.cluster_oidc_issuer_url

  # KMS for dev (optional, can be disabled for cost)
  create_kms_key = false

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
  single_nat_gateway = true  # Cost saving for dev

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
  oidc_issuer_url = ""  # Will be updated after EKS is created

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
  ebs_csi_driver_role_arn   = ""  # Will be created after OIDC provider

  # Dev sizing (t3.small for cost optimization)
  node_instance_types = ["t3.small"]
  node_desired_size   = 2
  node_min_size       = 2
  node_max_size       = 4
  enable_spot_nodes   = false

  tags = local.common_tags

  depends_on = [module.iam, module.vpc, module.security_groups]
}

# IAM Module (with OIDC - second apply needed)
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

  # Dev sizing
  instance_class                = "db.t3.micro"
  allocated_storage             = 20
  max_allocated_storage         = 50
  multi_az                      = false
  performance_insights_enabled  = false
  backup_retention_period       = 7
  deletion_protection           = false
  skip_final_snapshot           = true

  master_password = var.db_password

  tags = local.common_tags

  depends_on = [module.vpc, module.security_groups]
}

# ECR Module
module "ecr" {
  source = "../../modules/ecr"

  project_name   = var.project_name
  images_to_keep = 5  # Less images for dev
  scan_on_push   = true

  tags = local.common_tags
}
