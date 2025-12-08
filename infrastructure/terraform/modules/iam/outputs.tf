output "eks_cluster_role_arn" {
  description = "ARN of EKS cluster IAM role"
  value       = aws_iam_role.eks_cluster.arn
}

output "eks_cluster_role_name" {
  description = "Name of EKS cluster IAM role"
  value       = aws_iam_role.eks_cluster.name
}

output "eks_nodes_role_arn" {
  description = "ARN of EKS nodes IAM role"
  value       = aws_iam_role.eks_nodes.arn
}

output "eks_nodes_role_name" {
  description = "Name of EKS nodes IAM role"
  value       = aws_iam_role.eks_nodes.name
}

output "oidc_provider_arn" {
  description = "ARN of OIDC provider for IRSA"
  value       = length(aws_iam_openid_connect_provider.eks) > 0 ? aws_iam_openid_connect_provider.eks[0].arn : ""
}

output "load_balancer_controller_role_arn" {
  description = "ARN of Load Balancer Controller IAM role"
  value       = length(aws_iam_role.load_balancer_controller) > 0 ? aws_iam_role.load_balancer_controller[0].arn : ""
}

output "ebs_csi_driver_role_arn" {
  description = "ARN of EBS CSI Driver IAM role"
  value       = length(aws_iam_role.ebs_csi_driver) > 0 ? aws_iam_role.ebs_csi_driver[0].arn : ""
}
