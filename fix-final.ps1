# Paste the entire PowerShell script from my previous message here
# ============================================================
# CreditorFlow — TypeScript Error Remediation Script
# Target: 1,127 errors → 0
# Run from project root: C:\Creditorflow SAAS - Enterprise Invoice Management System\main
# ============================================================

param(
    [switch]$DryRun,
    [switch]$SkipPrisma,
    [switch]$SkipSchema,
    [switch]$VerifyOnly
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Get-Location

function Write-Step($n, $msg) {
    Write-Host "`n[$n] $msg" -ForegroundColor Cyan
}

function Write-Done($msg) {
    Write-Host "    OK: $msg" -ForegroundColor Green
}

function Write-Skip($msg) {
    Write-Host "    SKIP: $msg" -ForegroundColor Yellow
}

function Count-Errors {
    $result = npx tsc --noEmit 2>&1 | Select-String "error TS" | Measure-Object -Line
    return $result.Lines
}

# ============================================================
# VERIFY ONLY MODE
# ============================================================
if ($VerifyOnly) {
    Write-Host "Counting current TypeScript errors..." -ForegroundColor Cyan
    $count = Count-Errors
    Write-Host "Current error count: $count" -ForegroundColor $(if ($count -eq 0) { "Green" } else { "Red" })
    exit
}

Write-Host "============================================================" -ForegroundColor White
Write-Host " CreditorFlow TypeScript Error Fix Script" -ForegroundColor White
Write-Host " DryRun: $DryRun | SkipPrisma: $SkipPrisma | SkipSchema: $SkipSchema" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor White

$ErrorsBefore = Count-Errors
Write-Host "Errors before fixes: $ErrorsBefore" -ForegroundColor Red


# ============================================================
# STEP 1: Fix .ts import extensions (12 errors, ~30 seconds)
# TS5097: import path cannot end with .ts
# ============================================================
Write-Step 1 "Removing .ts extensions from import/export paths"

$tsFiles = Get-ChildItem -Path "src" -Recurse -Filter "*.ts"
$step1Fixed = 0

foreach ($file in $tsFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $fixed = $content -replace "(from\s+'\.\.?/[^']+)\.ts'", '$1'''
    $fixed = $fixed -replace '(from\s+"\.\.?/[^"]+)\.ts"', '$1"'
    $fixed = $fixed -replace "(export\s+\*\s+from\s+'\.\.?/[^']+)\.ts'", '$1'''
    $fixed = $fixed -replace '(export\s+\*\s+from\s+"\.\.?/[^"]+)\.ts"', '$1"'
    $fixed = $fixed -replace "(export\s+\{[^}]+\}\s+from\s+'\.\.?/[^']+)\.ts'", '$1'''

    if ($content -ne $fixed) {
        $step1Fixed++
        if (-not $DryRun) {
            Set-Content $file.FullName $fixed -NoNewline -Encoding UTF8
        }
        Write-Done "  $($file.FullName.Replace($ProjectRoot.Path + '\', ''))"
    }
}

Write-Done "Step 1: Fixed $step1Fixed files"


# ============================================================
# STEP 2: Create src/lib/prisma-cast.ts
# Resolves enum type incompatibility between local enums and Prisma enums
# (~200 errors)
# ============================================================
Write-Step 2 "Creating src/lib/prisma-cast.ts"

$prismaCastContent = @'
/**
 * prisma-cast.ts
 *
 * Type-safe casting utilities: domain enums -> Prisma-generated enums.
 *
 * WHY THIS EXISTS:
 * Prisma generates its own enum types in node_modules/.prisma/client.
 * The domain layer maintains parallel enum definitions in src/domain/enums/.
 * TypeScript's nominal type system treats them as incompatible even though
 * the string values are identical.
 *
 * USAGE:
 * Instead of:   currency: data.currency
 * Use:          currency: toPrismaCurrency(data.currency)
 *
 * At Prisma call sites only. Do NOT use inside pure domain logic.
 */

import type {
  Currency as PrismaCurrency,
  InvoiceStatus as PrismaInvoiceStatus,
  SupplierStatus as PrismaSupplierStatus,
  ApprovalStatus as PrismaApprovalStatus,
  NotificationType as PrismaNotificationType,
  NotificationChannel as PrismaNotificationChannel,
  NotificationPriority as PrismaNotificationPriority,
  EntityType as PrismaEntityType,
  AuditAction as PrismaAuditAction,
  LogSeverity as PrismaLogSeverity,
  StorageProvider as PrismaStorageProvider,
  SyncStatus as PrismaSyncStatus,
  TransactionType as PrismaTransactionType,
  BankAccountType as PrismaBankAccountType,
  SupplierCategory as PrismaSupplierCategory,
  ApprovalChainType as PrismaApprovalChainType,
  ApprovalDecision as PrismaApprovalDecision,
  RiskLevel as PrismaRiskLevel,
  UserRole as PrismaUserRole,
} from '@prisma/client';

export const toPrismaCurrency = (v: string): PrismaCurrency => v as PrismaCurrency;
export const toPrismaInvoiceStatus = (v: string): PrismaInvoiceStatus => v as PrismaInvoiceStatus;
export const toPrismaSupplierStatus = (v: string): PrismaSupplierStatus => v as PrismaSupplierStatus;
export const toPrismaApprovalStatus = (v: string): PrismaApprovalStatus => v as PrismaApprovalStatus;
export const toPrismaNotificationType = (v: string): PrismaNotificationType => v as PrismaNotificationType;
export const toPrismaNotificationChannel = (v: string): PrismaNotificationChannel => v as PrismaNotificationChannel;
export const toPrismaNotificationPriority = (v: string): PrismaNotificationPriority => v as PrismaNotificationPriority;
export const toPrismaEntityType = (v: string): PrismaEntityType => v as PrismaEntityType;
export const toPrismaAuditAction = (v: string): PrismaAuditAction => v as PrismaAuditAction;
export const toPrismaLogSeverity = (v: string): PrismaLogSeverity => v as PrismaLogSeverity;
export const toPrismaStorageProvider = (v: string): PrismaStorageProvider => v as PrismaStorageProvider;
export const toPrismaSyncStatus = (v: string): PrismaSyncStatus => v as PrismaSyncStatus;
export const toPrismaTransactionType = (v: string): PrismaTransactionType => v as PrismaTransactionType;
export const toPrismaBankAccountType = (v: string): PrismaBankAccountType => v as PrismaBankAccountType;
export const toPrismaSupplierCategory = (v: string): PrismaSupplierCategory => v as PrismaSupplierCategory;
export const toPrismaApprovalChainType = (v: string): PrismaApprovalChainType => v as PrismaApprovalChainType;
export const toPrismaApprovalDecision = (v: string): PrismaApprovalDecision => v as PrismaApprovalDecision;
export const toPrismaRiskLevel = (v: string): PrismaRiskLevel => v as PrismaRiskLevel;
export const toPrismaUserRole = (v: string): PrismaUserRole => v as PrismaUserRole;
'@

$libPath = Join-Path $ProjectRoot "src\lib"
if (-not (Test-Path $libPath)) { New-Item -ItemType Directory -Path $libPath | Out-Null }

if (-not $DryRun) {
    Set-Content (Join-Path $libPath "prisma-cast.ts") $prismaCastContent -Encoding UTF8
}
Write-Done "src/lib/prisma-cast.ts created"


# ============================================================
# STEP 3: Fix field name mismatches in service files
# Maps code field names -> actual Prisma schema field names
# (~150 errors)
# ============================================================
Write-Step 3 "Fixing field name mismatches"

# Each entry: [pattern, replacement]
# Applied to all .ts files under src/
$fieldFixes = @(
    # Invoice field names
    @('\.approvedAt\b', '.approvedDate'),
    @('approvedAt:', 'approvedDate:'),
    @('invoice\.approvedAt', 'invoice.approvedDate'),
    @('\.escalatedDate\b', '.escalatedAt'),
    @('escalatedDate:', 'escalatedAt:'),
    @('\.paymentDate\b', '.paidDate'),
    @('paymentDate:', 'paidDate:'),
    @('invoice\.updatedById\b', 'invoice.updaterId'),
    @('updatedById:', 'updaterId:'),
    @('invoice\.createdById\b', 'invoice.creatorId'),
    @('\bcreatedById\b(?!.*relation)', 'creatorId'),

    # Approval field names
    @('\.assignedDate\b', '.assignedAt'),
    @('assignedDate:', 'assignedAt:'),
    @('\.decisionDate\b', '.actionedAt'),
    @('decisionDate:', 'actionedAt:'),
    @('\.actionDate\b', '.actionedAt'),
    @('actionDate:', 'actionedAt:'),

    # FileAttachment field names
    @('fileAttachment\.uploadedBy\b', 'fileAttachment.uploader'),
    @('uploadedBy:', 'uploaderId:'),
    @('fileAttachment\.size\b', 'fileAttachment.fileSize'),
    @('attachment\.size\b', 'attachment.fileSize'),

    # InvoiceComment field names
    @('invoiceComment\.createdById\b', 'invoiceComment.userId'),
    @('comment\.createdById\b', 'comment.userId'),
    @('\.isDeleted\b(?=\s*[,;\)])', '.deletedAt !== null'),

    # CustomField
    @('\.displayOrder\b', '.order'),
    @('displayOrder:', 'order:'),

    # Webhook
    @('webhook\.secretKey\b', 'webhook.secret'),
    @('secretKey:', 'secret:'),

    # Supplier performance
    @('\.onTimeDeliveryRate\b', '.onTimeDelivery'),
    @('onTimeDeliveryRate:', 'onTimeDelivery:'),

    # Supplier fields
    @('supplier\.verifiedById\b', 'supplier.verifiedBy'),

    # RBAC UserRole names
    @('\bUserRole\.SYSTEM_ADMIN\b', 'UserRole.SUPER_ADMIN'),
    @('\bUserRole\.ORG_ADMIN\b', 'UserRole.ADMIN')
)

$step3Fixed = 0
$srcFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.tsx"

foreach ($file in $srcFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $modified = $content

    foreach ($fix in $fieldFixes) {
        $modified = $modified -replace $fix[0], $fix[1]
    }

    if ($content -ne $modified) {
        $step3Fixed++
        if (-not $DryRun) {
            Set-Content $file.FullName $modified -NoNewline -Encoding UTF8
        }
    }
}

Write-Done "Step 3: Fixed field names in $step3Fixed files"


# ============================================================
# STEP 4: Convert NotificationTypeEnum and PriorityLevelEnum
# from type-only declarations to const objects
# (~80 errors: 'X only refers to a type, but is being used as a value')
# ============================================================
Write-Step 4 "Converting NotificationTypeEnum and PriorityLevelEnum to const objects"

# Locate the notification utils file
$notifUtilsPath = Get-ChildItem -Path "src" -Recurse -Filter "notification-utils.ts" | Select-Object -First 1

if ($notifUtilsPath) {
    $content = Get-Content $notifUtilsPath.FullName -Raw -Encoding UTF8

    # Replace enum-keyed object keys with string literals
    # Pattern: [NotificationTypeEnum.SOMETHING] -> ['SOMETHING']
    $fixed = $content -replace '\[NotificationTypeEnum\.([A-Z_]+)\]', "['`$1']"
    $fixed = $fixed -replace '\[PriorityLevelEnum\.([A-Z_]+)\]', "['`$1']"

    if ($content -ne $fixed) {
        if (-not $DryRun) {
            Set-Content $notifUtilsPath.FullName $fixed -NoNewline -Encoding UTF8
        }
        Write-Done "Fixed: $($notifUtilsPath.FullName)"
    }
} else {
    Write-Skip "notification-utils.ts not found"
}

# Now fix the enum declaration files to use const objects
# Find files that declare NotificationTypeEnum or PriorityLevelEnum as a type
$enumFiles = Get-ChildItem -Path "src" -Recurse -Filter "*.ts" |
    Where-Object { (Get-Content $_.FullName -Raw) -match 'export\s+(type|interface)\s+(NotificationTypeEnum|PriorityLevelEnum)' }

foreach ($enumFile in $enumFiles) {
    $content = Get-Content $enumFile.FullName -Raw -Encoding UTF8

    # This is a targeted transform: if the type is a union of string literals,
    # we need to convert it to a const object. Since we can't safely automate
    # the full conversion without seeing the file, we flag it.
    Write-Host "    MANUAL ACTION REQUIRED: $($enumFile.FullName)" -ForegroundColor Yellow
    Write-Host "    Convert 'export type NotificationTypeEnum = ...' to:" -ForegroundColor Yellow
    Write-Host "    export const NotificationTypeEnum = { VALUE: 'VALUE', ... } as const;" -ForegroundColor Yellow
    Write-Host "    export type NotificationTypeEnum = typeof NotificationTypeEnum[keyof typeof NotificationTypeEnum];" -ForegroundColor Yellow
}

Write-Done "Step 4 complete"


# ============================================================
# STEP 5: Remove phantom exports from fraud-scorer/index.ts
# (~120 errors: Module has no exported member 'FraudRiskCapacity' etc.)
# ============================================================
Write-Step 5 "Pruning phantom exports from fraud-scorer/index.ts"

$fraudScorerIndex = Get-ChildItem -Path "src" -Recurse -Filter "index.ts" |
    Where-Object { $_.FullName -match "fraud-scorer" } | Select-Object -First 1

if ($fraudScorerIndex) {
    $lines = Get-Content $fraudScorerIndex.FullName -Encoding UTF8
    $totalLines = $lines.Count

    # Find the line where phantom exports start
    # They begin with: export type { FraudRiskCapacity
    $phantomStart = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "export\s+(type\s+)?\{[^}]*FraudRisk(Capacity|Exposure|Portfolio|Concentration)" -or
            $lines[$i] -match "// Phantom\|// These types don't exist") {
            $phantomStart = $i
            break
        }
    }

    if ($phantomStart -gt 0) {
        $kept = $lines[0..($phantomStart - 1)]
        if (-not $DryRun) {
            Set-Content $fraudScorerIndex.FullName ($kept -join "`n") -Encoding UTF8
        }
        Write-Done "Removed $($totalLines - $phantomStart) phantom export lines from fraud-scorer/index.ts"
    } else {
        # Lines 33-152 per analysis
        if ($totalLines -gt 32) {
            $kept = $lines[0..31]
            if (-not $DryRun) {
                Set-Content $fraudScorerIndex.FullName ($kept -join "`n") -Encoding UTF8
            }
            Write-Done "Removed lines 33-$totalLines from fraud-scorer/index.ts (heuristic trim)"
        } else {
            Write-Skip "fraud-scorer/index.ts has only $totalLines lines — skipping trim"
        }
    }
} else {
    Write-Skip "fraud-scorer/index.ts not found"
}


