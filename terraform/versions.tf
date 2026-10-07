terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.28"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
  }

  # S3 Remote State Backend with DynamoDB State Locking (Production Best Practice)
  # backend "s3" {
  #   bucket         = "kubepulse-terraform-state-us-west-2"
  #   key            = "eks/terraform.tfstate"
  #   region         = "us-west-2"
  #   dynamodb_table = "kubepulse-tf-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
