--
-- PostgreSQL database dump
--

\restrict hu5twIaT9QaZ0I8qQCWyfSc02R3CMGylWvvfJtImetNBT4VgSZ2KfnVN2XKPG8A

-- Dumped from database version 18.2 (Debian 18.2-1.pgdg13+1)
-- Dumped by pg_dump version 18.2 (Debian 18.2-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_backupApproverId_fkey";
ALTER TABLE IF EXISTS ONLY public."Supplier" DROP CONSTRAINT IF EXISTS "Supplier_verifiedById_fkey";
ALTER TABLE IF EXISTS ONLY public."Supplier" DROP CONSTRAINT IF EXISTS "Supplier_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."SupplierContact" DROP CONSTRAINT IF EXISTS "SupplierContact_supplierId_fkey";
ALTER TABLE IF EXISTS ONLY public."PaymentBatch" DROP CONSTRAINT IF EXISTS "PaymentBatch_approverId_fkey";
ALTER TABLE IF EXISTS ONLY public."Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."LineItem" DROP CONSTRAINT IF EXISTS "LineItem_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public."Invoice" DROP CONSTRAINT IF EXISTS "Invoice_supplierId_fkey";
ALTER TABLE IF EXISTS ONLY public."Invoice" DROP CONSTRAINT IF EXISTS "Invoice_nextApproverId_fkey";
ALTER TABLE IF EXISTS ONLY public."Invoice" DROP CONSTRAINT IF EXISTS "Invoice_modifiedById_fkey";
ALTER TABLE IF EXISTS ONLY public."Invoice" DROP CONSTRAINT IF EXISTS "Invoice_duplicateParentId_fkey";
ALTER TABLE IF EXISTS ONLY public."Invoice" DROP CONSTRAINT IF EXISTS "Invoice_currentApproverId_fkey";
ALTER TABLE IF EXISTS ONLY public."Invoice" DROP CONSTRAINT IF EXISTS "Invoice_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."Comment" DROP CONSTRAINT IF EXISTS "Comment_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Attachment" DROP CONSTRAINT IF EXISTS "Attachment_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public."Approval" DROP CONSTRAINT IF EXISTS "Approval_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public."Approval" DROP CONSTRAINT IF EXISTS "Approval_escalatedFromId_fkey";
ALTER TABLE IF EXISTS ONLY public."Approval" DROP CONSTRAINT IF EXISTS "Approval_delegatedToId_fkey";
ALTER TABLE IF EXISTS ONLY public."Approval" DROP CONSTRAINT IF EXISTS "Approval_approverId_fkey";
DROP TRIGGER IF EXISTS update_user_updated_at ON public."User";
DROP TRIGGER IF EXISTS update_systemsetting_updated_at ON public."SystemSetting";
DROP TRIGGER IF EXISTS update_suppliercontact_updated_at ON public."SupplierContact";
DROP TRIGGER IF EXISTS update_supplier_updated_at ON public."Supplier";
DROP TRIGGER IF EXISTS update_paymentbatch_updated_at ON public."PaymentBatch";
DROP TRIGGER IF EXISTS update_notification_updated_at ON public."Notification";
DROP TRIGGER IF EXISTS update_lineitem_updated_at ON public."LineItem";
DROP TRIGGER IF EXISTS update_invoice_updated_at ON public."Invoice";
DROP TRIGGER IF EXISTS update_frauddetectionmodel_updated_at ON public."FraudDetectionModel";
DROP TRIGGER IF EXISTS update_compliancerule_updated_at ON public."ComplianceRule";
DROP TRIGGER IF EXISTS update_comment_updated_at ON public."Comment";
DROP TRIGGER IF EXISTS update_auditlog_updated_at ON public."AuditLog";
DROP TRIGGER IF EXISTS update_approval_updated_at ON public."Approval";
DROP TRIGGER IF EXISTS check_approval_sla ON public."Approval";
DROP INDEX IF EXISTS public.dashboard_metrics_date_idx;
DROP INDEX IF EXISTS public."User_role_idx";
DROP INDEX IF EXISTS public."User_isActive_isOnLeave_idx";
DROP INDEX IF EXISTS public."User_employeeId_key";
DROP INDEX IF EXISTS public."User_email_key";
DROP INDEX IF EXISTS public."User_department_idx";
DROP INDEX IF EXISTS public."User_approvalLimit_idx";
DROP INDEX IF EXISTS public."SystemSetting_key_key";
DROP INDEX IF EXISTS public."Supplier_vatNumber_idx";
DROP INDEX IF EXISTS public."Supplier_status_idx";
DROP INDEX IF EXISTS public."Supplier_riskScore_idx";
DROP INDEX IF EXISTS public."Supplier_name_key";
DROP INDEX IF EXISTS public."Supplier_isBlacklisted_idx";
DROP INDEX IF EXISTS public."Supplier_category_idx";
DROP INDEX IF EXISTS public."SupplierContact_supplierId_idx";
DROP INDEX IF EXISTS public."SupplierContact_isPrimary_idx";
DROP INDEX IF EXISTS public."SupplierContact_email_idx";
DROP INDEX IF EXISTS public."PaymentBatch_status_idx";
DROP INDEX IF EXISTS public."PaymentBatch_paymentDate_idx";
DROP INDEX IF EXISTS public."PaymentBatch_batchNumber_key";
DROP INDEX IF EXISTS public."Notification_userId_idx";
DROP INDEX IF EXISTS public."Notification_type_idx";
DROP INDEX IF EXISTS public."Notification_isRead_idx";
DROP INDEX IF EXISTS public."Notification_entityType_entityId_idx";
DROP INDEX IF EXISTS public."Notification_createdAt_idx";
DROP INDEX IF EXISTS public."LineItem_invoiceId_idx";
DROP INDEX IF EXISTS public."LineItem_glAccountCode_idx";
DROP INDEX IF EXISTS public."LineItem_departmentCode_idx";
DROP INDEX IF EXISTS public."LineItem_costCenter_idx";
DROP INDEX IF EXISTS public."Invoice_totalAmount_idx";
DROP INDEX IF EXISTS public."Invoice_supplierName_invoiceDate_idx";
DROP INDEX IF EXISTS public."Invoice_supplierId_idx";
DROP INDEX IF EXISTS public."Invoice_status_idx";
DROP INDEX IF EXISTS public."Invoice_status_dueDate_idx";
DROP INDEX IF EXISTS public."Invoice_receivedDate_idx";
DROP INDEX IF EXISTS public."Invoice_paymentDate_idx";
DROP INDEX IF EXISTS public."Invoice_isDuplicate_idx";
DROP INDEX IF EXISTS public."Invoice_invoiceNumber_key";
DROP INDEX IF EXISTS public."Invoice_invoiceNumber_idx";
DROP INDEX IF EXISTS public."Invoice_dueDate_idx";
DROP INDEX IF EXISTS public."Invoice_currentApproverId_idx";
DROP INDEX IF EXISTS public."Invoice_createdAt_idx";
DROP INDEX IF EXISTS public."FraudDetectionModel_modelVersion_key";
DROP INDEX IF EXISTS public."FraudDetectionModel_isActive_idx";
DROP INDEX IF EXISTS public."ComplianceRule_ruleType_idx";
DROP INDEX IF EXISTS public."ComplianceRule_ruleName_key";
DROP INDEX IF EXISTS public."ComplianceRule_isEnabled_idx";
DROP INDEX IF EXISTS public."ComplianceRule_appliesTo_idx";
DROP INDEX IF EXISTS public."Comment_user_idx";
DROP INDEX IF EXISTS public."Comment_invoiceId_idx";
DROP INDEX IF EXISTS public."Comment_createdAt_idx";
DROP INDEX IF EXISTS public."AuditLog_userId_idx";
DROP INDEX IF EXISTS public."AuditLog_severity_idx";
DROP INDEX IF EXISTS public."AuditLog_requestId_idx";
DROP INDEX IF EXISTS public."AuditLog_entityType_entityId_idx";
DROP INDEX IF EXISTS public."AuditLog_createdAt_idx";
DROP INDEX IF EXISTS public."AuditLog_correlationId_idx";
DROP INDEX IF EXISTS public."AuditLog_action_idx";
DROP INDEX IF EXISTS public."Attachment_uploadedBy_idx";
DROP INDEX IF EXISTS public."Attachment_invoiceId_idx";
DROP INDEX IF EXISTS public."Approval_status_idx";
DROP INDEX IF EXISTS public."Approval_isWithinSLA_idx";
DROP INDEX IF EXISTS public."Approval_invoiceId_sequenceNumber_idx";
DROP INDEX IF EXISTS public."Approval_invoiceId_idx";
DROP INDEX IF EXISTS public."Approval_decisionDate_idx";
DROP INDEX IF EXISTS public."Approval_assignedDate_idx";
DROP INDEX IF EXISTS public."Approval_approverId_idx";
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE IF EXISTS ONLY public."SystemSetting" DROP CONSTRAINT IF EXISTS "SystemSetting_pkey";
ALTER TABLE IF EXISTS ONLY public."Supplier" DROP CONSTRAINT IF EXISTS "Supplier_pkey";
ALTER TABLE IF EXISTS ONLY public."SupplierContact" DROP CONSTRAINT IF EXISTS "SupplierContact_pkey";
ALTER TABLE IF EXISTS ONLY public."PaymentBatch" DROP CONSTRAINT IF EXISTS "PaymentBatch_pkey";
ALTER TABLE IF EXISTS ONLY public."Notification" DROP CONSTRAINT IF EXISTS "Notification_pkey";
ALTER TABLE IF EXISTS ONLY public."LineItem" DROP CONSTRAINT IF EXISTS "LineItem_pkey";
ALTER TABLE IF EXISTS ONLY public."Invoice" DROP CONSTRAINT IF EXISTS "Invoice_pkey";
ALTER TABLE IF EXISTS ONLY public."FraudDetectionModel" DROP CONSTRAINT IF EXISTS "FraudDetectionModel_pkey";
ALTER TABLE IF EXISTS ONLY public."ComplianceRule" DROP CONSTRAINT IF EXISTS "ComplianceRule_pkey";
ALTER TABLE IF EXISTS ONLY public."Comment" DROP CONSTRAINT IF EXISTS "Comment_pkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_pkey";
ALTER TABLE IF EXISTS ONLY public."Attachment" DROP CONSTRAINT IF EXISTS "Attachment_pkey";
ALTER TABLE IF EXISTS ONLY public."Approval" DROP CONSTRAINT IF EXISTS "Approval_pkey";
DROP MATERIALIZED VIEW IF EXISTS public.dashboard_metrics;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TABLE IF EXISTS public."User";
DROP TABLE IF EXISTS public."SystemSetting";
DROP TABLE IF EXISTS public."SupplierContact";
DROP TABLE IF EXISTS public."Supplier";
DROP TABLE IF EXISTS public."PaymentBatch";
DROP TABLE IF EXISTS public."Notification";
DROP TABLE IF EXISTS public."LineItem";
DROP TABLE IF EXISTS public."Invoice";
DROP TABLE IF EXISTS public."FraudDetectionModel";
DROP TABLE IF EXISTS public."ComplianceRule";
DROP TABLE IF EXISTS public."Comment";
DROP TABLE IF EXISTS public."AuditLog";
DROP TABLE IF EXISTS public."Attachment";
DROP TABLE IF EXISTS public."Approval";
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.check_sla_breach();
DROP FUNCTION IF EXISTS public.calculate_workload_capacity(user_id text);
DROP FUNCTION IF EXISTS public.calculate_invoice_age(invoice_date timestamp without time zone, due_date timestamp without time zone);
DROP TYPE IF EXISTS public."WebhookStatus";
DROP TYPE IF EXISTS public."UserRole";
DROP TYPE IF EXISTS public."TransactionType";
DROP TYPE IF EXISTS public."TaxType";
DROP TYPE IF EXISTS public."SyncStatus";
DROP TYPE IF EXISTS public."SupplierStatus";
DROP TYPE IF EXISTS public."SupplierCategory";
DROP TYPE IF EXISTS public."StorageProvider";
DROP TYPE IF EXISTS public."ScheduledTaskType";
DROP TYPE IF EXISTS public."ScheduledTaskStatus";
DROP TYPE IF EXISTS public."SLAStatus";
DROP TYPE IF EXISTS public."RiskLevel";
DROP TYPE IF EXISTS public."ReconciliationStatus";
DROP TYPE IF EXISTS public."ReconciliationItemStatus";
DROP TYPE IF EXISTS public."PriorityLevel";
DROP TYPE IF EXISTS public."PaymentStatus";
DROP TYPE IF EXISTS public."PaymentMethod";
DROP TYPE IF EXISTS public."NotificationType";
DROP TYPE IF EXISTS public."NotificationStatus";
DROP TYPE IF EXISTS public."NotificationPriority";
DROP TYPE IF EXISTS public."NotificationChannel";
DROP TYPE IF EXISTS public."MatchingStatus";
DROP TYPE IF EXISTS public."LogSeverity";
DROP TYPE IF EXISTS public."InvoiceStatus";
DROP TYPE IF EXISTS public."IntegrationType";
DROP TYPE IF EXISTS public."IntegrationStatus";
DROP TYPE IF EXISTS public."FraudScoreLevel";
DROP TYPE IF EXISTS public."EntityType";
DROP TYPE IF EXISTS public."DocumentType";
DROP TYPE IF EXISTS public."Department";
DROP TYPE IF EXISTS public."DeliveryMethod";
DROP TYPE IF EXISTS public."Currency";
DROP TYPE IF EXISTS public."ComplianceType";
DROP TYPE IF EXISTS public."ComplianceStatus";
DROP TYPE IF EXISTS public."ComplianceCheckType";
DROP TYPE IF EXISTS public."BatchStatus";
DROP TYPE IF EXISTS public."BankAccountType";
DROP TYPE IF EXISTS public."AuditAction";
DROP TYPE IF EXISTS public."ApprovalStatus";
DROP TYPE IF EXISTS public."ApprovalDecision";
DROP TYPE IF EXISTS public."ApprovalChainType";
DROP TYPE IF EXISTS public."AccountType";
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS pg_trgm;
DROP EXTENSION IF EXISTS btree_gist;
--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: AccountType; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."AccountType" AS ENUM (
    'CURRENT',
    'SAVINGS',
    'TRANSACTIONAL',
    'FOREIGN'
);


ALTER TYPE public."AccountType" OWNER TO creditorflow;

--
-- Name: ApprovalChainType; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."ApprovalChainType" AS ENUM (
    'SEQUENTIAL',
    'PARALLEL',
    'CONDITIONAL',
    'HIERARCHICAL',
    'ADAPTIVE'
);


ALTER TYPE public."ApprovalChainType" OWNER TO creditorflow;

--
-- Name: ApprovalDecision; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."ApprovalDecision" AS ENUM (
    'APPROVE',
    'REJECT',
    'ESCALATE',
    'DELEGATE',
    'HOLD',
    'REQUEST_INFO'
);


ALTER TYPE public."ApprovalDecision" OWNER TO creditorflow;

--
-- Name: ApprovalStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."ApprovalStatus" AS ENUM (
    'PENDING_APPROVAL',
    'IN_REVIEW',
    'APPROVED',
    'REJECTED',
    'ESCALATED',
    'DELEGATED',
    'CANCELLED',
    'EXPIRED'
);


ALTER TYPE public."ApprovalStatus" OWNER TO creditorflow;

--
-- Name: AuditAction; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."AuditAction" AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'APPROVE',
    'REJECT',
    'ESCALATE',
    'DELEGATE',
    'VIEW',
    'DOWNLOAD',
    'EXPORT',
    'LOGIN',
    'LOGOUT',
    'PASSWORD_CHANGE',
    'PERMISSION_CHANGE',
    'SYSTEM_ALERT',
    'COMPLIANCE_VIOLATION',
    'FRAUD_DETECTED'
);