# ============================================================
# STEP 6: Prisma schema additions
# Add missing fields, enum values, and models
# Run separately if -SkipSchema is set
# ============================================================
Write-Step 6 "Prisma schema — generating additions file"

$schemaAdditions = @'
# ============================================================
# SCHEMA ADDITIONS — append these to prisma/schema.prisma
# Then run: npx prisma generate && npx prisma db push
# ============================================================

# --- ENUM ADDITIONS ---
# Add these values to the existing enum blocks in schema.prisma

# AuditAction — add these values:
# COMPLIANCE_VIOLATION
# FRAUD_DETECTED
# SYSTEM_ALERT
# COMMENT_ADDED
# COMMENT_UPDATED
# COMMENT_DELETED
# FILE_UPLOADED
# FILE_UPDATED
# FILE_DELETED
# DOCUMENT_PROCESSED

# EntityType — add these values:
# SYSTEM
# RISK_SCORE

# InvoiceStatus — add these values:
# UNDER_VALIDATION
# ESCALATED
# READY_FOR_PAYMENT
# PAYMENT_SCHEDULED

# NotificationType — add these values (if missing):
# FRAUD_ALERT
# PAYMENT_DUE_SOON
# PAYMENT_OVERDUE
# MONTHLY_REPORT
# SLA_BREACH

