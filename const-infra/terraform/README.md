# Terraform stubs — Target Enterprise

Provider stubs live in `main.tf` / `variables.tf`. **No cloud resources are created yet.**

## When to use

| Stage | Tool |
|---|---|
| Laptop / CI smoke | Docker Compose in `../` |
| Cluster deploy | `../k8s/` or `../helm/const-platform` |
| Cloud + DNS + WAF | This Terraform root (extend modules) |

## Secrets

Never commit API tokens. Prefer:

- `CLOUDFLARE_API_TOKEN`
- AWS SSO / OIDC for CI
- Sealed Secrets or external-secrets for in-cluster credentials

## Next modules (not yet present)

- VPC / networking
- Managed Kubernetes
- RDS / ElastiCache / S3 equivalents of Postgres / Redis / MinIO
- Cloudflare zone + WAF rules matching `../cloudflare/waf-rules.md`
