<#
.SYNOPSIS
    KubePulse CloudOps Platform - Windows PowerShell DevOps Tool
.DESCRIPTION
    Streamlined control script for local build, test, orchestration, and metrics simulation.
.EXAMPLE
    .\scripts\devops.ps1 up
    .\scripts\devops.ps1 simulate
    .\scripts\devops.ps1 status
#>

param (
    [Parameter(Position=0)]
    [ValidateSet("help", "up", "down", "restart", "status", "logs", "simulate", "test", "clean")]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "===========================================================" -ForegroundColor Cyan
    Write-Host "KubePulse CloudOps Platform - PowerShell Automation" -ForegroundColor Cyan
    Write-Host "===========================================================" -ForegroundColor Cyan
    Write-Host "Commands:"
    Write-Host "  up        Start 3-tier production stack locally (MongoDB, Backend, Frontend)" -ForegroundColor Green
    Write-Host "  down      Stop all running containers" -ForegroundColor Yellow
    Write-Host "  restart   Restart all containers" -ForegroundColor Yellow
    Write-Host "  status    Show container status and port mappings" -ForegroundColor Green
    Write-Host "  logs      Tail real-time logs from all services" -ForegroundColor White
    Write-Host "  simulate  Generate load and metrics for Prometheus & UI" -ForegroundColor Magenta
    Write-Host "  test      Run backend test suite" -ForegroundColor Green
    Write-Host "  clean     Tear down containers and remove persistent volumes" -ForegroundColor Red
}

switch ($Command) {
    "up" {
        Write-Host "`nStarting KubePulse 3-Tier Architecture..." -ForegroundColor Cyan
        docker compose up -d
        Write-Host "`nDashboard live at: http://localhost:3000" -ForegroundColor Green
        Write-Host "API live at:       http://localhost:5050" -ForegroundColor Green
        Write-Host "Metrics live at:   http://localhost:5050/metrics" -ForegroundColor Green
    }
    "down" {
        Write-Host "`nStopping KubePulse..." -ForegroundColor Yellow
        docker compose down
    }
    "restart" {
        Write-Host "`nRestarting KubePulse..." -ForegroundColor Yellow
        docker compose restart
    }
    "status" {
        docker compose ps
    }
    "logs" {
        docker compose logs -f
    }
    "simulate" {
        node "$PSScriptRoot\simulate-traffic.js"
    }
    "test" {
        Push-Location "$PSScriptRoot\..\backend"
        npm test
        Pop-Location
    }
    "clean" {
        Write-Host "`nCleaning KubePulse containers and volumes..." -ForegroundColor Red
        docker compose down -v --remove-orphans
    }
    Default {
        Show-Help
    }
}