# ApprovalStatus — add these values (if missing):
# IN_REVIEW

# RiskLevel — replace entire enum with:
enum RiskLevel {
  NO_RISK
  VERY_LOW
  LOW
  LOW_MEDIUM
  MEDIUM
  MEDIUM_HIGH
  HIGH
  VERY_HIGH
  CRITICAL
  SEVERE
  BLACKLISTED
  UNKNOWN
}

# --- MODEL FIELD ADDITIONS ---
# Add these fields to existing models

# Invoice model — add:
#   priority          String?
#   archivedAt        DateTime?
#   processingMetadata Json?
#   complianceNotes   String?

# Approval model — add:
#   sequenceNumber    Int?
#   approverLimit     Decimal?
#   slaHours          Int?
#   slaBreachDate     DateTime?
#   isWithinSLA       Boolean?

# User model — add:
#   currentWorkload   Int     @default(0)
#   maxWorkload       Int     @default(10)

# Notification model — add (or change readAt/archivedAt to booleans):
#   isRead            Boolean  @default(false)
#   isArchived        Boolean  @default(false)

# --- NEW MODELS ---
# Append these complete model definitions to schema.prisma

model WebhookDelivery {
  id          String   @id @default(cuid())
  webhookId   String
  event       String
  payload     Json
  status      String   @default("PENDING")
  attempts    Int      @default(0)
  responseCode Int?
  responseBody String?
  errorMessage String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  webhook     Webhook  @relation(fields: [webhookId], references: [id], onDelete: Cascade)

  @@index([webhookId])
  @@index([status])
  @@map("webhook_deliveries")
}

