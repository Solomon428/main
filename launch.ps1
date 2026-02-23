$ErrorActionPreference = "Stop"
Write-Host "🔥 CREDITORFLOW LAUNCH SEQUENCE (NATIVE)" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray

# A. Install Dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing Dependencies..." -ForegroundColor Yellow
    & npm install
}

# B. Database Setup (Docker + Prisma)
Write-Host "🐳 Checking Database..." -ForegroundColor Yellow
if (-not (docker ps -q -f name=creditorflow-db)) {
    Write-Host "   Starting Docker Container..."
    docker rm -f creditorflow-db 2>$null
    docker run -d --name creditorflow-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=creditorflow -p 5432:5432 postgres:15-alpine
    Start-Sleep -Seconds 8
}

# C. Prisma Sync (Using native invocation)
Write-Host "⚡ Syncing Database Schema..." -ForegroundColor Yellow
# We use .cmd extension explicitly for Windows node executables to be safe
if (Get-Command "npx.cmd" -ErrorAction SilentlyContinue) {
    & npx.cmd prisma generate
    & npx.cmd prisma db push --accept-data-loss
} else {
    & npx prisma generate
    & npx prisma db push --accept-data-loss
}

# D. Seed
Write-Host "🌱 Seeding Data..." -ForegroundColor Yellow
if (Get-Command "npx.cmd" -ErrorAction SilentlyContinue) {
    & npx.cmd tsx prisma/seed.ts
} else {
    & npx tsx prisma/seed.ts
}

# E. Launch
Write-Host "`n🚀 SYSTEM READY. STARTING SERVER..." -ForegroundColor Green
Write-Host "   URL:  http://localhost:3000" -ForegroundColor Gray
Write-Host "   User: admin@creditorflow.com" -ForegroundColor Gray
Write-Host "   Pass: password123" -ForegroundColor Gray
& npm run dev
# A. Install Dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing Dependencies..." -ForegroundColor Yellow
    & npm install
}
