resource "aws_eks_node_group" "system_nodes" {
  cluster_name    = module.eks.cluster_name
  node_group_name = "${var.project_name}-system-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = module.vpc.private_subnets

  scaling_config {
    desired_size = 2
    max_size     = 3
    min_size     = 1
  }

  instance_types = ["t3.medium"]
  capacity_type  = "ON_DEMAND"

  labels = {
    role = "system"
  }

  tags = {
    Name = "${var.project_name}-system-node"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]
}

resource "aws_eks_node_group" "spot_workloads" {
  cluster_name    = module.eks.cluster_name
  node_group_name = "${var.project_name}-spot-workload-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = module.vpc.private_subnets

  scaling_config {
    desired_size = 2
    max_size     = 5
    min_size     = 1
  }

  # Cost Optimization: Multiple Spot instances for high availability and ~70% cost savings
  instance_types = ["t3.medium", "t3a.medium"]
  capacity_type  = "SPOT"

  labels = {
    role = "workload"
    tier = "spot"
  }

  tags = {
    Name = "${var.project_name}-spot-workload-node"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]
}