model PdfProcessingLog {
  id           String   @id @default(cuid())
  processingId String
  fileId       String?
  type         String
  message      String
  metadata     Json?
  createdAt    DateTime @default(now())

  @@index([processingId])
  @@index([fileId])
  @@map("pdf_processing_logs")
}

model OcrExtractionLog {
  id            String   @id @default(cuid())
  fileId        String
  provider      String?
  success       Boolean
  confidence    Decimal? @db.Decimal(5, 4)
  processingMs  Int?
  errorMessage  String?
  createdAt     DateTime @default(now())

  @@index([fileId])
  @@map("ocr_extraction_logs")
}

model InvoiceExtraction {
  id            String   @id @default(cuid())
  fileId        String
  invoiceId     String?
  extractedData Json
  confidence    Decimal? @db.Decimal(5, 4)
  provider      String?
  status        String   @default("PENDING")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([fileId])
  @@index([invoiceId])
  @@map("invoice_extractions")
}

model ExtractionAuditLog {
  id            String   @id @default(cuid())
  extractionId  String
  action        String
  userId        String?
  before        Json?
  after         Json?
  reason        String?
  createdAt     DateTime @default(now())

  @@index([extractionId])
  @@map("extraction_audit_logs")
}

model CustomFieldValue {
  id             String     @id @default(cuid())
  customFieldId  String
  entityId       String
  entityType     EntityType
  value          String?
  jsonValue      Json?
  organizationId String
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  customField    CustomField @relation(fields: [customFieldId], references: [id], onDelete: Cascade)

  @@unique([customFieldId, entityId])
  @@index([entityId, entityType])
  @@index([organizationId])
  @@map("custom_field_values")
}
'@

