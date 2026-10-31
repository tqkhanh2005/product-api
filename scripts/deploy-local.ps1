$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (!$env:DOCKERHUB_USERNAME) { throw 'Set DOCKERHUB_USERNAME first.' }
if (!$env:IMAGE_TAG) { $env:IMAGE_TAG = 'latest' }
docker compose -f docker-compose-prod.yaml pull
if ($LASTEXITCODE -ne 0) { throw 'Image pull failed; current deployment preserved.' }
docker compose -f docker-compose-prod.yaml up -d --wait --wait-timeout 180
if ($LASTEXITCODE -ne 0) { throw 'Deployment failed health check.' }
$mappedPort = docker compose -f docker-compose-prod.yaml port product-api 3000
if ($LASTEXITCODE -ne 0) { throw 'Cannot determine the deployed API port.' }
$port = ($mappedPort.Trim() -split ':')[-1]
$health = Invoke-RestMethod -Uri "http://localhost:$port/api/health"
if ($health.status -ne 'UP') { throw 'Health endpoint is not UP.' }
Write-Host "Deployed verified image $env:IMAGE_TAG; API and MongoDB healthy."
