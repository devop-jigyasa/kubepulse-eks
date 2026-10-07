# ==============================================================
# KubePulse Local Development & Health Verification Script (PowerShell)
# ==============================================================

Write-Host "🚀 Starting KubePulse 3-Tier Stack locally via Docker Compose..." -ForegroundColor Cyan
docker compose up -d --build

Write-Host "⏳ Waiting for backend and database to become ready..." -ForegroundColor Yellow
$retryCount = 0
$maxRetries = 15
$ready = $false

while (-not $ready -and $retryCount -lt $maxRetries) {
    Start-Sleep -Seconds 2
    $retryCount++
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/readyz" -Method Get -ErrorAction SilentlyContinue
        if ($response.status -eq "ready") {
            $ready = $true
        }
    } catch {
        Write-Host "   Waiting for /readyz... ($retryCount/$maxRetries)"
    }
}

if (-not $ready) {
    Write-Host "❌ Health check timed out." -ForegroundColor Red
    docker compose logs
    exit 1
}

Write-Host "✅ Backend & Database are HEALTHY!" -ForegroundColor Green

Write-Host "🧪 Running API verification tests..." -ForegroundColor Cyan
$body = @{
    task = "Verification Test Task"
    category = "CI/CD Pipeline"
    priority = "High"
} | ConvertTo-Json

$postResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/tasks" -Method Post -Body $body -ContentType "application/json"
Write-Host "   Created task: $($postResponse.task)" -ForegroundColor Green

$tasks = Invoke-RestMethod -Uri "http://localhost:8080/api/tasks" -Method Get
Write-Host "   Active tasks count: $($tasks.Count)" -ForegroundColor Green

Write-Host "`n🎉 Local verification completed successfully!" -ForegroundColor Green
Write-Host "👉 Frontend: http://localhost:3000"
Write-Host "👉 Backend API: http://localhost:8080"
