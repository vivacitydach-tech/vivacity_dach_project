# Start all Target Enterprise services (Windows / PowerShell)
# Prerequisites: XAMPP MySQL running, Node.js installed
# Usage: .\scripts\start-all.ps1

$Root = Split-Path -Parent $PSScriptRoot

Write-Host "Starting upstream engines (cost-core :8069, pm-core :8080)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-Command","cd `"$Root\cost-core`"; npm run start:dev"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd `"$Root\pm-core`"; npm run start:dev"

Start-Sleep -Seconds 3

Write-Host "Starting const-middleware :3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-Command","cd `"$Root\const-middleware`"; npm run start:dev"

Start-Sleep -Seconds 3

Write-Host "Starting const-web-ui :3001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-Command","cd `"$Root\const-web-ui`"; npm run dev -- -p 3001"

Write-Host "Starting const-mobile :3002..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-Command","cd `"$Root\const-mobile`"; npm run dev -- --port 3002"

Write-Host ""
Write-Host "URLs:" -ForegroundColor Green
Write-Host "  Portal:     http://localhost:3001"
Write-Host "  Field PWA:  http://localhost:3002"
Write-Host "  API:        http://localhost:3000/v1"
Write-Host "  cost-core:  http://127.0.0.1:8069/health"
Write-Host "  pm-core:    http://127.0.0.1:8080/health"
Write-Host ""
Write-Host "Login: admin@target.local / Password123!"
Write-Host "See const-docs/THIRD_PARTY.md for official Docker engines."
