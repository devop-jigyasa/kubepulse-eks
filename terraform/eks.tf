module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.8.0"

  cluster_name    = "${var.project_name}-eks-cluster"
  cluster_version = var.cluster_version

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.private_subnets

  # Enable OIDC Provider for IAM Roles for Service Accounts (IRSA)
  enable_irsa = true

  # Cluster Security Group Rules
  cluster_security_group_additional_rules = {
    ingress_nodes_ephemeral_ports_tcp = {
      description                = "Nodes to cluster control plane"
      protocol                   = "tcp"
      from_port                  = 1025
      to_port                    = 65535
      type                       = "ingress"
      source_node_security_group = true
    }
  }

  # Node Security Group Rules
  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all traffic"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
    ingress_cluster_alb = {
      description                   = "Allow ALB Controller webhook communication"
      protocol                      = "tcp"
      from_port                     = 9443
      to_port                       = 9443
      type                          = "ingress"
      source_cluster_security_group = true
    }
  }

  tags = {
    Environment = var.environment
    Name        = "${var.project_name}-eks-cluster"
  }
}
