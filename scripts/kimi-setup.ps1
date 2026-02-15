# ============================================================================
# CreditorFlow - Kimi CLI Setup Script
# ============================================================================
# This script prepares the file manifest for Kimi CLI processing
# Run this in PowerShell before using Kimi CLI
# ============================================================================

param(
    [switch]$CreateManifest,
    [switch]$ValidateSchema,
    [switch]$CheckDependencies,
    [switch]$All
)

$projectRoot = "C:\Users\solomon\creditorflow-system"
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CreditorFlow - Kimi CLI Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to project directory
Set-Location $projectRoot

# Function: Create File Manifest
function Create-FileManifest {
    Write-Host "Creating file manifest for Kimi..." -ForegroundColor Yellow
    
    $manifestFile = "$projectRoot\kimi-manifest.txt"
    $schemaFile = "$projectRoot\kimi-schema.txt"
    
    # Create manifest
    "=== CREDITORFLOW FILE MANIFEST ===" | Out-File $manifestFile
    "Generated: $(Get-Date)" | Out-File $manifestFile -Append
    "" | Out-File $manifestFile -Append
    
    # Dashboard files
    "=== DASHBOARD FILES ===" | Out-File $manifestFile -Append
    Get-ChildItem -Path "$projectRoot\src\app\dashboard" -Recurse -File | 
        Select-Object -ExpandProperty FullName |
        Out-File $manifestFile -Append
    
    # Components
    "" | Out-File $manifestFile -Append
    "=== COMPONENT FILES ===" | Out-File $manifestFile -Append
    Get-ChildItem -Path "$projectRoot\src\components" -Recurse -File | 
        Select-Object -ExpandProperty FullName |
        Out-File $manifestFile -Append
    
    # API routes
    "" | Out-File $manifestFile -Append
    "=== API ROUTE FILES ===" | Out-File $manifestFile -Append
    Get-ChildItem -Path "$projectRoot\src\app\api" -Recurse -File | 
        Select-Object -ExpandProperty FullName |
        Out-File $manifestFile -Append
    
    # Lib files
    "" | Out-File $manifestFile -Append
    "=== LIBRARY FILES ===" | Out-File $manifestFile -Append
    Get-ChildItem -Path "$projectRoot\src\lib" -Recurse -File | 
        Select-Object -ExpandProperty FullName |
        Out-File $manifestFile -Append
    
    Write-Host "✅ File manifest created: kimi-manifest.txt" -ForegroundColor Green
    
    # Export schema
    Write-Host "Exporting Prisma schema..." -ForegroundColor Yellow
    if (Test-Path "$projectRoot\prisma\schema.prisma") {
        Get-Content "$projectRoot\prisma\schema.prisma" | Out-File $schemaFile
        Write-Host "✅ Schema exported: kimi-schema.txt" -ForegroundColor Green
    } else {
        Write-Host "❌ Schema file not found!" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Manifest Statistics:" -ForegroundColor Cyan
    Write-Host "  - Dashboard files: $((Get-ChildItem "$projectRoot\src\app\dashboard" -Recurse -File).Count)"
    Write-Host "  - Component files: $((Get-ChildItem "$projectRoot\src\components" -Recurse -File).Count)"
    Write-Host "  - API routes: $((Get-ChildItem "$projectRoot\src\app\api" -Recurse -File).Count)"
    Write-Host "  - Lib files: $((Get-ChildItem "$projectRoot\src\lib" -Recurse -File).Count)"
}

# Function: Validate Schema
function Validate-Schema {
    Write-Host "Validating Prisma schema..." -ForegroundColor Yellow
    
    try {
        npx prisma validate
        Write-Host "✅ Schema validation passed!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Schema validation failed!" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

# Function: Check Dependencies
function Check-Dependencies {
    Write-Host "Checking required dependencies..." -ForegroundColor Yellow
    
    $required = @(
        "react-dropzone",
        "react-pdf",
        "date-fns",
        "recharts",
        "@radix-ui/react-tabs",
        "tesseract.js",
        "pdf-parse",
        "uuid",
        "lodash",
        "zod"
    )
    
    $packageJson = Get-Content "$projectRoot\package.json" | ConvertFrom-Json
    $installed = @()
    $missing = @()
    
    foreach ($dep in $required) {
        if ($packageJson.dependencies.$dep -or $packageJson.devDependencies.$dep) {
            $installed += $dep
        } else {
            $missing += $dep
        }
    }
    
    Write-Host ""
    Write-Host "Installed dependencies:" -ForegroundColor Green
    $installed | ForEach-Object { Write-Host "  ✓ $_" }
    
    if ($missing.Count -gt 0) {
        Write-Host ""
        Write-Host "Missing dependencies:" -ForegroundColor Red
        $missing | ForEach-Object { Write-Host "  ✗ $_" }
        Write-Host ""
        Write-Host "Install missing dependencies with:" -ForegroundColor Yellow
        Write-Host "npm install $($missing -join ' ')" -ForegroundColor Cyan
    }
}

# Execute based on parameters
if ($All) {
    Create-FileManifest
    Validate-Schema
    Check-Dependencies
} else {
    if ($CreateManifest) { Create-FileManifest }
    if ($ValidateSchema) { Validate-Schema }
    if ($CheckDependencies) { Check-Dependencies }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