ALTER TYPE public."AuditAction" OWNER TO creditorflow;

--
-- Name: BankAccountType; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."BankAccountType" AS ENUM (
    'CURRENT',
    'SAVINGS',
    'CREDIT',
    'PAYROLL',
    'TRUST',
    'ESCROW'
);


ALTER TYPE public."BankAccountType" OWNER TO creditorflow;

--
-- Name: BatchStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."BatchStatus" AS ENUM (
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);


ALTER TYPE public."BatchStatus" OWNER TO creditorflow;

--
-- Name: ComplianceCheckType; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."ComplianceCheckType" AS ENUM (
    'VAT_VALIDATION',
    'TAX_ID_VALIDATION',
    'SANCTIONS_SCREENING',
    'PEP_SCREENING',
    'AML_CHECK',
    'KYC_VERIFICATION',
    'REGULATORY_COMPLIANCE',
    'DATA_PROTECTION',
    'DUPLICATE_CHECK',
    'FRAUD_DETECTION'
);


ALTER TYPE public."ComplianceCheckType" OWNER TO creditorflow;

--
-- Name: ComplianceStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."ComplianceStatus" AS ENUM (
    'PENDING',
    'VALID',
    'INVALID',
    'SUSPENDED',
    'EXPIRED',
    'FLAGGED',
    'UNDER_REVIEW',
    'COMPLIANT',
    'NON_COMPLIANT'
);