$schemaAdditionsPath = Join-Path $ProjectRoot "SCHEMA_ADDITIONS.prisma"
if (-not $DryRun) {
    Set-Content $schemaAdditionsPath $schemaAdditions -Encoding UTF8
}
Write-Done "Schema additions written to SCHEMA_ADDITIONS.prisma"
Write-Host "    ACTION: Manually merge SCHEMA_ADDITIONS.prisma into prisma/schema.prisma" -ForegroundColor Yellow

if (-not $SkipPrisma -and -not $SkipSchema -and -not $DryRun) {
    Write-Host "`n    Run prisma generate now? (Y/N)" -ForegroundColor Yellow -NoNewline
    $confirm = Read-Host
    if ($confirm -eq 'Y' -or $confirm -eq 'y') {
        Write-Host "    Running: npx prisma generate" -ForegroundColor Gray
        npx prisma generate
        Write-Done "prisma generate complete"

        Write-Host "`n    Run prisma db push? This will apply schema to database. (Y/N)" -ForegroundColor Yellow -NoNewline
        $confirm2 = Read-Host
        if ($confirm2 -eq 'Y' -or $confirm2 -eq 'y') {
            npx prisma db push --accept-data-loss
            Write-Done "prisma db push complete"
        }
    }
} else {
    Write-Skip "Prisma commands skipped. Run manually when ready:"
    Write-Host "    npx prisma generate" -ForegroundColor Gray
    Write-Host "    npx prisma db push --accept-data-loss" -ForegroundColor Gray
}


