$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path .env.docker)) {
  Copy-Item .env.docker.example .env.docker
  Write-Host "Created .env.docker from example - edit secrets before production use."
}

Write-Host "Building and starting Target Enterprise stack..."
docker compose --env-file .env.docker up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Portal:  http://localhost:3001"
Write-Host "API:     http://localhost:3000/v1/health"
Write-Host "Field:   http://localhost:3002"
Write-Host "Login:   admin@target.local / Password123!"
