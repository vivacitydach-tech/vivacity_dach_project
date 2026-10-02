# Target Enterprise — local upstream engines launcher
# Starts cost-core (8069) and pm-core (8080) in separate PowerShell windows.
#
# Usage:
#   .\scripts\start-engines.ps1
#   .\scripts\start-engines.ps1 -Dev   # tsx watch mode

param(
  [switch]$Dev
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$CostDir = Join-Path $Root 'cost-core'
$PmDir = Join-Path $Root 'pm-core'

function Ensure-Installed([string]$Dir) {
  if (-not (Test-Path (Join-Path $Dir 'node_modules'))) {
    Write-Host "Installing dependencies in $Dir ..."
    Push-Location $Dir
    npm install
    Pop-Location
  }
}

Ensure-Installed $CostDir
Ensure-Installed $PmDir

$script = if ($Dev) { 'start:dev' } else { 'start:dev' }

# Prefer start:dev so TypeScript runs without a separate build step for local use.
# Use npm run start after npm run build for production-like runs.
if (-not $Dev) {
  Write-Host 'Building cost-core and pm-core...'
  Push-Location $CostDir; npm run build; Pop-Location
  Push-Location $PmDir; npm run build; Pop-Location
  $script = 'start'
}

Write-Host "Starting cost-core on :8069 ($script)..."
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "Set-Location '$CostDir'; Write-Host 'cost-core :8069'; npm run $script"
)

Write-Host "Starting pm-core on :8080 ($script)..."
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "Set-Location '$PmDir'; Write-Host 'pm-core :8080'; npm run $script"
)

Write-Host ''
Write-Host 'Engines launched in new windows.'
Write-Host '  cost-core  http://127.0.0.1:8069/health'
Write-Host '  pm-core    http://127.0.0.1:8080/health'
Write-Host '  pm-core    http://127.0.0.1:8080/api/v3'
Write-Host ''
Write-Host 'Wire middleware: UPSTREAM_MODE=http'
Write-Host '  COST_CORE_BASE_URL=http://127.0.0.1:8069'
Write-Host '  PM_CORE_BASE_URL=http://127.0.0.1:8080'