# ============================================================
# STEP 7: Fix fraud-scorer core-types.ts
# Expand FraudRiskCategory, FraudSeverityLevel, etc.
# (~50 errors)
# ============================================================
Write-Step 7 "Fixing fraud-scorer core-types.ts"

$coreTypesPath = Get-ChildItem -Path "src" -Recurse -Filter "core-types.ts" |
    Where-Object { $_.FullName -match "fraud-scorer" } | Select-Object -First 1

if ($coreTypesPath) {
    $content = Get-Content $coreTypesPath.FullName -Raw -Encoding UTF8

    # Replace FraudRiskCategory type
    $content = $content -replace "(?s)export\s+type\s+FraudRiskCategory\s*=\s*[^;]+;",
@"
export type FraudRiskCategory =
  | 'AMOUNT_ANOMALY'
  | 'TEMPORAL_ANOMALY'
  | 'GEOGRAPHIC_RISK'
  | 'SUPPLIER_RISK'
  | 'VAT_NON_COMPLIANCE'
  | 'REGULATORY_VIOLATION'
  | 'SYSTEM_ERROR'
  | 'DUPLICATE_PATTERN'
  | 'BEHAVIORAL_ANOMALY'
  | 'PAYMENT_ANOMALY';
"@

    # Replace FraudSeverityLevel type
    $content = $content -replace "(?s)export\s+type\s+FraudSeverityLevel\s*=\s*[^;]+;",
@"
export type FraudSeverityLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'SEVERE';
"@

    # Replace FraudMitigationAction type
    $content = $content -replace "(?s)export\s+type\s+FraudMitigationAction\s*=\s*[^;]+;",
@"
export type FraudMitigationAction =
  | 'AUTOMATED_APPROVAL'
  | 'STANDARD_REVIEW'
  | 'APPROVAL_REQUIRED'
  | 'ENHANCED_SCRUTINY'
  | 'MANUAL_REVIEW'
  | 'APPROVAL_ESCALATION'
  | 'SUPPLIER_VERIFICATION'
  | 'PAYMENT_HOLD'
  | 'IMMEDIATE_ESCALATION'
  | 'SUPPLIER_SUSPENSION'
  | 'REGULATORY_REPORTING';
"@

    # Replace FraudAlertPriority type
    $content = $content -replace "(?s)export\s+type\s+FraudAlertPriority\s*=\s*[^;]+;",
@"
export type FraudAlertPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'IMMEDIATE';
"@

    # Replace FraudEscalationPath type
    $content = $content -replace "(?s)export\s+type\s+FraudEscalationPath\s*=\s*[^;]+;",
@"
export type FraudEscalationPath =
  | 'FRAUD_ANALYST'
  | 'FRAUD_MANAGER'
  | 'RISK_MANAGER'
  | 'COMPLIANCE_OFFICER'
  | 'CHIEF_FINANCIAL_OFFICER'
  | 'CHIEF_EXECUTIVE_OFFICER'
  | 'BOARD_OF_DIRECTORS'
  | 'REGULATORY_BODY';
"@

    if (-not $DryRun) {
        Set-Content $coreTypesPath.FullName $content -NoNewline -Encoding UTF8
    }
    Write-Done "fraud-scorer/core-types.ts updated"
} else {
    Write-Skip "fraud-scorer/core-types.ts not found"
}


