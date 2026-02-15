-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE "UserRole" AS ENUM (
    'CREDIT_CLERK',
    'BRANCH_MANAGER',
    'FINANCIAL_MANAGER',
    'EXECUTIVE',
    'GROUP_FINANCIAL_MANAGER',
    'ACCOUNTS_ADMIN',
    'HR_MANAGER',
    'VIEWER'
);

CREATE TYPE "Department" AS ENUM (
    'FINANCE',
    'PROCUREMENT',
    'OPERATIONS',
    'HR',
    'IT',
    'EXECUTIVE',
    'OTHER'
);

CREATE TYPE "AccountType" AS ENUM (
    'CURRENT',
    'SAVINGS',
    'TRANSACTIONAL',
    'FOREIGN'
);

CREATE TYPE "InvoiceStatus" AS ENUM (
    'DRAFT',
    'PENDING_EXTRACTION',
    'EXTRACTION_COMPLETE',
    'UNDER_VALIDATION',
    'VALIDATION_COMPLETE',
    'PENDING_APPROVAL',
    'UNDER_APPROVAL',
    'APPROVED',
    'REJECTED',
    'ESCALATED',
    'ON_HOLD',
    'READY_FOR_PAYMENT',
    'PAYMENT_SCHEDULED',
    'PAID',
    'PARTIALLY_PAID',
    'OVERDUE',
    'DISPUTED',
    'CANCELLED',
    'ARCHIVED',
    'DUPLICATE'
);

CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING_APPROVAL', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED', 'DELEGATED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVE', 'REJECT', 'ESCALATE', 'DELEGATE', 'HOLD', 'REQUEST_INFO');
CREATE TYPE "SupplierStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLACKLISTED', 'UNDER_REVIEW', 'ARCHIVED');
CREATE TYPE "SupplierCategory" AS ENUM ('GOODS', 'SERVICES', 'CONSULTING', 'SOFTWARE', 'MAINTENANCE', 'UTILITIES', 'RENTAL', 'TRAVEL', 'TRAINING', 'CATERING', 'SECURITY', 'CLEANING', 'OTHER');
CREATE TYPE "PaymentMethod" AS ENUM ('EFT', 'CHEQUE', 'CASH', 'CREDIT_CARD', 'DEBIT_ORDER', 'INTERNATIONAL_TRANSFER', 'REAL_TIME_CLEARING');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'ESCALATE', 'DELEGATE', 'VIEW', 'DOWNLOAD', 'EXPORT', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'PERMISSION_CHANGE', 'SYSTEM_ALERT', 'COMPLIANCE_VIOLATION', 'FRAUD_DETECTED');
CREATE TYPE "EntityType" AS ENUM ('INVOICE', 'APPROVAL', 'USER', 'SUPPLIER', 'LINE_ITEM', 'COMMENT', 'ATTACHMENT', 'PAYMENT', 'REPORT', 'SYSTEM_SETTING');
CREATE TYPE "LogSeverity" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');
CREATE TYPE "NotificationType" AS ENUM ('INVOICE_ASSIGNED', 'APPROVAL_REQUIRED', 'APPROVAL_COMPLETED', 'INVOICE_APPROVED', 'INVOICE_REJECTED', 'INVOICE_ESCALATED', 'PAYMENT_DUE_SOON', 'PAYMENT_OVERDUE', 'DUPLICATE_FOUND', 'SLA_BREACH', 'SYSTEM_ALERT', 'MONTHLY_REPORT', 'DELEGATION_REQUEST', 'ESCALATION_TRIGGERED', 'COMPLIANCE_WARNING', 'FRAUD_ALERT', 'WORKLOAD_THRESHOLD');
CREATE TYPE "DeliveryMethod" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'ALL');
CREATE TYPE "ComplianceType" AS ENUM ('VAT_COMPLIANCE', 'TAX_COMPLIANCE', 'AML_CHECK', 'PEP_CHECK', 'SANCTIONS_CHECK', 'DUPLICATE_DETECT', 'APPROVAL_AUTHORITY', 'SPENDING_LIMIT', 'WORKFLOW_RULE', 'DATA_QUALITY');
CREATE TYPE "BatchStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- Create tables
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "employeeId" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL,
    "department" "Department" NOT NULL,
    "approvalLimit" DECIMAL(15,2) DEFAULT 0,
    "dailyLimit" DECIMAL(15,2) DEFAULT 0,
    "monthlyLimit" DECIMAL(15,2) DEFAULT 0,
    "currentWorkload" SMALLINT DEFAULT 0,
    "maxWorkload" SMALLINT DEFAULT 50,
    "workloadCapacity" DECIMAL(5,2) DEFAULT 100,
    "phone" VARCHAR(20),
    "extension" VARCHAR(10),
    "location" VARCHAR(100),
    "isActive" BOOLEAN DEFAULT true,
    "isOnLeave" BOOLEAN DEFAULT false,
    "leaveStart" TIMESTAMP(3),
    "leaveEnd" TIMESTAMP(3),
    "backupApproverId" TEXT,
    "lastLogin" TIMESTAMP(3),
    "failedLoginAttempts" SMALLINT DEFAULT 0,
    "passwordHash" VARCHAR(255) NOT NULL,
    "passwordResetToken" VARCHAR(255),
    "passwordResetExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "tradingName" VARCHAR(255),
    "vatNumber" VARCHAR(20),
    "registrationNumber" VARCHAR(50),
    "bbeeLevel" VARCHAR(10),
    "bbeeScore" DECIMAL(5,2),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "fax" VARCHAR(20),
    "website" VARCHAR(255),
    "physicalAddress" TEXT,
    "postalAddress" TEXT,
    "city" VARCHAR(100),
    "province" VARCHAR(50),
    "postalCode" VARCHAR(10),
    "country" VARCHAR(100) DEFAULT 'South Africa',
    "bankName" VARCHAR(100),
    "branchName" VARCHAR(100),
    "branchCode" VARCHAR(20),
    "accountNumber" VARCHAR(50),
    "accountType" "AccountType",
    "accountHolder" VARCHAR(255),
    "swiftCode" VARCHAR(20),
    "iban" VARCHAR(50),
    "paymentTerms" SMALLINT DEFAULT 30,
    "discountTerms" SMALLINT,
    "discountPercent" DECIMAL(5,2),
    "preferredPaymentMethod" "PaymentMethod",
    "status" "SupplierStatus" DEFAULT 'PENDING_VERIFICATION',
    "isPreferred" BOOLEAN DEFAULT false,
    "isBlacklisted" BOOLEAN DEFAULT false,
    "blacklistReason" TEXT,
    "vatCompliant" BOOLEAN DEFAULT false,
    "taxCompliant" BOOLEAN DEFAULT false,
    "pepStatus" BOOLEAN,
    "category" "SupplierCategory",
    "subcategory" VARCHAR(100),
    "averageProcessingTime" INTEGER,
    "approvalRate" DECIMAL(5,2),
    "disputeRate" DECIMAL(5,2),
    "riskScore" DECIMAL(5,2),
    "createdById" TEXT,
    "verifiedById" TEXT,
    "verifiedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierContact" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "title" VARCHAR(100),
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "mobile" VARCHAR(20),
    "isPrimary" BOOLEAN DEFAULT false,
    "isAccountsContact" BOOLEAN DEFAULT false,
    "isPep" BOOLEAN,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" VARCHAR(50) NOT NULL,
    "supplierInvoiceNo" VARCHAR(50),
    "referenceNumber" VARCHAR(100),
    "quoteNumber" VARCHAR(50),
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "processedDate" TIMESTAMP(3),
    "approvedDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "subtotalExclVAT" DECIMAL(15,2) NOT NULL,
    "subtotalInclVAT" DECIMAL(15,2),
    "vatRate" DECIMAL(5,2) DEFAULT 15.0,
    "vatAmount" DECIMAL(15,2) NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "amountPaid" DECIMAL(15,2) DEFAULT 0,
    "amountDue" DECIMAL(15,2) NOT NULL,
    "discountAmount" DECIMAL(15,2) DEFAULT 0,
    "penaltyAmount" DECIMAL(15,2) DEFAULT 0,
    "currency" VARCHAR(3) DEFAULT 'ZAR',
    "exchangeRate" DECIMAL(10,6) DEFAULT 1.0,
    "supplierId" TEXT,
    "supplierName" VARCHAR(255) NOT NULL,
    "supplierVAT" VARCHAR(20),
    "supplierRegNumber" VARCHAR(50),
    "supplierEmail" VARCHAR(255),
    "supplierPhone" VARCHAR(20),
    "supplierAddress" TEXT,
    "bankName" VARCHAR(100),
    "branchName" VARCHAR(100),
    "branchCode" VARCHAR(20),
    "accountNumber" VARCHAR(50),
    "accountType" "AccountType",
    "accountHolder" VARCHAR(255),
    "swiftCode" VARCHAR(20),
    "iban" VARCHAR(50),
    "paymentTerms" SMALLINT DEFAULT 30,
    "discountTerms" SMALLINT,
    "discountPercent" DECIMAL(5,2),
    "pdfUrl" TEXT,
    "pdfHash" VARCHAR(64),
    "ocrText" TEXT,
    "extractionConfidence" DECIMAL(5,2) DEFAULT 0,
    "validationScore" DECIMAL(5,2) DEFAULT 0,
    "status" "InvoiceStatus" DEFAULT 'PENDING_APPROVAL',
    "priority" "PriorityLevel" DEFAULT 'MEDIUM',
    "isUrgent" BOOLEAN DEFAULT false,
    "requiresAttention" BOOLEAN DEFAULT false,
    "currentStage" SMALLINT DEFAULT 1,
    "currentApproverId" TEXT,
    "nextApproverId" TEXT,
    "isDuplicate" BOOLEAN DEFAULT false,
    "duplicateParentId" TEXT,
    "duplicateReason" TEXT,
    "isEscalated" BOOLEAN DEFAULT false,
    "escalationReason" TEXT,
    "escalatedBy" VARCHAR(50),
    "escalatedDate" TIMESTAMP(3),
    "createdById" TEXT,
    "modifiedById" TEXT,
    "vatCompliant" BOOLEAN DEFAULT false,
    "termsCompliant" BOOLEAN DEFAULT false,
    "fullyApproved" BOOLEAN DEFAULT false,
    "readyForPayment" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "lineNumber" SMALLINT NOT NULL,
    "description" TEXT NOT NULL,
    "productCode" VARCHAR(50),
    "unitOfMeasure" VARCHAR(20),
    "quantity" DECIMAL(15,4) NOT NULL,
    "unitPrice" DECIMAL(15,4) NOT NULL,
    "vatRate" DECIMAL(5,2) DEFAULT 15.0,
    "vatAmount" DECIMAL(15,2) NOT NULL,
    "lineTotalExclVAT" DECIMAL(15,2) NOT NULL,
    "lineTotalInclVAT" DECIMAL(15,2) NOT NULL,
    "isValidated" BOOLEAN DEFAULT false,
    "validationNotes" TEXT,
    "validationScore" DECIMAL(5,2) DEFAULT 0,
    "glAccountCode" VARCHAR(20),
    "costCenter" VARCHAR(20),
    "projectCode" VARCHAR(20),
    "departmentCode" VARCHAR(20),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sequenceNumber" SMALLINT NOT NULL,
    "totalStages" SMALLINT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approverRole" "UserRole" NOT NULL,
    "approverLimit" DECIMAL(15,2) NOT NULL,
    "status" "ApprovalStatus" DEFAULT 'PENDING_APPROVAL',
    "decision" "ApprovalDecision",
    "decisionDate" TIMESTAMP(3),
    "comments" TEXT,
    "invoiceAmount" DECIMAL(15,2) NOT NULL,
    "canApprove" BOOLEAN NOT NULL,
    "isDelegated" BOOLEAN DEFAULT false,
    "delegatedToId" TEXT,
    "delegationReason" TEXT,
    "isEscalated" BOOLEAN DEFAULT false,
    "escalatedFromId" TEXT,
    "escalationReason" TEXT,
    "assignedDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "viewedDate" TIMESTAMP(3),
    "actionDate" TIMESTAMP(3),
    "slaHours" SMALLINT DEFAULT 48,
    "slaDueDate" TIMESTAMP(3),
    "isWithinSLA" BOOLEAN DEFAULT true,
    "slaBreachDate" TIMESTAMP(3),
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "deviceInfo" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "user" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "isInternalNote" BOOLEAN DEFAULT false,
    "attachments" VARCHAR(500)[] DEFAULT ARRAY[]::VARCHAR(500)[],
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" VARCHAR(50) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedBy" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "checksum" VARCHAR(64),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" VARCHAR(255) NOT NULL,
    "entityDescription" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "diff" JSONB,
    "userId" TEXT,
    "userEmail" VARCHAR(255),
    "userRole" "UserRole",
    "userDepartments" "Department"[] DEFAULT ARRAY[]::"Department"[],
    "userIp" VARCHAR(45),
    "userAgent" TEXT,
    "deviceInfo" TEXT,
    "requestId" VARCHAR(100),
    "sessionId" VARCHAR(100),
    "correlationId" VARCHAR(100),
    "browserInfo" TEXT,
    "location" VARCHAR(100),
    "severity" "LogSeverity" DEFAULT 'INFO',
    "complianceFlags" VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[],
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "PriorityLevel" DEFAULT 'MEDIUM',
    "entityType" "EntityType",
    "entityId" VARCHAR(255),
    "isRead" BOOLEAN DEFAULT false,
    "isArchived" BOOLEAN DEFAULT false,
    "readDate" TIMESTAMP(3),
    "deliveryMethod" "DeliveryMethod" DEFAULT 'IN_APP',
    "sentViaEmail" BOOLEAN DEFAULT false,
    "sentViaSMS" BOOLEAN DEFAULT false,
    "emailSentDate" TIMESTAMP(3),
    "smsSentDate" TIMESTAMP(3),
    "emailTemplate" VARCHAR(100),
    "smsTemplate" VARCHAR(100),
    "expiresAt" TIMESTAMP(3),
    "actions" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50),
    "isEncrypted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" VARCHAR(255),

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FraudDetectionModel" (
    "id" TEXT NOT NULL,
    "modelVersion" VARCHAR(20) NOT NULL,
    "modelFilePath" VARCHAR(500) NOT NULL,
    "trainingDate" TIMESTAMP(3) NOT NULL,
    "accuracy" DECIMAL(5,2) NOT NULL,
    "precision" DECIMAL(5,2) NOT NULL,
    "recall" DECIMAL(5,2) NOT NULL,
    "f1Score" DECIMAL(5,2) NOT NULL,
    "threshold" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN DEFAULT false,
    "features" JSONB NOT NULL,
    "hyperparameters" JSONB NOT NULL,
    "trainingDataStats" JSONB NOT NULL,
    "validationStats" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudDetectionModel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceRule" (
    "id" TEXT NOT NULL,
    "ruleName" VARCHAR(100) NOT NULL,
    "ruleType" "ComplianceType" NOT NULL,
    "description" TEXT NOT NULL,
    "ruleConfig" JSONB NOT NULL,
    "isEnabled" BOOLEAN DEFAULT true,
    "severity" "LogSeverity" DEFAULT 'WARNING',
    "appliesTo" "EntityType"[] NOT NULL,
    "createdBy" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastTriggered" TIMESTAMP(3),
    "triggerCount" INTEGER DEFAULT 0,

    CONSTRAINT "ComplianceRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentBatch" (
    "id" TEXT NOT NULL,
    "batchNumber" VARCHAR(50) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "paymentCount" INTEGER NOT NULL,
    "status" "BatchStatus" DEFAULT 'PENDING_APPROVAL',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "bankAccount" VARCHAR(100) NOT NULL,
    "approverId" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releasedBy" VARCHAR(255),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentBatch_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_department_idx" ON "User"("department");
CREATE INDEX "User_approvalLimit_idx" ON "User"("approvalLimit");
CREATE INDEX "User_isActive_isOnLeave_idx" ON "User"("isActive", "isOnLeave");

CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");
CREATE INDEX "Supplier_vatNumber_idx" ON "Supplier"("vatNumber");
CREATE INDEX "Supplier_category_idx" ON "Supplier"("category");
CREATE INDEX "Supplier_status_idx" ON "Supplier"("status");
CREATE INDEX "Supplier_isBlacklisted_idx" ON "Supplier"("isBlacklisted");
CREATE INDEX "Supplier_riskScore_idx" ON "Supplier"("riskScore");

CREATE INDEX "SupplierContact_supplierId_idx" ON "SupplierContact"("supplierId");
CREATE INDEX "SupplierContact_email_idx" ON "SupplierContact"("email");
CREATE INDEX "SupplierContact_isPrimary_idx" ON "SupplierContact"("isPrimary");

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_currentApproverId_idx" ON "Invoice"("currentApproverId");
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");
CREATE INDEX "Invoice_totalAmount_idx" ON "Invoice"("totalAmount");
CREATE INDEX "Invoice_supplierId_idx" ON "Invoice"("supplierId");
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");
CREATE INDEX "Invoice_paymentDate_idx" ON "Invoice"("paymentDate");
CREATE INDEX "Invoice_isDuplicate_idx" ON "Invoice"("isDuplicate");
CREATE INDEX "Invoice_receivedDate_idx" ON "Invoice"("receivedDate");
CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");
CREATE INDEX "Invoice_supplierName_invoiceDate_idx" ON "Invoice"("supplierName", "invoiceDate");

CREATE INDEX "LineItem_invoiceId_idx" ON "LineItem"("invoiceId");
CREATE INDEX "LineItem_glAccountCode_idx" ON "LineItem"("glAccountCode");
CREATE INDEX "LineItem_departmentCode_idx" ON "LineItem"("departmentCode");
CREATE INDEX "LineItem_costCenter_idx" ON "LineItem"("costCenter");

CREATE INDEX "Approval_invoiceId_idx" ON "Approval"("invoiceId");
CREATE INDEX "Approval_approverId_idx" ON "Approval"("approverId");
CREATE INDEX "Approval_status_idx" ON "Approval"("status");
CREATE INDEX "Approval_assignedDate_idx" ON "Approval"("assignedDate");
CREATE INDEX "Approval_decisionDate_idx" ON "Approval"("decisionDate");
CREATE INDEX "Approval_isWithinSLA_idx" ON "Approval"("isWithinSLA");
CREATE INDEX "Approval_invoiceId_sequenceNumber_idx" ON "Approval"("invoiceId", "sequenceNumber");

CREATE INDEX "Comment_invoiceId_idx" ON "Comment"("invoiceId");
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");
CREATE INDEX "Comment_user_idx" ON "Comment"("user");

CREATE INDEX "Attachment_invoiceId_idx" ON "Attachment"("invoiceId");
CREATE INDEX "Attachment_uploadedBy_idx" ON "Attachment"("uploadedBy");

CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");

CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

CREATE UNIQUE INDEX "FraudDetectionModel_modelVersion_key" ON "FraudDetectionModel"("modelVersion");
CREATE INDEX "FraudDetectionModel_isActive_idx" ON "FraudDetectionModel"("isActive");

CREATE UNIQUE INDEX "ComplianceRule_ruleName_key" ON "ComplianceRule"("ruleName");
CREATE INDEX "ComplianceRule_isEnabled_idx" ON "ComplianceRule"("isEnabled");
CREATE INDEX "ComplianceRule_ruleType_idx" ON "ComplianceRule"("ruleType");
CREATE INDEX "ComplianceRule_appliesTo_idx" ON "ComplianceRule" USING gin("appliesTo");

CREATE UNIQUE INDEX "PaymentBatch_batchNumber_key" ON "PaymentBatch"("batchNumber");
CREATE INDEX "PaymentBatch_status_idx" ON "PaymentBatch"("status");
CREATE INDEX "PaymentBatch_paymentDate_idx" ON "PaymentBatch"("paymentDate");

-- Create foreign keys
ALTER TABLE "User" ADD CONSTRAINT "User_backupApproverId_fkey" FOREIGN KEY ("backupApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupplierContact" ADD CONSTRAINT "SupplierContact_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_currentApproverId_fkey" FOREIGN KEY ("currentApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_nextApproverId_fkey" FOREIGN KEY ("nextApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_modifiedById_fkey" FOREIGN KEY ("modifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_duplicateParentId_fkey" FOREIGN KEY ("duplicateParentId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LineItem" ADD CONSTRAINT "LineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Approval" ADD CONSTRAINT "Approval_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_delegatedToId_fkey" FOREIGN KEY ("delegatedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_escalatedFromId_fkey" FOREIGN KEY ("escalatedFromId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentBatch" ADD CONSTRAINT "PaymentBatch_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updatedAt
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_updated_at BEFORE UPDATE ON "Supplier" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliercontact_updated_at BEFORE UPDATE ON "SupplierContact" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_updated_at BEFORE UPDATE ON "Invoice" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lineitem_updated_at BEFORE UPDATE ON "LineItem" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approval_updated_at BEFORE UPDATE ON "Approval" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comment_updated_at BEFORE UPDATE ON "Comment" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auditlog_updated_at BEFORE UPDATE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_updated_at BEFORE UPDATE ON "Notification" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_systemsetting_updated_at BEFORE UPDATE ON "SystemSetting" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_frauddetectionmodel_updated_at BEFORE UPDATE ON "FraudDetectionModel" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliancerule_updated_at BEFORE UPDATE ON "ComplianceRule" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_paymentbatch_updated_at BEFORE UPDATE ON "PaymentBatch" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for invoice aging calculation
CREATE OR REPLACE FUNCTION calculate_invoice_age(invoice_date TIMESTAMP, due_date TIMESTAMP)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(DAY FROM (CURRENT_DATE - invoice_date::date));
END;
$$ LANGUAGE plpgsql;

-- Create function for SLA breach detection
CREATE OR REPLACE FUNCTION check_sla_breach()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."slaDueDate" < CURRENT_TIMESTAMP AND NEW.status = 'PENDING_APPROVAL' THEN
        NEW."isWithinSLA" = false;
        NEW."slaBreachDate" = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_approval_sla BEFORE UPDATE ON "Approval" FOR EACH ROW EXECUTE FUNCTION check_sla_breach();

-- Create function for workload calculation
CREATE OR REPLACE FUNCTION calculate_workload_capacity(user_id TEXT)
RETURNS DECIMAL AS $$
DECLARE
    current_workload INTEGER;
    max_workload INTEGER;
    capacity DECIMAL;
BEGIN
    SELECT "currentWorkload", "maxWorkload" 
    INTO current_workload, max_workload
    FROM "User"
    WHERE id = user_id;
    
    IF max_workload > 0 THEN
        capacity = (current_workload::DECIMAL / max_workload::DECIMAL) * 100;
    ELSE
        capacity = 100;
    END IF;
    
    RETURN capacity;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for dashboard metrics
CREATE MATERIALIZED VIEW dashboard_metrics AS
SELECT 
    DATE_TRUNC('day', "createdAt") as date,
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_invoices,
    COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_invoices,
    COUNT(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 END) as pending_invoices,
    SUM(CASE WHEN status = 'APPROVED' THEN "totalAmount" ELSE 0 END) as approved_amount,
    AVG(EXTRACT(DAY FROM ("approvedDate" - "createdAt"))) as avg_approval_days
FROM "Invoice"
WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', "createdAt");

CREATE UNIQUE INDEX dashboard_metrics_date_idx ON dashboard_metrics(date);
