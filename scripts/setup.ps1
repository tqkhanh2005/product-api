$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (!(Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
    Write-Host 'Created .env from the local example.'
}
Write-Host 'Start P1: docker compose up -d --build --wait --wait-timeout 180'
Write-Host 'P1 API: http://localhost:3000/api/health'