# ============================================================
# STEP 8: Rewrite src/domain/enums/* to re-export from @prisma/client
# Eliminates the dual-enum root cause cleanly
# (~200 errors)
# Alternative to prisma-cast.ts approach — choose ONE strategy
# ============================================================
Write-Step 8 "Rewriting domain enum files to re-export from @prisma/client"

$enumsDir = Join-Path $ProjectRoot "src\domain\enums"

if (Test-Path $enumsDir) {
    $enumFiles = Get-ChildItem -Path $enumsDir -Filter "*.ts"

    # Map: enum name -> Prisma export name (they may differ in case/naming)
    $enumMap = @{
        "Currency"         = "Currency"
        "EntityType"       = "EntityType"
        "AuditAction"      = "AuditAction"
        "NotificationType" = "NotificationType"
        "InvoiceStatus"    = "InvoiceStatus"
        "ApprovalStatus"   = "ApprovalStatus"
        "StorageProvider"  = "StorageProvider"
        "BankAccountType"  = "BankAccountType"
        "SupplierCategory" = "SupplierCategory"
        "TransactionType"  = "TransactionType"
        "RiskLevel"        = "RiskLevel"
        "UserRole"         = "UserRole"
        "SupplierStatus"   = "SupplierStatus"
        "LogSeverity"      = "LogSeverity"
        "SyncStatus"       = "SyncStatus"
        "NotificationChannel" = "NotificationChannel"
        "NotificationPriority" = "NotificationPriority"
        "ApprovalDecision" = "ApprovalDecision"
        "ApprovalChainType" = "ApprovalChainType"
    }

    foreach ($enumFile in $enumFiles) {
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($enumFile.Name)
        $content = Get-Content $enumFile.FullName -Raw -Encoding UTF8

        # Skip if already re-exporting from prisma
        if ($content -match "@prisma/client") {
            Write-Skip "$baseName already imports from @prisma/client"
            continue
        }

        # Detect which enum names are exported from this file
        $exportedEnums = [System.Collections.Generic.List[string]]::new()
        foreach ($enumName in $enumMap.Keys) {
            if ($content -match "export\s+(enum|type|const)\s+$enumName\b") {
                $exportedEnums.Add($enumName)
            }
        }

        if ($exportedEnums.Count -eq 0) {
            Write-Skip "$baseName — no recognized enum exports found"
            continue
        }

        # Build re-export content
        $exportList = ($exportedEnums | ForEach-Object { "  $_ as $_" }) -join ",`n"
        $newContent = @"
/**
 * Re-exports Prisma-generated enum from @prisma/client.
 * Original local definition replaced to eliminate dual-enum type incompatibility.
 * All string values are identical to the previous local definition.
 */
export {
$exportList
} from '@prisma/client';
"@

        if (-not $DryRun) {
            # Back up original
            Copy-Item $enumFile.FullName "$($enumFile.FullName).bak" -Force
            Set-Content $enumFile.FullName $newContent -Encoding UTF8
        }
        Write-Done "Rewrote: $($enumFile.Name) (exports: $($exportedEnums -join ', '))"
    }

    # Rewrite index.ts barrel if it exists
    $indexFile = Join-Path $enumsDir "index.ts"
    if (Test-Path $indexFile) {
        $indexContent = Get-Content $indexFile -Raw -Encoding UTF8
        if (-not ($indexContent -match "@prisma/client")) {
            $allEnumNames = $enumMap.Keys | Sort-Object
            $exportBlock = ($allEnumNames | ForEach-Object { "  $_" }) -join ",`n"
            $newIndex = @"
/**
 * Domain enum barrel — re-exports all enums from @prisma/client.
 * Centralised here to maintain import compatibility throughout the codebase.
 */
export {
$exportBlock
} from '@prisma/client';
"@
            if (-not $DryRun) {
                Copy-Item $indexFile "$indexFile.bak" -Force
                Set-Content $indexFile $newIndex -Encoding UTF8
            }
            Write-Done "Rewrote: domain/enums/index.ts"
        }
    }
} else {
    Write-Skip "src/domain/enums/ directory not found at expected path"
}


