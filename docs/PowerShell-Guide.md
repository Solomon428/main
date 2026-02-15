# CreditorFlow PowerShell System Access Guide

**Version:** 4.0  
**Last Updated:** February 4, 2026  
**Project:** CreditorFlow Enterprise Invoice Management System  
**Author:** Intelli Finance (Makwedini AI Group Ltd Pty)

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [Available Actions](#available-actions)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Advanced Features](#advanced-features)

---

## Overview

The `Request-CreditorFlowApproval.ps1` script provides comprehensive command-line access to the CreditorFlow Enterprise Invoice Management System.

### Capabilities

- **Authentication & Session Management** - Secure JWT token-based authentication
- **Invoice Approval Workflows** - Submit, approve, and reject invoices
- **Status Monitoring & Tracking** - Real-time invoice status checking
- **Dashboard & Reporting Access** - View statistics and reports
- **Notification Management** - View system notifications
- **System Health Checks** - Verify API connectivity

### Key Features

| Feature | Description |
|---------|-------------|
| ✅ Secure Authentication | JWT token-based authentication with session persistence |
| ✅ Interactive Confirmations | Prevents accidental approvals/rejections |
| ✅ Comprehensive Logging | Detailed logs for audit trails |
| ✅ Error Handling | Automatic retry logic with graceful degradation |
| ✅ Formatted Output | Color-coded, readable console displays |
| ✅ Session Management | Save and reuse authentication tokens |
| ✅ Custom Headers | Support for custom HTTP headers |

---

## Prerequisites

### System Requirements

| Requirement | Specification |
|-------------|---------------|
| Operating System | Windows 10/11 or Windows Server 2016+ |
| PowerShell Version | 5.1 or higher (PowerShell 7+ recommended) |
| Network Access | HTTP/HTTPS access to CreditorFlow API |
| Permissions | Standard user account (no admin rights required) |

### Check PowerShell Version

```powershell
$PSVersionTable.PSVersion
```

**Expected Output:**
```
Major  Minor  Build  Revision
-----  -----  -----  --------
7      4      0      -1
```

---

## Installation

### Step 1: Download the Script

```powershell
Invoke-WebRequest -Uri "https://your-repo/Request-CreditorFlowApproval.ps1" `
    -OutFile "$env:USERPROFILE\Documents\Request-CreditorFlowApproval.ps1"
```

### Step 2: Set Execution Policy

```powershell
# Check current execution policy
Get-ExecutionPolicy

# Set execution policy (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 3: Verify Installation

```powershell
cd "$env:USERPROFILE\Documents"
Get-Help .\Request-CreditorFlowApproval.ps1 -Full
```

---

## Configuration

### Environment Variables

```powershell
# Set base URL (default: http://localhost:3000)
$env:CREDITORFLOW_URL = "https://creditorflow.company.com"

# Set log directory (default: $env:USERPROFILE\.creditorflow\logs)
$env:CREDITORFLOW_LOG_DIR = "C:\Logs\CreditorFlow"
```

### Configuration File

Create `$env:USERPROFILE\.creditorflow\config.json`:

```json
{
  "baseUrl": "https://creditorflow.company.com",
  "timeoutSeconds": 300,
  "maxRetries": 3,
  "retryDelaySeconds": 2
}
```

---

## Authentication

### Login with Credentials

```powershell
# Interactive login
.\Request-CreditorFlowApproval.ps1 -Action Login

# Direct login with session save
.\Request-CreditorFlowApproval.ps1 `
    -Action Login `
    -Email "john.smith@company.com" `
    -Password "YourSecurePassword" `
    -SaveSession
```

### Using Saved Sessions

```powershell
# Subsequent commands use saved session automatically
.\Request-CreditorFlowApproval.ps1 -Action GetPendingApprovals

# Logout and clear session
.\Request-CreditorFlowApproval.ps1 -Action Logout
```

---

## Available Actions

| Action | Description | Requires Token |
|--------|-------------|----------------|
| `Login` | Authenticate and obtain access token | No |
| `RequestApproval` | Submit invoice for approval | Yes |
| `ApproveInvoice` | Approve a pending invoice | Yes |
| `RejectInvoice` | Reject a pending invoice | Yes |
| `CheckStatus` | Check invoice approval status | Yes |
| `GetPendingApprovals` | List all pending approvals | Yes |
| `GetApprovalHistory` | View approval history | Yes |
| `UploadInvoice` | Upload new invoice PDF | Yes |
| `GetDashboard` | View dashboard statistics | Yes |
| `GetNotifications` | View notifications | Yes |
| `HealthCheck` | Check system health | No |
| `Logout` | Clear saved session | No |

---

## Usage Examples

### Example 1: Login & View Pending Approvals

```powershell
# Login and save session
.\Request-CreditorFlowApproval.ps1 `
    -Action Login `
    -Email "manager@company.com" `
    -Password "SecurePass123" `
    -SaveSession

# View pending approvals
.\Request-CreditorFlowApproval.ps1 -Action GetPendingApprovals
```

### Example 2: Check Invoice Status

```powershell
.\Request-CreditorFlowApproval.ps1 `
    -Action CheckStatus `
    -InvoiceId "550e8400-e29b-41d4-a716-446655440000"
```

### Example 3: Approve an Invoice

```powershell
.\Request-CreditorFlowApproval.ps1 `
    -Action ApproveInvoice `
    -InvoiceId "550e8400-e29b-41d4-a716-446655440000" `
    -Comments "Approved - budget allocated"
```

### Example 4: Reject an Invoice

```powershell
.\Request-CreditorFlowApproval.ps1 `
    -Action RejectInvoice `
    -InvoiceId "6ba7b810-9dad-11d1-80b4-00c04fd430c8" `
    -Comments "Duplicate invoice - already processed"
```

### Example 5: Upload New Invoice

```powershell
.\Request-CreditorFlowApproval.ps1 `
    -Action UploadInvoice `
    -FilePath "C:\Invoices\Invoice-2024-005.pdf"
```

### Example 6: View Dashboard

```powershell
.\Request-CreditorFlowApproval.ps1 -Action GetDashboard
```

### Example 7: System Health Check

```powershell
.\Request-CreditorFlowApproval.ps1 -Action HealthCheck
```

### Example 8: Using Custom Headers

```powershell
$customHeaders = @{
    'X-Request-ID' = [Guid]::NewGuid().ToString()
    'X-Client-Version' = '4.0'
}

.\Request-CreditorFlowApproval.ps1 `
    -Action GetPendingApprovals `
    -CustomHeaders $customHeaders
```

---

## Best Practices

### Security

```powershell
# ❌ BAD - Credentials in script
$email = "user@company.com"
$password = "PlainTextPassword"

# ✅ GOOD - Prompt for credentials
$email = Read-Host "Email"
$securePassword = Read-Host "Password" -AsSecureString
```

### Error Handling

```powershell
try {
    $result = .\Request-CreditorFlowApproval.ps1 `
        -Action ApproveInvoice `
        -InvoiceId "123" `
        -ErrorAction Stop
    
    if ($result.Success) {
        Write-Host "✓ Success" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
```

---

## Troubleshooting

### Issue 1: Execution Policy Error

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue 2: No Authentication Token

**Solution:**
```powershell
.\Request-CreditorFlowApproval.ps1 -Action Login -SaveSession
```

### Issue 3: Connection Timeout

**Solution:**
```powershell
.\Request-CreditorFlowApproval.ps1 `
    -Action GetPendingApprovals `
    -TimeoutSeconds 600
```

---

## Advanced Features

### Export Results to CSV

```powershell
$result = .\Request-CreditorFlowApproval.ps1 -Action GetPendingApprovals
$result.Approvals | Export-Csv -Path "C:\Reports\pending-approvals.csv" -NoTypeInformation
```

### Auto-approve Invoices Under Threshold

```powershell
$result = .\Request-CreditorFlowApproval.ps1 -Action GetPendingApprovals

foreach ($approval in $result.Approvals) {
    $invoice = $approval.invoice
    
    if ($invoice.totalAmount -lt 10000) {
        .\Request-CreditorFlowApproval.ps1 `
            -Action ApproveInvoice `
            -InvoiceId $invoice.id `
            -Comments "Auto-approved (under threshold)"
        
        Start-Sleep -Seconds 2
    }
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v4.0 | 2026-02-04 | Complete rewrite with enhanced features |
| v3.5 | 2025-11-15 | Added batch processing |
| v3.0 | 2025-09-01 | Added session management |
| v2.0 | 2025-06-01 | Initial PowerShell implementation |

---

**END OF GUIDE**
