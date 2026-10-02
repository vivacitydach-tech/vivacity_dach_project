#!/usr/bin/env bash
# ==============================================================================
# Target Enterprise - Production VPS 1-Click Deployment Script
# Supports: Ubuntu 22.04 / 24.04 LTS, Debian 12, Rocky Linux 9
# ==============================================================================

set -euo pipefail

echo "================================================================="
echo "🏗️  Target Enterprise Construction Platform - VPS Setup"
echo "================================================================="

# 1. Check Root Privileges
if [ "$(id -u)" -ne 0 ]; then
    echo "❌ Error: This script must be run as root (or with sudo)." >&2
    exit 1
fi

APP_DIR="/opt/target-enterprise"
REPO_URL="https://github.com/vivacitydach-tech/vivacity_dach_project.git"

# 2. Install Required Dependencies & Docker if missing
echo "📦 [1/6] Checking and installing system packages & Docker..."
if ! command -v docker &> /dev/null; then
    echo "⚙️ Installing Docker Engine and Docker Compose plugin..."
    apt-get update -y
    apt-get install -y curl git ufw fail2ban ca-certificates gnupg lsb-release
    
    # Official Docker install script
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh
    systemctl enable docker
    systemctl start docker
else
    echo "✅ Docker is already installed: $(docker --version)"
fi

# 3. Configure Firewall (UFW)
echo "🔒 [2/6] Configuring UFW Firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp comment 'SSH' || true
    ufw allow 80/tcp comment 'HTTP Gateway' || true
    ufw allow 443/tcp comment 'HTTPS Gateway' || true
    ufw --force enable || true
fi

# 4. Clone or Pull Latest Project Repository
echo "📥 [3/6] Fetching repository from GitHub..."
if [ -d "$APP_DIR/.git" ]; then
    echo "🔄 Updating existing repository at $APP_DIR..."
    cd "$APP_DIR"
    git fetch origin main
    git reset --hard origin/main
else
    echo "🚀 Cloning repository into $APP_DIR..."
    mkdir -p "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# 5. Generate Production Environment Configuration
echo "⚙️ [4/6] Configuring Production Environment (.env.docker)..."
if [ ! -f "$APP_DIR/.env.docker" ]; then
    # Generate secure random passwords
    MYSQL_ROOT_PASS=$(openssl rand -hex 16)
    MYSQL_APP_PASS=$(openssl rand -hex 16)
    JWT_SECRET_KEY=$(openssl rand -hex 32)

    cat <<EOF > "$APP_DIR/.env.docker"
# ========================================================
# Production Target Enterprise Environment
# ========================================================
NODE_ENV=production
GATEWAY_HOST_PORT=80
GATEWAY_PORT=80

# Database Credentials
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASS}
MYSQL_DATABASE=target_db
MYSQL_USER=target_app
MYSQL_PASSWORD=${MYSQL_APP_PASS}
DATABASE_URL=mysql://target_app:${MYSQL_APP_PASS}@mysql:3306/target_db?connection_limit=20

# Cache & Messaging
REDIS_URL=redis://redis:6379

# Authentication & Security
JWT_SECRET=${JWT_SECRET_KEY}
PORT=3000
API_BASE_URL=/v1

# Internal Microservice URLs
COST_CORE_URL=http://cost-core:8069
PM_CORE_URL=http://pm-core:8080
EOF
    echo "✅ Created secure .env.docker with generated secrets."
else
    echo "ℹ️ Using existing .env.docker configuration."
fi

# 6. Build and Launch Containers
echo "🐳 [5/6] Building and starting all Docker services..."
docker compose --env-file .env.docker down --remove-orphans || true
docker compose --env-file .env.docker up -d --build

# 7. Health Check
echo "🩺 [6/6] Waiting for services to become healthy..."
sleep 15
docker compose --env-file .env.docker ps

echo "================================================================="
echo "🎉 Target Enterprise is LIVE on your VPS!"
echo "================================================================="
echo "🌐 Web Portal:    http://$(curl -s ifconfig.me || hostname -I | awk '{print $1}')/"
echo "📱 Mobile PWA:     http://$(curl -s ifconfig.me || hostname -I | awk '{print $1}')/field/"
echo "🔌 API Docs:       http://$(curl -s ifconfig.me || hostname -I | awk '{print $1}')/v1/docs"
echo "================================================================="
echo "Default Demo Login:"
echo "👤 Email:    pm@target.local"
echo "🔑 Password: Target2026!Demo"
echo "================================================================="
