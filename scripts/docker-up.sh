#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.docker ]]; then
  cp .env.docker.example .env.docker
  echo "Created .env.docker from example — edit secrets before production use."
fi

echo "Building and starting Target Enterprise stack..."
docker compose --env-file .env.docker up -d --build

echo ""
echo "Portal:  http://localhost:3001"
echo "API:     http://localhost:3000/v1/health"
echo "Field:   http://localhost:3002"
echo "Login:   admin@target.local / Password123!"
