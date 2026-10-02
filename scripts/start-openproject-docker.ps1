# Start official OpenProject (pm-core) via Docker Compose
# Requires: Docker Desktop running

$ErrorActionPreference = "Stop"
$Infra = Join-Path (Split-Path -Parent $PSScriptRoot) "const-infra"

Write-Host "Waiting for Docker engine..."
$deadline = (Get-Date).AddMinutes(5)
do {
  docker info 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  if ((Get-Date) -gt $deadline) { throw "Docker engine not ready. Open Docker Desktop and retry." }
  Start-Sleep -Seconds 5
} while ($true)

Write-Host "Stopping any local pm-core on :8080 is recommended before official OpenProject binds that port."
Set-Location $Infra
docker compose --profile official up -d
docker compose --profile official ps
Write-Host "OpenProject UI (when healthy): http://localhost:8080"