ALTER TYPE public."ComplianceStatus" OWNER TO creditorflow;

--
-- Name: ComplianceType; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."ComplianceType" AS ENUM (
    'VAT_COMPLIANCE',
    'TAX_COMPLIANCE',
    'AML_CHECK',
    'PEP_CHECK',
    'SANCTIONS_CHECK',
    'DUPLICATE_DETECT',
    'APPROVAL_AUTHORITY',
    'SPENDING_LIMIT',
    'WORKFLOW_RULE',
    'DATA_QUALITY'
);


ALTER TYPE public."ComplianceType" OWNER TO creditorflow;

--
-- Name: Currency; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."Currency" AS ENUM (
    'ZAR',
    'USD',
    'EUR',
    'GBP',
    'AUD',
    'CAD',
    'JPY',
    'CNY',
    'INR'
);


ALTER TYPE public."Currency" OWNER TO creditorflow;

--
-- Name: DeliveryMethod; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."DeliveryMethod" AS ENUM (
    'IN_APP',
    'EMAIL',
    'SMS',
    'PUSH',
    'ALL'
);


ALTER TYPE public."DeliveryMethod" OWNER TO creditorflow;

--
-- Name: Department; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."Department" AS ENUM (
    'FINANCE',
    'PROCUREMENT',
    'OPERATIONS',
    'HR',
    'IT',
    'EXECUTIVE',
    'OTHER'
);


ALTER TYPE public."Department" OWNER TO creditorflow;

--
-- Name: DocumentType; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."DocumentType" AS ENUM (
    'INVOICE_PDF',
    'PROOF_OF_PAYMENT',
    'CREDIT_NOTE',
    'DEBIT_NOTE',
    'STATEMENT',
    'CONTRACT',
    'PURCHASE_ORDER',
    'DELIVERY_NOTE',
    'RECEIPT',
    'COMPLIANCE_CERTIFICATE',
    'TAX_CERTIFICATE',
    'OTHER'
);


ALTER TYPE public."DocumentType" OWNER TO creditorflow;

--
-- Name: EntityType; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."EntityType" AS ENUM (
    'INVOICE',
    'APPROVAL',
    'USER',
    'SUPPLIER',
    'LINE_ITEM',
    'COMMENT',
    'ATTACHMENT',
    'PAYMENT',
    'REPORT',
    'SYSTEM_SETTING'
);


ALTER TYPE public."EntityType" OWNER TO creditorflow;

--
-- Name: FraudScoreLevel; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."FraudScoreLevel" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE public."FraudScoreLevel" OWNER TO creditorflow;

--
-- Name: IntegrationStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."IntegrationStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'ERROR',
    'PENDING',
    'SYNCING',
    'PAUSED',
    'MAINTENANCE'
);


ALTER TYPE public."IntegrationStatus" OWNER TO creditorflow;

--
-- Name: IntegrationType; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."IntegrationType" AS ENUM (
    'ACCOUNTING_SOFTWARE',
    'BANK_FEED',
    'ERP_SYSTEM',
    'CRM_SYSTEM',
    'OCR_SERVICE',
    'TAX_SERVICE',
    'PAYMENT_GATEWAY',
    'DOCUMENT_MANAGEMENT',
    'COMMUNICATION',
    'EDI',
    'API',
    'WEBHOOK'
);


ALTER TYPE public."IntegrationType" OWNER TO creditorflow;

--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
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


ALTER TYPE public."InvoiceStatus" OWNER TO creditorflow;

--
-- Name: LogSeverity; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."LogSeverity" AS ENUM (
    'DEBUG',
    'INFO',
    'WARNING',
    'ERROR',
    'CRITICAL'
);


ALTER TYPE public."LogSeverity" OWNER TO creditorflow;

--
-- Name: MatchingStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."MatchingStatus" AS ENUM (
    'UNMATCHED',
    'MATCHED',
    'PARTIAL_MATCH',
    'DISPUTED',
    'WRITTEN_OFF'
);


ALTER TYPE public."MatchingStatus" OWNER TO creditorflow;

--
-- Name: NotificationChannel; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."NotificationChannel" AS ENUM (
    'IN_APP',
    'EMAIL',
    'SMS',
    'SLACK',
    'TEAMS',
    'WEBHOOK',
    'PUSH'
);


ALTER TYPE public."NotificationChannel" OWNER TO creditorflow;

--
-- Name: NotificationPriority; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."NotificationPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL',
    'EMERGENCY'
);


ALTER TYPE public."NotificationPriority" OWNER TO creditorflow;

--
-- Name: NotificationStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."NotificationStatus" AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED',
    'READ',
    'FAILED',
    'UNREAD',
    'DISMISSED',
    'ARCHIVED'
);


ALTER TYPE public."NotificationStatus" OWNER TO creditorflow;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."NotificationType" AS ENUM (
    'INVOICE_ASSIGNED',
    'APPROVAL_REQUIRED',
    'APPROVAL_COMPLETED',
    'INVOICE_APPROVED',
    'INVOICE_REJECTED',
    'INVOICE_ESCALATED',
    'PAYMENT_DUE_SOON',
    'PAYMENT_OVERDUE',
    'DUPLICATE_FOUND',
    'SLA_BREACH',
    'SYSTEM_ALERT',
    'MONTHLY_REPORT',
    'DELEGATION_REQUEST',
    'ESCALATION_TRIGGERED',
    'COMPLIANCE_WARNING',
    'FRAUD_ALERT',
    'WORKLOAD_THRESHOLD'
);


ALTER TYPE public."NotificationType" OWNER TO creditorflow;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'EFT',
    'CHEQUE',
    'CASH',
    'CREDIT_CARD',
    'DEBIT_ORDER',
    'INTERNATIONAL_TRANSFER',
    'REAL_TIME_CLEARING'
);


ALTER TYPE public."PaymentMethod" OWNER TO creditorflow;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'UNPAID',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'CANCELLED',
    'FAILED',
    'PENDING',
    'SCHEDULED',
    'PROCESSING'
);


ALTER TYPE public."PaymentStatus" OWNER TO creditorflow;

--
-- Name: PriorityLevel; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."PriorityLevel" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE public."PriorityLevel" OWNER TO creditorflow;

--
-- Name: ReconciliationItemStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."ReconciliationItemStatus" AS ENUM (
    'UNMATCHED',
    'MATCHED',
    'DISPUTED',
    'ADJUSTED',
    'EXCLUDED'
);


ALTER TYPE public."ReconciliationItemStatus" OWNER TO creditorflow;

--
-- Name: ReconciliationStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."ReconciliationStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'RECONCILED',
    'REVIEWED',
    'DISPUTED',
    'UNRECONCILED'
);


ALTER TYPE public."ReconciliationStatus" OWNER TO creditorflow;

