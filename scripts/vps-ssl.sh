#!/usr/bin/env bash
# ==============================================================================
# Target Enterprise - Let's Encrypt SSL / HTTPS Setup Script
# Usage: sudo ./scripts/vps-ssl.sh yourdomain.com admin@yourdomain.com
# ==============================================================================

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: sudo $0 <your-domain.com> <your-email@domain.com>"
    echo "Example: sudo $0 construction.mycompany.com admin@mycompany.com"
    exit 1
fi

echo "🔒 Setting up Let's Encrypt SSL for domain: $DOMAIN..."

apt-get update -y
apt-get install -y certbot

# Stop Nginx gateway temporarily to bind port 80 for ACME challenge
echo "Stopping container gateway for standalone certbot issuance..."
docker compose --env-file /opt/target-enterprise/.env.docker stop gateway || true

# Obtain Certificate
certbot certonly --standalone -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive

# Create production HTTPS Nginx config
SSL_CONF="/opt/target-enterprise/const-infra/nginx/gateway-ssl.conf"
cat <<EOF > "$SSL_CONF"
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    client_max_body_size 50m;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location /v1/ {
        proxy_pass http://api:3000/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /field/ {
        proxy_pass http://mobile:80/;
        proxy_set_header Host \$host;
    }

    location / {
        proxy_pass http://web:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Restart Gateway
docker compose --env-file /opt/target-enterprise/.env.docker start gateway

echo "✅ HTTPS & SSL successfully enabled for https://$DOMAIN"
