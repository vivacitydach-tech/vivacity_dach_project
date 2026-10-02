# Stub Terraform root — providers only until cloud accounts exist.
# Local substitute: Docker Compose (see ../README.md).

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.14"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "kubernetes" {
  # Configure via kubeconfig or CI OIDC when a cluster exists.
  config_path = var.kubeconfig_path
}

provider "helm" {
  kubernetes {
    config_path = var.kubeconfig_path
  }
}

provider "cloudflare" {
  # Set CLOUDFLARE_API_TOKEN in the environment; do not commit secrets.
}

# Placeholder: no resources yet. Add VPC, EKS/GKE, DNS, WAF modules later.
