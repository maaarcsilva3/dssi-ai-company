# Build portable app/starter.db on Windows (no Docker). Ship in the tar for server compose build.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$App = Join-Path $Root 'app'
Set-Location $App

if (-not (Test-Path 'node_modules\drizzle-orm')) {
  Write-Host 'Installing app dependencies…'
  npm ci
}

Remove-Item -Force -ErrorAction SilentlyContinue starter.db
$env:DATABASE_PATH = Join-Path $App 'starter.db'
npm run db:setup
npm run db:seed

if (-not (Test-Path starter.db) -or (Get-Item starter.db).Length -eq 0) {
  throw 'starter.db missing or empty after seed.'
}

Write-Host "OK: $App\starter.db ($((Get-Item starter.db).Length) bytes)"