--
-- Name: RiskLevel; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."RiskLevel" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL',
    'UNKNOWN'
);


ALTER TYPE public."RiskLevel" OWNER TO creditorflow;

--
-- Name: SLAStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."SLAStatus" AS ENUM (
    'ON_TRACK',
    'AT_RISK',
    'BREACHED',
    'COMPLETED',
    'PAUSED'
);


ALTER TYPE public."SLAStatus" OWNER TO creditorflow;

--
-- Name: ScheduledTaskStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."ScheduledTaskStatus" AS ENUM (
    'SUCCESS',
    'FAILED',
    'RUNNING',
    'CANCELLED',
    'SCHEDULED',
    'SKIPPED',
    'RETRYING'
);


ALTER TYPE public."ScheduledTaskStatus" OWNER TO creditorflow;

--
-- Name: ScheduledTaskType; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."ScheduledTaskType" AS ENUM (
    'INVOICE_PROCESSING',
    'APPROVAL_ESCALATION',
    'APPROVAL_REMINDER',
    'PAYMENT_PROCESSING',
    'PAYMENT_RECONCILIATION',
    'RECONCILIATION',
    'RISK_ASSESSMENT',
    'COMPLIANCE_CHECK',
    'REPORT_GENERATION',
    'DATA_CLEANUP',
    'BACKUP',
    'NOTIFICATION_DIGEST',
    'AUDIT_LOG_ARCHIVE',
    'SUPPLIER_RATING_UPDATE'
);


ALTER TYPE public."ScheduledTaskType" OWNER TO creditorflow;

--
-- Name: StorageProvider; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."StorageProvider" AS ENUM (
    'S3',
    'AZURE_BLOB',
    'GOOGLE_CLOUD',
    'LOCAL',
    'MINIO',
    'WASABI'
);


ALTER TYPE public."StorageProvider" OWNER TO creditorflow;

--
-- Name: SupplierCategory; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."SupplierCategory" AS ENUM (
    'GOODS',
    'SERVICES',
    'CONSULTING',
    'SOFTWARE',
    'MAINTENANCE',
    'UTILITIES',
    'RENTAL',
    'TRAVEL',
    'TRAINING',
    'CATERING',
    'SECURITY',
    'CLEANING',
    'OTHER'
);


ALTER TYPE public."SupplierCategory" OWNER TO creditorflow;

--
-- Name: SupplierStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."SupplierStatus" AS ENUM (
    'PENDING_VERIFICATION',
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'BLACKLISTED',
    'UNDER_REVIEW',
    'ARCHIVED'
);


ALTER TYPE public."SupplierStatus" OWNER TO creditorflow;

--
-- Name: SyncStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."SyncStatus" AS ENUM (
    'SUCCESS',
    'FAILED',
    'PARTIAL',
    'PENDING',
    'IN_PROGRESS',
    'CANCELLED'
);


ALTER TYPE public."SyncStatus" OWNER TO creditorflow;

--
-- Name: TaxType; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."TaxType" AS ENUM (
    'VAT',
    'GST',
    'SALES_TAX',
    'INCOME_TAX',
    'WITHHOLDING_TAX',
    'CUSTOMS_DUTY',
    'EXCISE_TAX',
    'NONE'
);


ALTER TYPE public."TaxType" OWNER TO creditorflow;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."TransactionType" AS ENUM (
    'DEBIT',
    'CREDIT',
    'ADJUSTMENT',
    'FEE',
    'INTEREST'
);


ALTER TYPE public."TransactionType" OWNER TO creditorflow;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."UserRole" AS ENUM (
    'CREDIT_CLERK',
    'BRANCH_MANAGER',
    'FINANCIAL_MANAGER',
    'EXECUTIVE',
    'GROUP_FINANCIAL_MANAGER',
    'ACCOUNTS_ADMIN',
    'HR_MANAGER',
    'VIEWER'
);


ALTER TYPE public."UserRole" OWNER TO creditorflow;

--
-- Name: WebhookStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."WebhookStatus" AS ENUM (
    'SUCCESS',
    'FAILED',
    'PENDING',
    'RETRYING',
    'TIMEOUT',
    'INVALID_SIGNATURE'
);


ALTER TYPE public."WebhookStatus" OWNER TO creditorflow;

