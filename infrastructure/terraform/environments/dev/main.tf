# Development Environment Configuration

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
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

  # Dev sizing
  node_instance_types = ["t3.medium"]
  node_desired_size   = 2
  node_min_size       = 1
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
