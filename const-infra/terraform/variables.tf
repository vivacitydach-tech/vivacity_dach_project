variable "aws_region" {
  description = "AWS region for future cloud resources"
  type        = string
  default     = "eu-central-1"
}

variable "kubeconfig_path" {
  description = "Path to kubeconfig when a cluster exists"
  type        = string
  default     = "~/.kube/config"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project / product name for tagging"
  type        = string
  default     = "target-enterprise"
}