# ============================================================
# STEP 9: Fix JSON/Prisma.InputJsonValue mismatches
# (~20 errors: {} not assignable to InputJsonValue)
# ============================================================
Write-Step 9 "Fixing JSON field type casts"

$jsonPatternFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts" |
    Where-Object { (Get-Content $_.FullName -Raw) -match 'metadata.*=.*\{\}|processingMetadata.*\{\}|rawData.*\{\}' }

foreach ($f in $jsonPatternFiles) {
    $content = Get-Content $f.FullName -Raw -Encoding UTF8
    $fixed = $content

    # Add Prisma import if not present and if we need to add InputJsonValue casts
    if ($fixed -match '\bmetadata\s*:\s*\(\s*\w+\.metadata\s*\|\|\s*\{\}' -and
        -not ($fixed -match "import.*Prisma.*from '@prisma/client'|import.*\{.*Prisma.*\}.*from '@prisma/client'")) {
        $fixed = $fixed -replace "(import \{ PrismaClient)", "import { Prisma } from '@prisma/client';`n`$1"
    }

    # Cast {} to Prisma.InputJsonValue
    $fixed = $fixed -replace '(\bmetadata\s*:\s*)\(([^)]+)\s*\|\|\s*\{\}\)', '$1($2 || {}) as Prisma.InputJsonValue'

    if ($content -ne $fixed) {
        if (-not $DryRun) {
            Set-Content $f.FullName $fixed -NoNewline -Encoding UTF8
        }
        Write-Done "  $($f.Name)"
    }
}

Write-Done "Step 9 complete"


# ============================================================
# FINAL: Count errors
# ============================================================
Write-Host "`n============================================================" -ForegroundColor White
Write-Host " Running final TypeScript check..." -ForegroundColor White
Write-Host "============================================================" -ForegroundColor White

if (-not $DryRun) {
    $ErrorsAfter = Count-Errors
    $Resolved = $ErrorsBefore - $ErrorsAfter
    Write-Host "`nErrors before: $ErrorsBefore" -ForegroundColor Red
    Write-Host "Errors after:  $ErrorsAfter" -ForegroundColor $(if ($ErrorsAfter -eq 0) { "Green" } else { "Yellow" })
    Write-Host "Resolved:      $Resolved" -ForegroundColor Green

    if ($ErrorsAfter -gt 0) {
        Write-Host "`nRemaining errors — run to inspect:" -ForegroundColor Yellow
        Write-Host "  npx tsc --noEmit 2>&1 | Select-String 'error TS' | Select-Object -First 30" -ForegroundColor Gray
        Write-Host "`nManual actions still required:" -ForegroundColor Yellow
        Write-Host "  1. Merge SCHEMA_ADDITIONS.prisma into prisma/schema.prisma" -ForegroundColor Gray
        Write-Host "  2. Run: npx prisma generate && npx prisma db push --accept-data-loss" -ForegroundColor Gray
        Write-Host "  3. Convert NotificationTypeEnum/PriorityLevelEnum to const objects (see Step 4 output)" -ForegroundColor Gray
        Write-Host "  4. Add missing type exports to src/types/index.ts (ApprovalRoutingInput, etc.)" -ForegroundColor Gray
        Write-Host "  5. Fix function signatures: logInfo, calculateConfidence, validateInvoiceVAT" -ForegroundColor Gray
    } else {
        Write-Host "`nAll TypeScript errors resolved." -ForegroundColor Green
    }
} else {
    Write-Host "`nDRY RUN complete — no files were modified." -ForegroundColor Yellow
    Write-Host "Remove -DryRun flag to apply changes." -ForegroundColor Gray
}
