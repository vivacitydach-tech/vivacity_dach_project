# Cloudflare WAF / edge intent

Documented intent for production edge (TLS + rate limits). Implement via Cloudflare dashboard or Terraform (`../terraform/`) when a zone exists.

## TLS

| Setting | Intent |
|---|---|
| Minimum TLS version | **TLS 1.3** preferred; allow TLS 1.2 only if a legacy partner requires it |
| Always Use HTTPS | On |
| Automatic HTTPS Rewrites | On |
| HSTS | Enable with long max-age once HTTPS is proven stable |
| Certificate | Full (strict) origin — origin presents valid cert |

Browsers and mobile clients terminate TLS at Cloudflare; origin (ingress / load balancer) uses Full (strict).

## Rate limiting (intent)

| Path / match | Limit (starting point) | Action |
|---|---|---|
| `POST /v1/auth/login` | 20 req / min / IP | Challenge or block |
| `POST /v1/auth/refresh` | 60 req / min / IP | Challenge |
| `POST /v1/projects/*/documents/presign` | 120 req / min / IP | Block excess |
| All `/v1/*` authenticated | 600 req / min / IP | Soft limit + alert |
| Static app assets (`app.` host) | Higher / CDN cache | — |

Tune after observing real traffic. Login and refresh are the priority abuse surfaces.

## Isolation

- Public hosts: `app.*` (web UI / PWA), `api.*` (middleware `/v1` only)
- **Never** publish `cost-core` or `pm-core` on Cloudflare or any public DNS

## Related

- Ingress stub: `../k8s/ingress.yaml`
- Network policy: `../k8s/network-policy-upstream.yaml`
