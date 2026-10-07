variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Deployment target environment (dev, staging, prod)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Base name for all resources in this infrastructure stack"
  type        = string
  default     = "kubepulse"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "cluster_version" {
  description = "Kubernetes control plane version for Amazon EKS"
  type        = string
  default     = "1.30"
}
