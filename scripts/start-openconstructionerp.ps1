# Start official OpenConstructionERP (cost-core) on port 8069
# Requires: Python 3.12 + pip package openconstructionerp

$ErrorActionPreference = "Stop"
$py = "$env:LocalAppData\Programs\Python\Python312\python.exe"
$oce = "$env:LocalAppData\Programs\Python\Python312\Scripts\openconstructionerp.exe"

if (-not (Test-Path $py)) {
  Write-Error "Python 3.12 not found. Install with: winget install Python.Python.3.12"
}

if (-not (Test-Path $oce)) {
  Write-Host "Installing openconstructionerp..."
  & $py -m pip install openconstructionerp
}

Write-Host "Starting OpenConstructionERP on http://127.0.0.1:8069 ..."
Write-Host "Stop the local Node cost-core stand-in first if it is using :8069."
& $oce serve --host 127.0.0.1 --port 8069