--
-- Name: calculate_invoice_age(timestamp without time zone, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: creditorflow
--

CREATE FUNCTION public.calculate_invoice_age(invoice_date timestamp without time zone, due_date timestamp without time zone) RETURNS integer
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN EXTRACT(DAY FROM (CURRENT_DATE - invoice_date::date));
END;
$$;


ALTER FUNCTION public.calculate_invoice_age(invoice_date timestamp without time zone, due_date timestamp without time zone) OWNER TO creditorflow;

--
-- Name: calculate_workload_capacity(text); Type: FUNCTION; Schema: public; Owner: creditorflow
--

CREATE FUNCTION public.calculate_workload_capacity(user_id text) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.calculate_workload_capacity(user_id text) OWNER TO creditorflow;

--
-- Name: check_sla_breach(); Type: FUNCTION; Schema: public; Owner: creditorflow
--

CREATE FUNCTION public.check_sla_breach() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW."slaDueDate" < CURRENT_TIMESTAMP AND NEW.status = 'PENDING_APPROVAL' THEN
        NEW."isWithinSLA" = false;
        NEW."slaBreachDate" = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_sla_breach() OWNER TO creditorflow;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: creditorflow
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO creditorflow;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Approval; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."Approval" (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "sequenceNumber" smallint NOT NULL,
    "totalStages" smallint NOT NULL,
    "approverId" text NOT NULL,
    "approverRole" public."UserRole" NOT NULL,
    "approverLimit" numeric(15,2) NOT NULL,
    status public."ApprovalStatus" DEFAULT 'PENDING_APPROVAL'::public."ApprovalStatus",
    decision public."ApprovalDecision",
    "decisionDate" timestamp(3) without time zone,
    comments text,
    "invoiceAmount" numeric(15,2) NOT NULL,
    "canApprove" boolean NOT NULL,
    "isDelegated" boolean DEFAULT false,
    "delegatedToId" text,
    "delegationReason" text,
    "isEscalated" boolean DEFAULT false,
    "escalatedFromId" text,
    "escalationReason" text,
    "assignedDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "viewedDate" timestamp(3) without time zone,
    "actionDate" timestamp(3) without time zone,
    "slaHours" smallint DEFAULT 48,
    "slaDueDate" timestamp(3) without time zone,
    "isWithinSLA" boolean DEFAULT true,
    "slaBreachDate" timestamp(3) without time zone,
    "ipAddress" character varying(45),
    "userAgent" text,
    "deviceInfo" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."Approval" OWNER TO creditorflow;

--
-- Name: Attachment; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."Attachment" (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "fileName" character varying(255) NOT NULL,
    "fileUrl" text NOT NULL,
    "fileType" character varying(50) NOT NULL,
    "fileSize" integer NOT NULL,
    "uploadedBy" character varying(255) NOT NULL,
    description text,
    checksum character varying(64),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."Attachment" OWNER TO creditorflow;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    action public."AuditAction" NOT NULL,
    "entityType" public."EntityType" NOT NULL,
    "entityId" character varying(255) NOT NULL,
    "entityDescription" text,
    "oldValue" jsonb,
    "newValue" jsonb,
    diff jsonb,
    "userId" text,
    "userEmail" character varying(255),
    "userRole" public."UserRole",
    "userDepartments" public."Department"[] DEFAULT ARRAY[]::public."Department"[],
    "userIp" character varying(45),
    "userAgent" text,
    "deviceInfo" text,
    "requestId" character varying(100),
    "sessionId" character varying(100),
    "correlationId" character varying(100),
    "browserInfo" text,
    location character varying(100),
    severity public."LogSeverity" DEFAULT 'INFO'::public."LogSeverity",
    "complianceFlags" character varying(50)[] DEFAULT (ARRAY[]::character varying[])::character varying(50)[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."AuditLog" OWNER TO creditorflow;

--
-- Name: Comment; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."Comment" (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "user" character varying(255) NOT NULL,
    content text NOT NULL,
    "isInternalNote" boolean DEFAULT false,
    attachments character varying(500)[] DEFAULT (ARRAY[]::character varying[])::character varying(500)[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."Comment" OWNER TO creditorflow;

--
-- Name: ComplianceRule; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."ComplianceRule" (
    id text NOT NULL,
    "ruleName" character varying(100) NOT NULL,
    "ruleType" public."ComplianceType" NOT NULL,
    description text NOT NULL,
    "ruleConfig" jsonb NOT NULL,
    "isEnabled" boolean DEFAULT true,
    severity public."LogSeverity" DEFAULT 'WARNING'::public."LogSeverity",
    "appliesTo" public."EntityType"[] NOT NULL,
    "createdBy" character varying(255) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "lastTriggered" timestamp(3) without time zone,
    "triggerCount" integer DEFAULT 0
);


ALTER TABLE public."ComplianceRule" OWNER TO creditorflow;

--
-- Name: FraudDetectionModel; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."FraudDetectionModel" (
    id text NOT NULL,
    "modelVersion" character varying(20) NOT NULL,
    "modelFilePath" character varying(500) NOT NULL,
    "trainingDate" timestamp(3) without time zone NOT NULL,
    accuracy numeric(5,2) NOT NULL,
    "precision" numeric(5,2) NOT NULL,
    recall numeric(5,2) NOT NULL,
    "f1Score" numeric(5,2) NOT NULL,
    threshold numeric(5,2) NOT NULL,
    "isActive" boolean DEFAULT false,
    features jsonb NOT NULL,
    hyperparameters jsonb NOT NULL,
    "trainingDataStats" jsonb NOT NULL,
    "validationStats" jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."FraudDetectionModel" OWNER TO creditorflow;

--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."Invoice" (
    id text NOT NULL,
    "invoiceNumber" character varying(50) NOT NULL,
    "supplierInvoiceNo" character varying(50),
    "referenceNumber" character varying(100),
    "quoteNumber" character varying(50),
    "invoiceDate" timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "paymentDate" timestamp(3) without time zone,
    "receivedDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "processedDate" timestamp(3) without time zone,
    "approvedDate" timestamp(3) without time zone,
    "paidDate" timestamp(3) without time zone,
    "subtotalExclVAT" numeric(15,2) NOT NULL,
    "subtotalInclVAT" numeric(15,2),
    "vatRate" numeric(5,2) DEFAULT 15.0,
    "vatAmount" numeric(15,2) NOT NULL,
    "totalAmount" numeric(15,2) NOT NULL,
    "amountPaid" numeric(15,2) DEFAULT 0,
    "amountDue" numeric(15,2) NOT NULL,
    "discountAmount" numeric(15,2) DEFAULT 0,
    "penaltyAmount" numeric(15,2) DEFAULT 0,
    currency character varying(3) DEFAULT 'ZAR'::character varying,
    "exchangeRate" numeric(10,6) DEFAULT 1.0,
    "supplierId" text,
    "supplierName" character varying(255) NOT NULL,
    "supplierVAT" character varying(20),
    "supplierRegNumber" character varying(50),
    "supplierEmail" character varying(255),
    "supplierPhone" character varying(20),
    "supplierAddress" text,
    "bankName" character varying(100),
    "branchName" character varying(100),
    "branchCode" character varying(20),
    "accountNumber" character varying(50),
    "accountType" public."AccountType",
    "accountHolder" character varying(255),
    "swiftCode" character varying(20),
    iban character varying(50),
    "paymentTerms" smallint DEFAULT 30,
    "discountTerms" smallint,
    "discountPercent" numeric(5,2),
    "pdfUrl" text,
    "pdfHash" character varying(64),
    "ocrText" text,
    "extractionConfidence" numeric(5,2) DEFAULT 0,
    "validationScore" numeric(5,2) DEFAULT 0,
    status public."InvoiceStatus" DEFAULT 'PENDING_APPROVAL'::public."InvoiceStatus",
    priority public."PriorityLevel" DEFAULT 'MEDIUM'::public."PriorityLevel",
    "isUrgent" boolean DEFAULT false,
    "requiresAttention" boolean DEFAULT false,
    "currentStage" smallint DEFAULT 1,
    "currentApproverId" text,
    "nextApproverId" text,
    "isDuplicate" boolean DEFAULT false,
    "duplicateParentId" text,
    "duplicateReason" text,
    "isEscalated" boolean DEFAULT false,
    "escalationReason" text,
    "escalatedBy" character varying(50),
    "escalatedDate" timestamp(3) without time zone,
    "createdById" text,
    "modifiedById" text,
    "vatCompliant" boolean DEFAULT false,
    "termsCompliant" boolean DEFAULT false,
    "fullyApproved" boolean DEFAULT false,
    "readyForPayment" boolean DEFAULT false,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" timestamp(3) without time zone
);


ALTER TABLE public."Invoice" OWNER TO creditorflow;

--
-- Name: LineItem; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."LineItem" (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "lineNumber" smallint NOT NULL,
    description text NOT NULL,
    "productCode" character varying(50),
    "unitOfMeasure" character varying(20),
    quantity numeric(15,4) NOT NULL,
    "unitPrice" numeric(15,4) NOT NULL,
    "vatRate" numeric(5,2) DEFAULT 15.0,
    "vatAmount" numeric(15,2) NOT NULL,
    "lineTotalExclVAT" numeric(15,2) NOT NULL,
    "lineTotalInclVAT" numeric(15,2) NOT NULL,
    "isValidated" boolean DEFAULT false,
    "validationNotes" text,
    "validationScore" numeric(5,2) DEFAULT 0,
    "glAccountCode" character varying(20),
    "costCenter" character varying(20),
    "projectCode" character varying(20),
    "departmentCode" character varying(20),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."LineItem" OWNER TO creditorflow;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."NotificationType" NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    priority public."PriorityLevel" DEFAULT 'MEDIUM'::public."PriorityLevel",
    "entityType" public."EntityType",
    "entityId" character varying(255),
    "isRead" boolean DEFAULT false,
    "isArchived" boolean DEFAULT false,
    "readDate" timestamp(3) without time zone,
    "deliveryMethod" public."DeliveryMethod" DEFAULT 'IN_APP'::public."DeliveryMethod",
    "sentViaEmail" boolean DEFAULT false,
    "sentViaSMS" boolean DEFAULT false,
    "emailSentDate" timestamp(3) without time zone,
    "smsSentDate" timestamp(3) without time zone,
    "emailTemplate" character varying(100),
    "smsTemplate" character varying(100),
    "expiresAt" timestamp(3) without time zone,
    actions jsonb,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."Notification" OWNER TO creditorflow;

--
-- Name: PaymentBatch; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."PaymentBatch" (
    id text NOT NULL,
    "batchNumber" character varying(50) NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "totalAmount" numeric(15,2) NOT NULL,
    "paymentCount" integer NOT NULL,
    status public."BatchStatus" DEFAULT 'PENDING_APPROVAL'::public."BatchStatus",
    "paymentMethod" public."PaymentMethod" NOT NULL,
    "bankAccount" character varying(100) NOT NULL,
    "approverId" text,
    "releasedAt" timestamp(3) without time zone,
    "releasedBy" character varying(255),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."PaymentBatch" OWNER TO creditorflow;

--
-- Name: Supplier; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."Supplier" (
    id text NOT NULL,
    name character varying(255) NOT NULL,
    "tradingName" character varying(255),
    "vatNumber" character varying(20),
    "registrationNumber" character varying(50),
    "bbeeLevel" character varying(10),
    "bbeeScore" numeric(5,2),
    email character varying(255),
    phone character varying(20),
    fax character varying(20),
    website character varying(255),
    "physicalAddress" text,
    "postalAddress" text,
    city character varying(100),
    province character varying(50),
    "postalCode" character varying(10),
    country character varying(100) DEFAULT 'South Africa'::character varying,
    "bankName" character varying(100),
    "branchName" character varying(100),
    "branchCode" character varying(20),
    "accountNumber" character varying(50),
    "accountType" public."AccountType",
    "accountHolder" character varying(255),
    "swiftCode" character varying(20),
    iban character varying(50),
    "paymentTerms" smallint DEFAULT 30,
    "discountTerms" smallint,
    "discountPercent" numeric(5,2),
    "preferredPaymentMethod" public."PaymentMethod",
    status public."SupplierStatus" DEFAULT 'PENDING_VERIFICATION'::public."SupplierStatus",
    "isPreferred" boolean DEFAULT false,
    "isBlacklisted" boolean DEFAULT false,
    "blacklistReason" text,
    "vatCompliant" boolean DEFAULT false,
    "taxCompliant" boolean DEFAULT false,
    "pepStatus" boolean,
    category public."SupplierCategory",
    subcategory character varying(100),
    "averageProcessingTime" integer,
    "approvalRate" numeric(5,2),
    "disputeRate" numeric(5,2),
    "riskScore" numeric(5,2),
    "createdById" text,
    "verifiedById" text,
    "verifiedDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" timestamp(3) without time zone
);


ALTER TABLE public."Supplier" OWNER TO creditorflow;

--
-- Name: SupplierContact; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."SupplierContact" (
    id text NOT NULL,
    "supplierId" text NOT NULL,
    name character varying(255) NOT NULL,
    title character varying(100),
    email character varying(255) NOT NULL,
    phone character varying(20),
    mobile character varying(20),
    "isPrimary" boolean DEFAULT false,
    "isAccountsContact" boolean DEFAULT false,
    "isPep" boolean,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."SupplierContact" OWNER TO creditorflow;

--
-- Name: SystemSetting; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."SystemSetting" (
    id text NOT NULL,
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    description text,
    category character varying(50),
    "isEncrypted" boolean DEFAULT false,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" character varying(255)
);


ALTER TABLE public."SystemSetting" OWNER TO creditorflow;

--
-- Name: User; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "employeeId" character varying(20) NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    title character varying(100) NOT NULL,
    role public."UserRole" NOT NULL,
    department public."Department" NOT NULL,
    "approvalLimit" numeric(15,2) DEFAULT 0,
    "dailyLimit" numeric(15,2) DEFAULT 0,
    "monthlyLimit" numeric(15,2) DEFAULT 0,
    "currentWorkload" smallint DEFAULT 0,
    "maxWorkload" smallint DEFAULT 50,
    "workloadCapacity" numeric(5,2) DEFAULT 100,
    phone character varying(20),
    extension character varying(10),
    location character varying(100),
    "isActive" boolean DEFAULT true,
    "isOnLeave" boolean DEFAULT false,
    "leaveStart" timestamp(3) without time zone,
    "leaveEnd" timestamp(3) without time zone,
    "backupApproverId" text,
    "lastLogin" timestamp(3) without time zone,
    "failedLoginAttempts" smallint DEFAULT 0,
    "passwordHash" character varying(255) NOT NULL,
    "passwordResetToken" character varying(255),
    "passwordResetExpires" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" timestamp(3) without time zone
);


ALTER TABLE public."User" OWNER TO creditorflow;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO creditorflow;

--
-- Name: dashboard_metrics; Type: MATERIALIZED VIEW; Schema: public; Owner: creditorflow
--

CREATE MATERIALIZED VIEW public.dashboard_metrics AS
 SELECT date_trunc('day'::text, "createdAt") AS date,
    count(*) AS total_invoices,
    count(
        CASE
            WHEN (status = 'APPROVED'::public."InvoiceStatus") THEN 1
            ELSE NULL::integer
        END) AS approved_invoices,
    count(
        CASE
            WHEN (status = 'REJECTED'::public."InvoiceStatus") THEN 1
            ELSE NULL::integer
        END) AS rejected_invoices,
    count(
        CASE
            WHEN (status = 'PENDING_APPROVAL'::public."InvoiceStatus") THEN 1
            ELSE NULL::integer
        END) AS pending_invoices,
    sum(
        CASE
            WHEN (status = 'APPROVED'::public."InvoiceStatus") THEN "totalAmount"
            ELSE (0)::numeric
        END) AS approved_amount,
    avg(EXTRACT(day FROM ("approvedDate" - "createdAt"))) AS avg_approval_days
   FROM public."Invoice"
  WHERE ("createdAt" >= (CURRENT_DATE - '30 days'::interval))
  GROUP BY (date_trunc('day'::text, "createdAt"))
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.dashboard_metrics OWNER TO creditorflow;

--
-- Data for Name: Approval; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public."Approval" (id, "invoiceId", "sequenceNumber", "totalStages", "approverId", "approverRole", "approverLimit", status, decision, "decisionDate", comments, "invoiceAmount", "canApprove", "isDelegated", "delegatedToId", "delegationReason", "isEscalated", "escalatedFromId", "escalationReason", "assignedDate", "viewedDate", "actionDate", "slaHours", "slaDueDate", "isWithinSLA", "slaBreachDate", "ipAddress", "userAgent", "deviceInfo", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Attachment; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public."Attachment" (id, "invoiceId", "fileName", "fileUrl", "fileType", "fileSize", "uploadedBy", description, checksum, "createdAt") FROM stdin;
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public."AuditLog" (id, action, "entityType", "entityId", "entityDescription", "oldValue", "newValue", diff, "userId", "userEmail", "userRole", "userDepartments", "userIp", "userAgent", "deviceInfo", "requestId", "sessionId", "correlationId", "browserInfo", location, severity, "complianceFlags", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Comment; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public."Comment" (id, "invoiceId", "user", content, "isInternalNote", attachments, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ComplianceRule; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public."ComplianceRule" (id, "ruleName", "ruleType", description, "ruleConfig", "isEnabled", severity, "appliesTo", "createdBy", "createdAt", "updatedAt", "lastTriggered", "triggerCount") FROM stdin;
\.


--
-- Data for Name: FraudDetectionModel; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public."FraudDetectionModel" (id, "modelVersion", "modelFilePath", "trainingDate", accuracy, "precision", recall, "f1Score", threshold, "isActive", features, hyperparameters, "trainingDataStats", "validationStats", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public."Invoice" (id, "invoiceNumber", "supplierInvoiceNo", "referenceNumber", "quoteNumber", "invoiceDate", "dueDate", "paymentDate", "receivedDate", "processedDate", "approvedDate", "paidDate", "subtotalExclVAT", "subtotalInclVAT", "vatRate", "vatAmount", "totalAmount", "amountPaid", "amountDue", "discountAmount", "penaltyAmount", currency, "exchangeRate", "supplierId", "supplierName", "supplierVAT", "supplierRegNumber", "supplierEmail", "supplierPhone", "supplierAddress", "bankName", "branchName", "branchCode", "accountNumber", "accountType", "accountHolder", "swiftCode", iban, "paymentTerms", "discountTerms", "discountPercent", "pdfUrl", "pdfHash", "ocrText", "extractionConfidence", "validationScore", status, priority, "isUrgent", "requiresAttention", "currentStage", "currentApproverId", "nextApproverId", "isDuplicate", "duplicateParentId", "duplicateReason", "isEscalated", "escalationReason", "escalatedBy", "escalatedDate", "createdById", "modifiedById", "vatCompliant", "termsCompliant", "fullyApproved", "readyForPayment", "createdAt", "updatedAt", "archivedAt") FROM stdin;
\.


--
-- Data for Name: LineItem; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public."LineItem" (id, "invoiceId", "lineNumber", description, "productCode", "unitOfMeasure", quantity, "unitPrice", "vatRate", "vatAmount", "lineTotalExclVAT", "lineTotalInclVAT", "isValidated", "validationNotes", "validationScore", "glAccountCode", "costCenter", "projectCode", "departmentCode", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public."Notification" (id, "userId", type, title, message, priority, "entityType", "entityId", "isRead", "isArchived", "readDate", "deliveryMethod", "sentViaEmail", "sentViaSMS", "emailSentDate", "smsSentDate", "emailTemplate", "smsTemplate", "expiresAt", actions, metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PaymentBatch; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public."PaymentBatch" (id, "batchNumber", "paymentDate", "totalAmount", "paymentCount", status, "paymentMethod", "bankAccount", "approverId", "releasedAt", "releasedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Supplier; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public."Supplier" (id, name, "tradingName", "vatNumber", "registrationNumber", "bbeeLevel", "bbeeScore", email, phone, fax, website, "physicalAddress", "postalAddress", city, province, "postalCode", country, "bankName", "branchName", "branchCode", "accountNumber", "accountType", "accountHolder", "swiftCode", iban, "paymentTerms", "discountTerms", "discountPercent", "preferredPaymentMethod", status, "isPreferred", "isBlacklisted", "blacklistReason", "vatCompliant", "taxCompliant", "pepStatus", category, subcategory, "averageProcessingTime", "approvalRate", "disputeRate", "riskScore", "createdById", "verifiedById", "verifiedDate", "createdAt", "updatedAt", "archivedAt") FROM stdin;
\.


--
-- Data for Name: SupplierContact; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public."SupplierContact" (id, "supplierId", name, title, email, phone, mobile, "isPrimary", "isAccountsContact", "isPep", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SystemSetting; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public."SystemSetting" (id, key, value, description, category, "isEncrypted", "createdAt", "updatedAt", "updatedBy") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public."User" (id, "employeeId", email, name, title, role, department, "approvalLimit", "dailyLimit", "monthlyLimit", "currentWorkload", "maxWorkload", "workloadCapacity", phone, extension, location, "isActive", "isOnLeave", "leaveStart", "leaveEnd", "backupApproverId", "lastLogin", "failedLoginAttempts", "passwordHash", "passwordResetToken", "passwordResetExpires", "createdAt", "updatedAt", "archivedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
b7eefd42-2132-4964-b13e-c79d755f642f	06819e8c59a35e7edc352c83dd67257b315c7672ef2453014757f43a268256b4	2026-02-19 09:35:52.222246+00	20260205175050_init	\N	\N	2026-02-19 09:35:51.474399+00	1
\.


--
-- Name: Approval Approval_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Approval"
    ADD CONSTRAINT "Approval_pkey" PRIMARY KEY (id);


--
-- Name: Attachment Attachment_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Attachment"
    ADD CONSTRAINT "Attachment_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Comment Comment_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_pkey" PRIMARY KEY (id);


--
-- Name: ComplianceRule ComplianceRule_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."ComplianceRule"
    ADD CONSTRAINT "ComplianceRule_pkey" PRIMARY KEY (id);


--
-- Name: FraudDetectionModel FraudDetectionModel_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."FraudDetectionModel"
    ADD CONSTRAINT "FraudDetectionModel_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: LineItem LineItem_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."LineItem"
    ADD CONSTRAINT "LineItem_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: PaymentBatch PaymentBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."PaymentBatch"
    ADD CONSTRAINT "PaymentBatch_pkey" PRIMARY KEY (id);


--
-- Name: SupplierContact SupplierContact_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."SupplierContact"
    ADD CONSTRAINT "SupplierContact_pkey" PRIMARY KEY (id);


--
-- Name: Supplier Supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY (id);


--
-- Name: SystemSetting SystemSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Approval_approverId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Approval_approverId_idx" ON public."Approval" USING btree ("approverId");


--
-- Name: Approval_assignedDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Approval_assignedDate_idx" ON public."Approval" USING btree ("assignedDate");


--
-- Name: Approval_decisionDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Approval_decisionDate_idx" ON public."Approval" USING btree ("decisionDate");


--
-- Name: Approval_invoiceId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Approval_invoiceId_idx" ON public."Approval" USING btree ("invoiceId");


--
-- Name: Approval_invoiceId_sequenceNumber_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Approval_invoiceId_sequenceNumber_idx" ON public."Approval" USING btree ("invoiceId", "sequenceNumber");


--
-- Name: Approval_isWithinSLA_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Approval_isWithinSLA_idx" ON public."Approval" USING btree ("isWithinSLA");


--
-- Name: Approval_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Approval_status_idx" ON public."Approval" USING btree (status);


--
-- Name: Attachment_invoiceId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Attachment_invoiceId_idx" ON public."Attachment" USING btree ("invoiceId");


--
-- Name: Attachment_uploadedBy_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Attachment_uploadedBy_idx" ON public."Attachment" USING btree ("uploadedBy");


--
-- Name: AuditLog_action_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "AuditLog_action_idx" ON public."AuditLog" USING btree (action);


--
-- Name: AuditLog_correlationId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "AuditLog_correlationId_idx" ON public."AuditLog" USING btree ("correlationId");


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "AuditLog_entityType_entityId_idx" ON public."AuditLog" USING btree ("entityType", "entityId");


--
-- Name: AuditLog_requestId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "AuditLog_requestId_idx" ON public."AuditLog" USING btree ("requestId");


--
-- Name: AuditLog_severity_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "AuditLog_severity_idx" ON public."AuditLog" USING btree (severity);


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: Comment_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Comment_createdAt_idx" ON public."Comment" USING btree ("createdAt");


--
-- Name: Comment_invoiceId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Comment_invoiceId_idx" ON public."Comment" USING btree ("invoiceId");


--
-- Name: Comment_user_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Comment_user_idx" ON public."Comment" USING btree ("user");


--
-- Name: ComplianceRule_appliesTo_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "ComplianceRule_appliesTo_idx" ON public."ComplianceRule" USING gin ("appliesTo");


--
-- Name: ComplianceRule_isEnabled_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "ComplianceRule_isEnabled_idx" ON public."ComplianceRule" USING btree ("isEnabled");


--
-- Name: ComplianceRule_ruleName_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "ComplianceRule_ruleName_key" ON public."ComplianceRule" USING btree ("ruleName");


--
-- Name: ComplianceRule_ruleType_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "ComplianceRule_ruleType_idx" ON public."ComplianceRule" USING btree ("ruleType");


--
-- Name: FraudDetectionModel_isActive_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "FraudDetectionModel_isActive_idx" ON public."FraudDetectionModel" USING btree ("isActive");


--
-- Name: FraudDetectionModel_modelVersion_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "FraudDetectionModel_modelVersion_key" ON public."FraudDetectionModel" USING btree ("modelVersion");


--
-- Name: Invoice_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Invoice_createdAt_idx" ON public."Invoice" USING btree ("createdAt");


--
-- Name: Invoice_currentApproverId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Invoice_currentApproverId_idx" ON public."Invoice" USING btree ("currentApproverId");


--
-- Name: Invoice_dueDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Invoice_dueDate_idx" ON public."Invoice" USING btree ("dueDate");


--
-- Name: Invoice_invoiceNumber_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Invoice_invoiceNumber_idx" ON public."Invoice" USING btree ("invoiceNumber");


--
-- Name: Invoice_invoiceNumber_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON public."Invoice" USING btree ("invoiceNumber");


--
-- Name: Invoice_isDuplicate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Invoice_isDuplicate_idx" ON public."Invoice" USING btree ("isDuplicate");


--
-- Name: Invoice_paymentDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Invoice_paymentDate_idx" ON public."Invoice" USING btree ("paymentDate");


--
-- Name: Invoice_receivedDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Invoice_receivedDate_idx" ON public."Invoice" USING btree ("receivedDate");


--
-- Name: Invoice_status_dueDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Invoice_status_dueDate_idx" ON public."Invoice" USING btree (status, "dueDate");


--
-- Name: Invoice_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Invoice_status_idx" ON public."Invoice" USING btree (status);


--
-- Name: Invoice_supplierId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Invoice_supplierId_idx" ON public."Invoice" USING btree ("supplierId");


--
-- Name: Invoice_supplierName_invoiceDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Invoice_supplierName_invoiceDate_idx" ON public."Invoice" USING btree ("supplierName", "invoiceDate");


--
-- Name: Invoice_totalAmount_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Invoice_totalAmount_idx" ON public."Invoice" USING btree ("totalAmount");


--
-- Name: LineItem_costCenter_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "LineItem_costCenter_idx" ON public."LineItem" USING btree ("costCenter");


--
-- Name: LineItem_departmentCode_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "LineItem_departmentCode_idx" ON public."LineItem" USING btree ("departmentCode");


--
-- Name: LineItem_glAccountCode_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "LineItem_glAccountCode_idx" ON public."LineItem" USING btree ("glAccountCode");


--
-- Name: LineItem_invoiceId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "LineItem_invoiceId_idx" ON public."LineItem" USING btree ("invoiceId");


--
-- Name: Notification_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Notification_createdAt_idx" ON public."Notification" USING btree ("createdAt");


--
-- Name: Notification_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Notification_entityType_entityId_idx" ON public."Notification" USING btree ("entityType", "entityId");


--
-- Name: Notification_isRead_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Notification_isRead_idx" ON public."Notification" USING btree ("isRead");


--
-- Name: Notification_type_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Notification_type_idx" ON public."Notification" USING btree (type);


--
-- Name: Notification_userId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Notification_userId_idx" ON public."Notification" USING btree ("userId");


--
-- Name: PaymentBatch_batchNumber_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "PaymentBatch_batchNumber_key" ON public."PaymentBatch" USING btree ("batchNumber");


--
-- Name: PaymentBatch_paymentDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "PaymentBatch_paymentDate_idx" ON public."PaymentBatch" USING btree ("paymentDate");


--
-- Name: PaymentBatch_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "PaymentBatch_status_idx" ON public."PaymentBatch" USING btree (status);


--
-- Name: SupplierContact_email_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "SupplierContact_email_idx" ON public."SupplierContact" USING btree (email);


--
-- Name: SupplierContact_isPrimary_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "SupplierContact_isPrimary_idx" ON public."SupplierContact" USING btree ("isPrimary");


--
-- Name: SupplierContact_supplierId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "SupplierContact_supplierId_idx" ON public."SupplierContact" USING btree ("supplierId");


--
-- Name: Supplier_category_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Supplier_category_idx" ON public."Supplier" USING btree (category);


--
-- Name: Supplier_isBlacklisted_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Supplier_isBlacklisted_idx" ON public."Supplier" USING btree ("isBlacklisted");


--
-- Name: Supplier_name_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "Supplier_name_key" ON public."Supplier" USING btree (name);


--
-- Name: Supplier_riskScore_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Supplier_riskScore_idx" ON public."Supplier" USING btree ("riskScore");


--
-- Name: Supplier_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Supplier_status_idx" ON public."Supplier" USING btree (status);


--
-- Name: Supplier_vatNumber_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "Supplier_vatNumber_idx" ON public."Supplier" USING btree ("vatNumber");


--
-- Name: SystemSetting_key_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "SystemSetting_key_key" ON public."SystemSetting" USING btree (key);


--
-- Name: User_approvalLimit_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "User_approvalLimit_idx" ON public."User" USING btree ("approvalLimit");


--
-- Name: User_department_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "User_department_idx" ON public."User" USING btree (department);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_employeeId_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "User_employeeId_key" ON public."User" USING btree ("employeeId");


--
-- Name: User_isActive_isOnLeave_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "User_isActive_isOnLeave_idx" ON public."User" USING btree ("isActive", "isOnLeave");


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: dashboard_metrics_date_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX dashboard_metrics_date_idx ON public.dashboard_metrics USING btree (date);


--
-- Name: Approval check_approval_sla; Type: TRIGGER; Schema: public; Owner: creditorflow
--

CREATE TRIGGER check_approval_sla BEFORE UPDATE ON public."Approval" FOR EACH ROW EXECUTE FUNCTION public.check_sla_breach();


--
-- Name: Approval update_approval_updated_at; Type: TRIGGER; Schema: public; Owner: creditorflow
--

CREATE TRIGGER update_approval_updated_at BEFORE UPDATE ON public."Approval" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: AuditLog update_auditlog_updated_at; Type: TRIGGER; Schema: public; Owner: creditorflow
--

CREATE TRIGGER update_auditlog_updated_at BEFORE UPDATE ON public."AuditLog" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Comment update_comment_updated_at; Type: TRIGGER; Schema: public; Owner: creditorflow
--

CREATE TRIGGER update_comment_updated_at BEFORE UPDATE ON public."Comment" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ComplianceRule update_compliancerule_updated_at; Type: TRIGGER; Schema: public; Owner: creditorflow
--

CREATE TRIGGER update_compliancerule_updated_at BEFORE UPDATE ON public."ComplianceRule" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: FraudDetectionModel update_frauddetectionmodel_updated_at; Type: TRIGGER; Schema: public; Owner: creditorflow
--

CREATE TRIGGER update_frauddetectionmodel_updated_at BEFORE UPDATE ON public."FraudDetectionModel" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Invoice update_invoice_updated_at; Type: TRIGGER; Schema: public; Owner: creditorflow
--

CREATE TRIGGER update_invoice_updated_at BEFORE UPDATE ON public."Invoice" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: LineItem update_lineitem_updated_at; Type: TRIGGER; Schema: public; Owner: creditorflow
--

CREATE TRIGGER update_lineitem_updated_at BEFORE UPDATE ON public."LineItem" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Notification update_notification_updated_at; Type: TRIGGER; Schema: public; Owner: creditorflow
--

CREATE TRIGGER update_notification_updated_at BEFORE UPDATE ON public."Notification" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: PaymentBatch update_paymentbatch_updated_at; Type: TRIGGER; Schema: public; Owner: creditorflow
--

CREATE TRIGGER update_paymentbatch_updated_at BEFORE UPDATE ON public."PaymentBatch" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Supplier update_supplier_updated_at; Type: TRIGGER; Schema: public; Owner: creditorflow
--

CREATE TRIGGER update_supplier_updated_at BEFORE UPDATE ON public."Supplier" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: SupplierContact update_suppliercontact_updated_at; Type: TRIGGER; Schema: public; Owner: creditorflow
--

CREATE TRIGGER update_suppliercontact_updated_at BEFORE UPDATE ON public."SupplierContact" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: SystemSetting update_systemsetting_updated_at; Type: TRIGGER; Schema: public; Owner: creditorflow
--

CREATE TRIGGER update_systemsetting_updated_at BEFORE UPDATE ON public."SystemSetting" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: User update_user_updated_at; Type: TRIGGER; Schema: public; Owner: creditorflow
--

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON public."User" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Approval Approval_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Approval"
    ADD CONSTRAINT "Approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Approval Approval_delegatedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Approval"
    ADD CONSTRAINT "Approval_delegatedToId_fkey" FOREIGN KEY ("delegatedToId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Approval Approval_escalatedFromId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Approval"
    ADD CONSTRAINT "Approval_escalatedFromId_fkey" FOREIGN KEY ("escalatedFromId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Approval Approval_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Approval"
    ADD CONSTRAINT "Approval_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Attachment Attachment_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Attachment"
    ADD CONSTRAINT "Attachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Comment Comment_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Invoice Invoice_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_currentApproverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_currentApproverId_fkey" FOREIGN KEY ("currentApproverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_duplicateParentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_duplicateParentId_fkey" FOREIGN KEY ("duplicateParentId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_modifiedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_modifiedById_fkey" FOREIGN KEY ("modifiedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_nextApproverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_nextApproverId_fkey" FOREIGN KEY ("nextApproverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LineItem LineItem_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."LineItem"
    ADD CONSTRAINT "LineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaymentBatch PaymentBatch_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."PaymentBatch"
    ADD CONSTRAINT "PaymentBatch_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SupplierContact SupplierContact_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."SupplierContact"
    ADD CONSTRAINT "SupplierContact_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Supplier Supplier_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Supplier Supplier_verifiedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_backupApproverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_backupApproverId_fkey" FOREIGN KEY ("backupApproverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dashboard_metrics; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: creditorflow
--

REFRESH MATERIALIZED VIEW public.dashboard_metrics;


--
-- PostgreSQL database dump complete
--

\unrestrict hu5twIaT9QaZ0I8qQCWyfSc02R3CMGylWvvfJtImetNBT4VgSZ2KfnVN2XKPG8A

