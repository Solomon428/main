--
-- PostgreSQL database dump
--

\restrict vFw2GSfNi6jbOmphECa6UK9It9BFVm4JzXswssajRArKeyeCPs4vtidGSFWY3Jb

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: creditorflow
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO creditorflow;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: creditorflow
--

COMMENT ON SCHEMA public IS '';


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
    'APPROVED',
    'REJECTED',
    'REQUESTED_CHANGES',
    'DELEGATED',
    'ESCALATED',
    'SKIPPED'
);


ALTER TYPE public."ApprovalDecision" OWNER TO creditorflow;

--
-- Name: ApprovalStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."ApprovalStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'APPROVED',
    'REJECTED',
    'ESCALATED',
    'DELEGATED',
    'CANCELLED',
    'AWAITING_DOCUMENTATION'
);


ALTER TYPE public."ApprovalStatus" OWNER TO creditorflow;

--
-- Name: AuditAction; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."AuditAction" AS ENUM (
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'EXPORT',
    'IMPORT',
    'APPROVE',
    'REJECT',
    'DELEGATE',
    'ESCALATE',
    'PAY',
    'CANCEL',
    'RESTORE',
    'ARCHIVE',
    'DOWNLOAD',
    'SHARE',
    'CONFIG_CHANGE'
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
-- Name: Department; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."Department" AS ENUM (
    'IT',
    'FINANCE',
    'OPERATIONS',
    'AUDIT',
    'PROCUREMENT',
    'SALES',
    'LEGAL',
    'HR',
    'ADMINISTRATION'
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
    'SUPPLIER',
    'USER',
    'ORGANIZATION',
    'PAYMENT',
    'APPROVAL',
    'COMPLIANCE_CHECK',
    'AUDIT_LOG',
    'FILE_ATTACHMENT',
    'INTEGRATION'
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
    'SUBMITTED',
    'PROCESSING',
    'VALIDATED',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'PAID',
    'PARTIALLY_PAID',
    'CANCELLED',
    'DISPUTED',
    'ARCHIVED',
    'PENDING_EXTRACTION',
    'UNDER_REVIEW'
);


ALTER TYPE public."InvoiceStatus" OWNER TO creditorflow;

--
-- Name: LogSeverity; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."LogSeverity" AS ENUM (
    'INFO',
    'WARNING',
    'ERROR',
    'CRITICAL',
    'DEBUG',
    'AUDIT',
    'SECURITY',
    'COMPLIANCE'
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
    'INVOICE_SUBMITTED',
    'APPROVAL_REQUESTED',
    'APPROVAL_DECISION',
    'APPROVAL_ESCALATED',
    'APPROVAL_DELEGATED',
    'PAYMENT_SCHEDULED',
    'PAYMENT_PROCESSED',
    'PAYMENT_FAILED',
    'SLA_BREACH',
    'SLA_WARNING',
    'RISK_ALERT',
    'COMPLIANCE_ALERT',
    'COMPLIANCE_FAILURE',
    'SYSTEM_ALERT',
    'USER_INVITATION',
    'PASSWORD_RESET',
    'TWO_FACTOR_ENABLED',
    'ACCOUNT_LOCKED',
    'SUPPLIER_VERIFIED',
    'SUPPLIER_BLACKLISTED',
    'INVOICE_DUPLICATE_DETECTED',
    'INVOICE_ANOMALY_DETECTED'
);


ALTER TYPE public."NotificationType" OWNER TO creditorflow;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'BANK_TRANSFER',
    'CHECK',
    'CREDIT_CARD',
    'DEBIT_CARD',
    'DIGITAL_WALLET',
    'CASH',
    'EFT',
    'WIRE_TRANSFER',
    'CREDIT_NOTE'
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
    'BOTH',
    'CONSULTING',
    'UTILITIES',
    'RENT',
    'INSURANCE',
    'LOGISTICS',
    'TECHNOLOGY',
    'MARKETING',
    'LEGAL',
    'FINANCIAL'
);


ALTER TYPE public."SupplierCategory" OWNER TO creditorflow;

--
-- Name: SupplierStatus; Type: TYPE; Schema: public; Owner: creditorflow
--

CREATE TYPE public."SupplierStatus" AS ENUM (
    'PENDING_VERIFICATION',
    'VERIFIED',
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'BLACKLISTED',
    'UNDER_REVIEW',
    'REJECTED'
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
    'SUPER_ADMIN',
    'ADMIN',
    'FINANCE_MANAGER',
    'APPROVER',
    'PROCUREMENT',
    'VIEWER',
    'AUDITOR',
    'CREDIT_CLERK',
    'BRANCH_MANAGER',
    'FINANCIAL_MANAGER',
    'EXECUTIVE',
    'GROUP_FINANCIAL_MANAGER'
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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _OrganizationMembers; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."_OrganizationMembers" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_OrganizationMembers" OWNER TO creditorflow;

--
-- Name: _SupplierTags; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public."_SupplierTags" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_SupplierTags" OWNER TO creditorflow;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.accounts (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text,
    oauth_token_secret text,
    oauth_token text,
    profile_data jsonb
);


ALTER TABLE public.accounts OWNER TO creditorflow;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.api_keys (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    "keyHash" text NOT NULL,
    prefix text NOT NULL,
    "lastUsedAt" timestamp(3) without time zone,
    "lastUsedIp" text,
    "expiresAt" timestamp(3) without time zone,
    permissions text[],
    scopes text[],
    "rateLimit" integer DEFAULT 1000 NOT NULL,
    "rateLimitWindow" text DEFAULT '1h'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "revokedBy" text,
    "revokedReason" text
);


ALTER TABLE public.api_keys OWNER TO creditorflow;

--
-- Name: approval_chains; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.approval_chains (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    description text,
    type public."ApprovalChainType" DEFAULT 'SEQUENTIAL'::public."ApprovalChainType" NOT NULL,
    department text,
    category text,
    "minAmount" numeric(18,2) DEFAULT 0,
    "maxAmount" numeric(18,2),
    currency public."Currency" DEFAULT 'ZAR'::public."Currency" NOT NULL,
    levels jsonb NOT NULL,
    "approverRoles" text[],
    "specificApprovers" text[],
    "alternateApprovers" text[],
    "autoEscalation" boolean DEFAULT true NOT NULL,
    "escalationHours" integer DEFAULT 24 NOT NULL,
    "reminderHours" integer DEFAULT 12 NOT NULL,
    "allowDelegation" boolean DEFAULT true NOT NULL,
    "requireAllApprovers" boolean DEFAULT false NOT NULL,
    conditions jsonb,
    rules jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "userId" text
);


ALTER TABLE public.approval_chains OWNER TO creditorflow;

--
-- Name: approvals; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.approvals (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "approvalChainId" text,
    "approverId" text NOT NULL,
    level integer NOT NULL,
    sequence integer DEFAULT 1 NOT NULL,
    status public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    decision public."ApprovalDecision",
    "decisionNotes" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "isDelegated" boolean DEFAULT false NOT NULL,
    "delegatedFromId" text,
    "delegatedToId" text,
    "delegatedAt" timestamp(3) without time zone,
    "delegationReason" text,
    "isEscalated" boolean DEFAULT false NOT NULL,
    "escalatedAt" timestamp(3) without time zone,
    "escalatedReason" text,
    "escalatedToId" text,
    "slaDueDate" timestamp(3) without time zone NOT NULL,
    "slaBreachDate" timestamp(3) without time zone,
    "reminderSentAt" timestamp(3) without time zone,
    "escalationSentAt" timestamp(3) without time zone,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "viewedAt" timestamp(3) without time zone,
    "actionedAt" timestamp(3) without time zone,
    "ipAddress" text,
    "userAgent" text,
    "deviceInfo" text,
    "geoLocation" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.approvals OWNER TO creditorflow;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "organizationId" text,
    "userId" text,
    action public."AuditAction" NOT NULL,
    "entityType" public."EntityType" NOT NULL,
    "entityId" text NOT NULL,
    "entityDescription" text,
    "oldValue" jsonb,
    "newValue" jsonb,
    diff jsonb,
    "changesSummary" text,
    "userEmail" text,
    "userRole" text,
    "userDepartment" text,
    "ipAddress" text,
    "userAgent" text,
    "deviceInfo" text,
    "geoLocation" text,
    "requestId" text,
    "sessionId" text,
    "correlationId" text,
    severity public."LogSeverity" DEFAULT 'INFO'::public."LogSeverity" NOT NULL,
    "complianceFlags" text[],
    "retentionDate" timestamp(3) without time zone,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO creditorflow;

--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.bank_accounts (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "accountName" text NOT NULL,
    "accountNumber" text NOT NULL,
    "bankName" text NOT NULL,
    "bankCode" text,
    "branchName" text,
    "branchCode" text,
    "swiftCode" text,
    iban text,
    currency public."Currency" DEFAULT 'ZAR'::public."Currency" NOT NULL,
    "accountType" public."BankAccountType" DEFAULT 'CURRENT'::public."BankAccountType" NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "openingBalance" numeric(18,2) DEFAULT 0 NOT NULL,
    "currentBalance" numeric(18,2) DEFAULT 0 NOT NULL,
    "availableBalance" numeric(18,2) DEFAULT 0 NOT NULL,
    "lastReconciledAt" timestamp(3) without time zone,
    "integrationId" text,
    "lastSyncAt" timestamp(3) without time zone,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.bank_accounts OWNER TO creditorflow;

--
-- Name: compliance_checks; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.compliance_checks (
    id text NOT NULL,
    "invoiceId" text,
    "supplierId" text,
    "organizationId" text NOT NULL,
    "validatorId" text,
    "checkType" public."ComplianceCheckType" NOT NULL,
    status public."ComplianceStatus" NOT NULL,
    severity text,
    details jsonb,
    errors text[],
    warnings text[],
    "passedChecks" text[],
    recommendations text[],
    "validatedAt" timestamp(3) without time zone,
    "validatorNotes" text,
    evidence text[],
    "remediatedAt" timestamp(3) without time zone,
    "remediatedBy" text,
    "remediationNotes" text,
    "rulesVersion" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.compliance_checks OWNER TO creditorflow;

--
-- Name: custom_fields; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.custom_fields (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "entityType" public."EntityType" NOT NULL,
    "fieldName" text NOT NULL,
    "fieldLabel" text NOT NULL,
    "fieldType" text NOT NULL,
    options jsonb,
    "defaultValue" text,
    "isRequired" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    validation jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.custom_fields OWNER TO creditorflow;

--
-- Name: delegated_approvals; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.delegated_approvals (
    id text NOT NULL,
    "approvalChainId" text,
    "delegatorId" text NOT NULL,
    "delegateeId" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    reason text,
    scope text DEFAULT 'ALL'::text NOT NULL,
    "specificCategories" text[],
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "cancelledAt" timestamp(3) without time zone,
    "cancelledBy" text,
    "cancelReason" text
);


ALTER TABLE public.delegated_approvals OWNER TO creditorflow;

--
-- Name: file_attachments; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.file_attachments (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "entityType" public."EntityType" NOT NULL,
    "entityId" text NOT NULL,
    "uploaderId" text NOT NULL,
    "fileName" text NOT NULL,
    "originalName" text NOT NULL,
    "fileType" text NOT NULL,
    "fileExtension" text NOT NULL,
    "fileSize" integer NOT NULL,
    checksum text,
    "storageProvider" public."StorageProvider" DEFAULT 'S3'::public."StorageProvider" NOT NULL,
    "storagePath" text NOT NULL,
    bucket text,
    region text,
    url text NOT NULL,
    "thumbnailUrl" text,
    "previewUrl" text,
    "ocrText" text,
    "ocrConfidence" numeric(5,2),
    "ocrProcessedAt" timestamp(3) without time zone,
    "processingStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "processingError" text,
    "encryptionKey" text,
    "isEncrypted" boolean DEFAULT false NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL,
    "accessCount" integer DEFAULT 0 NOT NULL,
    "lastAccessedAt" timestamp(3) without time zone,
    "retentionDays" integer,
    "deleteAfter" timestamp(3) without time zone,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "deletedBy" text
);


ALTER TABLE public.file_attachments OWNER TO creditorflow;

--
-- Name: integration_sync_logs; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.integration_sync_logs (
    id text NOT NULL,
    "integrationId" text NOT NULL,
    "syncType" text NOT NULL,
    status public."SyncStatus" NOT NULL,
    "recordsProcessed" integer DEFAULT 0 NOT NULL,
    "recordsSucceeded" integer DEFAULT 0 NOT NULL,
    "recordsFailed" integer DEFAULT 0 NOT NULL,
    errors jsonb,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    duration integer,
    "triggeredBy" text NOT NULL,
    metadata jsonb
);


ALTER TABLE public.integration_sync_logs OWNER TO creditorflow;

--
-- Name: integrations; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.integrations (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    type public."IntegrationType" NOT NULL,
    provider text NOT NULL,
    config jsonb NOT NULL,
    credentials jsonb,
    settings jsonb,
    status public."IntegrationStatus" DEFAULT 'PENDING'::public."IntegrationStatus" NOT NULL,
    "lastSyncAt" timestamp(3) without time zone,
    "lastSyncStatus" public."SyncStatus",
    "lastSyncError" text,
    "nextSyncAt" timestamp(3) without time zone,
    "totalSyncs" integer DEFAULT 0 NOT NULL,
    "successfulSyncs" integer DEFAULT 0 NOT NULL,
    "failedSyncs" integer DEFAULT 0 NOT NULL,
    "webhookUrl" text,
    "webhookSecret" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.integrations OWNER TO creditorflow;

--
-- Name: invoice_activities; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.invoice_activities (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "actorId" text,
    "actorType" text DEFAULT 'USER'::text NOT NULL,
    "actorName" text,
    action text NOT NULL,
    description text,
    "oldValue" jsonb,
    "newValue" jsonb,
    metadata jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.invoice_activities OWNER TO creditorflow;

--
-- Name: invoice_comments; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.invoice_comments (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "userId" text,
    "userName" text,
    content text NOT NULL,
    "isInternal" boolean DEFAULT true NOT NULL,
    "isSystemGenerated" boolean DEFAULT false NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL,
    "parentId" text,
    mentions text[],
    attachments text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.invoice_comments OWNER TO creditorflow;

--
-- Name: invoice_line_items; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.invoice_line_items (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "lineNumber" integer NOT NULL,
    description text NOT NULL,
    "productCode" text,
    sku text,
    quantity numeric(18,4) DEFAULT 1 NOT NULL,
    "unitPrice" numeric(18,4) DEFAULT 0 NOT NULL,
    "unitOfMeasure" text DEFAULT 'EA'::text,
    "vatRate" numeric(5,2) DEFAULT 15.00,
    "vatAmount" numeric(18,2) DEFAULT 0,
    "discountRate" numeric(5,2) DEFAULT 0,
    "discountAmount" numeric(18,2) DEFAULT 0,
    "netAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "lineTotalExclVAT" numeric(18,2) DEFAULT 0 NOT NULL,
    "lineTotalInclVAT" numeric(18,2) DEFAULT 0 NOT NULL,
    "glCode" text,
    "costCenter" text,
    "projectCode" text,
    department text,
    "budgetCategory" text,
    "isValidated" boolean DEFAULT false NOT NULL,
    "validationNotes" text,
    "validationScore" numeric(5,2),
    "matchedPONumber" text,
    "matchedPOQuantity" numeric(18,4),
    "matchedPOPrice" numeric(18,4),
    "matchingStatus" public."MatchingStatus" DEFAULT 'UNMATCHED'::public."MatchingStatus" NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.invoice_line_items OWNER TO creditorflow;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.invoices (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "invoiceNumber" text NOT NULL,
    "supplierId" text,
    "creatorId" text,
    "updaterId" text,
    "validatorId" text,
    "referenceNumber" text,
    "purchaseOrderNumber" text,
    "contractNumber" text,
    "quoteNumber" text,
    "customerReference" text,
    "invoiceDate" timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "receivedDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "postedDate" timestamp(3) without time zone,
    "validatedDate" timestamp(3) without time zone,
    "approvedDate" timestamp(3) without time zone,
    "paidDate" timestamp(3) without time zone,
    "cancelledDate" timestamp(3) without time zone,
    "disputedDate" timestamp(3) without time zone,
    "subtotalExclVAT" numeric(18,2) DEFAULT 0 NOT NULL,
    "subtotalInclVAT" numeric(18,2),
    "vatRate" numeric(5,2) DEFAULT 15.00 NOT NULL,
    "vatAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "totalAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "amountPaid" numeric(18,2) DEFAULT 0 NOT NULL,
    "amountDue" numeric(18,2) DEFAULT 0 NOT NULL,
    "discountAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "penaltyAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "shippingAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    currency public."Currency" DEFAULT 'ZAR'::public."Currency" NOT NULL,
    "exchangeRate" numeric(18,6) DEFAULT 1,
    "baseCurrency" public."Currency" DEFAULT 'ZAR'::public."Currency" NOT NULL,
    "baseCurrencyAmount" numeric(18,2),
    status public."InvoiceStatus" DEFAULT 'DRAFT'::public."InvoiceStatus" NOT NULL,
    "paymentStatus" public."PaymentStatus" DEFAULT 'UNPAID'::public."PaymentStatus" NOT NULL,
    "approvalStatus" public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    "riskLevel" public."RiskLevel" DEFAULT 'LOW'::public."RiskLevel" NOT NULL,
    "fraudScore" numeric(5,2),
    "anomalyScore" numeric(5,2),
    "duplicateConfidence" numeric(5,2),
    "duplicateOfId" text,
    "isDuplicate" boolean DEFAULT false NOT NULL,
    "duplicateCheckStatus" text,
    "slaStatus" public."SLAStatus" DEFAULT 'ON_TRACK'::public."SLAStatus" NOT NULL,
    "slaDueDate" timestamp(3) without time zone,
    "slaBreachDate" timestamp(3) without time zone,
    "processingDeadline" timestamp(3) without time zone,
    "supplierName" text,
    "supplierVAT" text,
    "supplierTaxId" text,
    "supplierRegNumber" text,
    "supplierAddress" text,
    "supplierEmail" text,
    "supplierPhone" text,
    "paymentTerms" integer DEFAULT 30 NOT NULL,
    "paymentMethod" public."PaymentMethod",
    "bankAccountId" text,
    "paymentBatchId" text,
    "glCode" text,
    "costCenter" text,
    "projectCode" text,
    department text,
    "budgetCategory" text,
    "pdfUrl" text,
    "pdfHash" text,
    "xmlUrl" text,
    "ocrText" text,
    "ocrConfidence" numeric(5,2),
    "extractionMethod" text,
    "extractionConfidence" numeric(5,2) DEFAULT 0,
    "validationScore" numeric(5,2) DEFAULT 0,
    "isRecurring" boolean DEFAULT false NOT NULL,
    "recurrencePattern" text,
    "nextRecurrenceDate" timestamp(3) without time zone,
    "parentInvoiceId" text,
    "originalInvoiceId" text,
    "isUrgent" boolean DEFAULT false NOT NULL,
    "requiresAttention" boolean DEFAULT false NOT NULL,
    "manualReviewRequired" boolean DEFAULT false NOT NULL,
    "manualReviewReason" text,
    "isEscalated" boolean DEFAULT false NOT NULL,
    "escalatedAt" timestamp(3) without time zone,
    "escalatedBy" text,
    "escalationReason" text,
    "vatCompliant" boolean DEFAULT false NOT NULL,
    "termsCompliant" boolean DEFAULT false NOT NULL,
    "fullyApproved" boolean DEFAULT false NOT NULL,
    "readyForPayment" boolean DEFAULT false NOT NULL,
    "currentApproverId" text,
    "nextApproverId" text,
    "currentStage" integer DEFAULT 1 NOT NULL,
    "totalStages" integer DEFAULT 1 NOT NULL,
    notes text,
    "internalNotes" text,
    "rejectionReason" text,
    "disputeReason" text,
    tags text[],
    "customFields" jsonb,
    source text DEFAULT 'MANUAL'::text NOT NULL,
    "externalId" text,
    "integrationId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.invoices OWNER TO creditorflow;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    "organizationId" text,
    "userId" text NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "shortMessage" text,
    "actionUrl" text,
    "actionText" text,
    "imageUrl" text,
    priority public."NotificationPriority" DEFAULT 'MEDIUM'::public."NotificationPriority" NOT NULL,
    channel public."NotificationChannel" DEFAULT 'IN_APP'::public."NotificationChannel" NOT NULL,
    status public."NotificationStatus" DEFAULT 'UNREAD'::public."NotificationStatus" NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "readAt" timestamp(3) without time zone,
    "dismissedAt" timestamp(3) without time zone,
    "archivedAt" timestamp(3) without time zone,
    "emailSentAt" timestamp(3) without time zone,
    "emailMessageId" text,
    "smsSentAt" timestamp(3) without time zone,
    "smsMessageId" text,
    "pushSentAt" timestamp(3) without time zone,
    "webhookSentAt" timestamp(3) without time zone,
    "deliveryAttempts" integer DEFAULT 0 NOT NULL,
    "lastError" text,
    "lastErrorAt" timestamp(3) without time zone,
    actions jsonb,
    "entityType" public."EntityType",
    "entityId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.notifications OWNER TO creditorflow;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.organizations (
    id text NOT NULL,
    name text NOT NULL,
    "legalName" text,
    "tradingName" text,
    "taxId" text,
    "vatNumber" text,
    "registrationNumber" text,
    "companyNumber" text,
    industry text,
    sector text,
    "employeeCount" integer,
    "annualRevenue" numeric(18,2),
    "fiscalYearEnd" text,
    website text,
    email text,
    "phoneNumber" text,
    "faxNumber" text,
    "addressLine1" text,
    "addressLine2" text,
    city text,
    state text,
    "postalCode" text,
    country text DEFAULT 'South Africa'::text NOT NULL,
    "countryCode" text DEFAULT 'ZA'::text NOT NULL,
    timezone text DEFAULT 'Africa/Johannesburg'::text NOT NULL,
    currency public."Currency" DEFAULT 'ZAR'::public."Currency" NOT NULL,
    "baseCurrency" public."Currency" DEFAULT 'ZAR'::public."Currency" NOT NULL,
    "supportedCurrencies" text[] DEFAULT ARRAY['ZAR'::text],
    settings jsonb,
    "complianceSettings" jsonb,
    "riskSettings" jsonb,
    "approvalSettings" jsonb,
    "paymentSettings" jsonb,
    "notificationSettings" jsonb,
    "brandingSettings" jsonb,
    "securitySettings" jsonb,
    "integrationSettings" jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "isTrial" boolean DEFAULT false NOT NULL,
    "trialEndsAt" timestamp(3) without time zone,
    plan text DEFAULT 'BASIC'::text NOT NULL,
    "planExpiresAt" timestamp(3) without time zone,
    "maxUsers" integer DEFAULT 10 NOT NULL,
    "maxInvoices" integer DEFAULT 1000 NOT NULL,
    "storageQuota" integer DEFAULT '10737418240'::bigint NOT NULL,
    "storageUsed" integer DEFAULT 0 NOT NULL,
    metadata jsonb,
    "externalId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.organizations OWNER TO creditorflow;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.password_reset_tokens (
    id text NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "ipAddress" text
);


ALTER TABLE public.password_reset_tokens OWNER TO creditorflow;

--
-- Name: payment_batches; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.payment_batches (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "batchNumber" text NOT NULL,
    description text,
    "totalAmount" numeric(18,2) NOT NULL,
    "paymentCount" integer NOT NULL,
    currency public."Currency" DEFAULT 'ZAR'::public."Currency" NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "scheduledFor" timestamp(3) without time zone,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "isRecurring" boolean DEFAULT false NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "processedBy" text,
    "releasedAt" timestamp(3) without time zone,
    "releasedBy" text,
    "bankAccountId" text,
    notes text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "supplierId" text
);


ALTER TABLE public.payment_batches OWNER TO creditorflow;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.payments (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "invoiceId" text,
    "supplierId" text,
    "bankAccountId" text,
    "paymentBatchId" text,
    "processedBy" text,
    "paymentNumber" text NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    amount numeric(18,2) NOT NULL,
    currency public."Currency" DEFAULT 'ZAR'::public."Currency" NOT NULL,
    "exchangeRate" numeric(18,6) DEFAULT 1,
    "baseCurrencyAmount" numeric(18,2),
    "paymentMethod" public."PaymentMethod" DEFAULT 'BANK_TRANSFER'::public."PaymentMethod" NOT NULL,
    "bankReference" text,
    "checkNumber" text,
    "transactionId" text,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "confirmedAt" timestamp(3) without time zone,
    "failedAt" timestamp(3) without time zone,
    "failureReason" text,
    "reconciliationId" text,
    "isReconciled" boolean DEFAULT false NOT NULL,
    "reconciledAt" timestamp(3) without time zone,
    notes text,
    "internalNotes" text,
    metadata jsonb,
    "externalId" text,
    source text DEFAULT 'MANUAL'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.payments OWNER TO creditorflow;

--
-- Name: reconciliation_items; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.reconciliation_items (
    id text NOT NULL,
    "reconciliationId" text NOT NULL,
    "paymentId" text,
    "transactionDate" timestamp(3) without time zone NOT NULL,
    description text NOT NULL,
    reference text,
    amount numeric(18,2) NOT NULL,
    currency public."Currency" DEFAULT 'ZAR'::public."Currency" NOT NULL,
    "transactionType" public."TransactionType" NOT NULL,
    "matchedPaymentId" text,
    "matchedAmount" numeric(18,2),
    "matchConfidence" numeric(5,2),
    "matchingMethod" text,
    status public."ReconciliationItemStatus" DEFAULT 'UNMATCHED'::public."ReconciliationItemStatus" NOT NULL,
    "isAdjustment" boolean DEFAULT false NOT NULL,
    "adjustmentReason" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.reconciliation_items OWNER TO creditorflow;

--
-- Name: reconciliations; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.reconciliations (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "bankAccountId" text NOT NULL,
    "statementNumber" text,
    "statementDate" timestamp(3) without time zone NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "openingBalance" numeric(18,2) NOT NULL,
    "closingBalance" numeric(18,2) NOT NULL,
    "statementBalance" numeric(18,2) NOT NULL,
    difference numeric(18,2) DEFAULT 0 NOT NULL,
    status public."ReconciliationStatus" DEFAULT 'PENDING'::public."ReconciliationStatus" NOT NULL,
    "preparedBy" text,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    notes text,
    adjustments jsonb,
    "statementFileUrl" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "completedAt" timestamp(3) without time zone
);


ALTER TABLE public.reconciliations OWNER TO creditorflow;

--
-- Name: risk_scores; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.risk_scores (
    id text NOT NULL,
    "invoiceId" text,
    "supplierId" text,
    "organizationId" text NOT NULL,
    "assessedBy" text,
    score numeric(5,2) NOT NULL,
    level public."RiskLevel" NOT NULL,
    "previousScore" numeric(5,2),
    "changeReason" text,
    factors jsonb NOT NULL,
    indicators jsonb,
    recommendations text[],
    mitigations jsonb,
    "assessedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "isAcknowledged" boolean DEFAULT false NOT NULL,
    "acknowledgedAt" timestamp(3) without time zone,
    "acknowledgedBy" text,
    "modelVersion" text,
    "calculationMethod" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.risk_scores OWNER TO creditorflow;

--
-- Name: scheduled_tasks; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.scheduled_tasks (
    id text NOT NULL,
    "organizationId" text,
    name text NOT NULL,
    description text,
    "taskType" public."ScheduledTaskType" NOT NULL,
    schedule text NOT NULL,
    timezone text DEFAULT 'Africa/Johannesburg'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isRunning" boolean DEFAULT false NOT NULL,
    "lastRunAt" timestamp(3) without time zone,
    "lastRunStatus" public."ScheduledTaskStatus",
    "lastRunError" text,
    "lastRunDuration" integer,
    "nextRunAt" timestamp(3) without time zone,
    "runCount" integer DEFAULT 0 NOT NULL,
    "failureCount" integer DEFAULT 0 NOT NULL,
    parameters jsonb,
    timeout integer DEFAULT 3600 NOT NULL,
    "retryAttempts" integer DEFAULT 3 NOT NULL,
    "retryDelay" integer DEFAULT 300 NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text
);


ALTER TABLE public.scheduled_tasks OWNER TO creditorflow;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL,
    "userAgent" text,
    "ipAddress" text,
    location text,
    "deviceType" text,
    browser text,
    os text,
    "isValid" boolean DEFAULT true NOT NULL,
    "invalidatedAt" timestamp(3) without time zone,
    "invalidatedReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastAccessedAt" timestamp(3) without time zone
);


ALTER TABLE public.sessions OWNER TO creditorflow;

--
-- Name: supplier_bank_accounts; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.supplier_bank_accounts (
    id text NOT NULL,
    "supplierId" text NOT NULL,
    "accountName" text NOT NULL,
    "accountNumber" text NOT NULL,
    "bankName" text NOT NULL,
    "bankCode" text,
    "branchName" text,
    "branchCode" text,
    "swiftCode" text,
    iban text,
    currency public."Currency" DEFAULT 'ZAR'::public."Currency" NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "verifiedAt" timestamp(3) without time zone,
    "verificationMethod" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.supplier_bank_accounts OWNER TO creditorflow;

--
-- Name: supplier_contacts; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.supplier_contacts (
    id text NOT NULL,
    "supplierId" text NOT NULL,
    name text NOT NULL,
    title text,
    department text,
    email text NOT NULL,
    phone text,
    mobile text,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "isAccountsContact" boolean DEFAULT false NOT NULL,
    "isTechnicalContact" boolean DEFAULT false NOT NULL,
    "isEmergencyContact" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.supplier_contacts OWNER TO creditorflow;

--
-- Name: supplier_contracts; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.supplier_contracts (
    id text NOT NULL,
    "supplierId" text NOT NULL,
    "contractNumber" text,
    "contractType" text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    value numeric(18,2),
    terms text,
    "paymentTerms" integer,
    "autoRenew" boolean DEFAULT false NOT NULL,
    "renewalNoticeDays" integer DEFAULT 30 NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "documentUrl" text,
    "signedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.supplier_contracts OWNER TO creditorflow;

--
-- Name: supplier_performance; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.supplier_performance (
    id text NOT NULL,
    "supplierId" text NOT NULL,
    period text NOT NULL,
    "onTimeDelivery" numeric(5,2),
    "qualityScore" numeric(5,2),
    "priceCompetitiveness" numeric(5,2),
    "serviceLevel" numeric(5,2),
    "overallScore" numeric(5,2),
    "invoiceCount" integer DEFAULT 0 NOT NULL,
    "totalAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "avgProcessingDays" numeric(5,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.supplier_performance OWNER TO creditorflow;

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.suppliers (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "supplierCode" text,
    name text NOT NULL,
    "legalName" text,
    "tradingName" text,
    "taxId" text,
    "vatNumber" text,
    "registrationNumber" text,
    "companyNumber" text,
    status public."SupplierStatus" DEFAULT 'PENDING_VERIFICATION'::public."SupplierStatus" NOT NULL,
    category public."SupplierCategory" DEFAULT 'SERVICES'::public."SupplierCategory" NOT NULL,
    "subCategory" text,
    industry text,
    "riskLevel" public."RiskLevel" DEFAULT 'MEDIUM'::public."RiskLevel" NOT NULL,
    "riskScore" numeric(5,2) DEFAULT 0,
    "complianceStatus" public."ComplianceStatus" DEFAULT 'PENDING'::public."ComplianceStatus" NOT NULL,
    "contactPerson" jsonb,
    "primaryContactName" text,
    "primaryContactEmail" text,
    "primaryContactPhone" text,
    "accountsContactName" text,
    "accountsContactEmail" text,
    "accountsContactPhone" text,
    "billingAddress" jsonb,
    "shippingAddress" jsonb,
    "addressLine1" text,
    "addressLine2" text,
    city text,
    state text,
    "postalCode" text,
    country text DEFAULT 'South Africa'::text NOT NULL,
    "countryCode" text DEFAULT 'ZA'::text NOT NULL,
    "bankDetails" jsonb,
    "bankName" text,
    "bankCode" text,
    "branchName" text,
    "branchCode" text,
    "accountNumber" text,
    "accountType" public."BankAccountType" DEFAULT 'CURRENT'::public."BankAccountType" NOT NULL,
    "swiftCode" text,
    iban text,
    "routingNumber" text,
    "beneficiaryName" text,
    "paymentTerms" integer DEFAULT 30 NOT NULL,
    "creditLimit" numeric(18,2),
    "creditTerms" text,
    "earlyPaymentDiscount" numeric(5,2),
    "discountDays" integer,
    currency public."Currency" DEFAULT 'ZAR'::public."Currency" NOT NULL,
    "totalTransactions" integer DEFAULT 0 NOT NULL,
    "totalInvoices" integer DEFAULT 0 NOT NULL,
    "totalAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "totalPaid" numeric(18,2) DEFAULT 0 NOT NULL,
    "totalOutstanding" numeric(18,2) DEFAULT 0 NOT NULL,
    "averageInvoiceAmount" numeric(18,2),
    "averagePaymentDays" integer,
    "lastInvoiceDate" timestamp(3) without time zone,
    "lastPaymentDate" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "isPreferred" boolean DEFAULT false NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "isWhitelisted" boolean DEFAULT false NOT NULL,
    "isBlacklisted" boolean DEFAULT false NOT NULL,
    "blacklistedAt" timestamp(3) without time zone,
    "blacklistedBy" text,
    "blacklistReason" text,
    "onHold" boolean DEFAULT false NOT NULL,
    "holdReason" text,
    "verifiedAt" timestamp(3) without time zone,
    "verifiedBy" text,
    "onboardingCompletedAt" timestamp(3) without time zone,
    notes text,
    "internalNotes" text,
    tags text[],
    "customFields" jsonb,
    "externalId" text,
    source text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.suppliers OWNER TO creditorflow;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.system_settings (
    id text NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    "defaultValue" jsonb,
    description text,
    category text DEFAULT 'GENERAL'::text NOT NULL,
    "dataType" text DEFAULT 'STRING'::text NOT NULL,
    "isEncrypted" boolean DEFAULT false NOT NULL,
    "isEditable" boolean DEFAULT true NOT NULL,
    "isVisible" boolean DEFAULT true NOT NULL,
    "requiresRestart" boolean DEFAULT false NOT NULL,
    "updatedBy" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.system_settings OWNER TO creditorflow;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.tags (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#808080'::text NOT NULL,
    description text,
    "entityTypes" text[],
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tags OWNER TO creditorflow;

--
-- Name: users; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.users (
    id text NOT NULL,
    "employeeId" text,
    email text NOT NULL,
    "emailVerified" timestamp(3) without time zone,
    name text,
    "firstName" text,
    "lastName" text,
    image text,
    "passwordHash" text,
    role public."UserRole" DEFAULT 'VIEWER'::public."UserRole" NOT NULL,
    department public."Department",
    "position" text,
    "jobTitle" text,
    "phoneNumber" text,
    "mobileNumber" text,
    timezone text DEFAULT 'Africa/Johannesburg'::text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    locale text DEFAULT 'en-ZA'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "lastLoginIp" text,
    "failedLoginAttempts" integer DEFAULT 0 NOT NULL,
    "lockedUntil" timestamp(3) without time zone,
    "passwordChangedAt" timestamp(3) without time zone,
    "passwordExpiresAt" timestamp(3) without time zone,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "twoFactorSecret" text,
    "twoFactorMethod" text,
    "recoveryCodes" text[],
    "emailNotifications" boolean DEFAULT true NOT NULL,
    "smsNotifications" boolean DEFAULT false NOT NULL,
    "pushNotifications" boolean DEFAULT true NOT NULL,
    "notificationSettings" jsonb,
    theme text DEFAULT 'light'::text NOT NULL,
    "sidebarCollapsed" boolean DEFAULT false NOT NULL,
    "defaultDashboard" text,
    "sessionTimeout" integer DEFAULT 30 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "primaryOrganizationId" text
);


ALTER TABLE public.users OWNER TO creditorflow;

--
-- Name: verification_tokens; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.verification_tokens (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "usedByIp" text
);


ALTER TABLE public.verification_tokens OWNER TO creditorflow;

--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: creditorflow
--

CREATE TABLE public.webhooks (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    secret text,
    events text[],
    "signatureMethod" text DEFAULT 'HMAC_SHA256'::text NOT NULL,
    "verifySsl" boolean DEFAULT true NOT NULL,
    "allowedIps" text[],
    "isActive" boolean DEFAULT true NOT NULL,
    "lastTriggeredAt" timestamp(3) without time zone,
    "lastTriggerStatus" public."WebhookStatus",
    "lastTriggerError" text,
    "totalTriggers" integer DEFAULT 0 NOT NULL,
    "successfulTriggers" integer DEFAULT 0 NOT NULL,
    "failedTriggers" integer DEFAULT 0 NOT NULL,
    "retryPolicy" jsonb,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text
);


ALTER TABLE public.webhooks OWNER TO creditorflow;

--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: approval_chains approval_chains_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.approval_chains
    ADD CONSTRAINT approval_chains_pkey PRIMARY KEY (id);


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: compliance_checks compliance_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.compliance_checks
    ADD CONSTRAINT compliance_checks_pkey PRIMARY KEY (id);


--
-- Name: custom_fields custom_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.custom_fields
    ADD CONSTRAINT custom_fields_pkey PRIMARY KEY (id);


--
-- Name: delegated_approvals delegated_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.delegated_approvals
    ADD CONSTRAINT delegated_approvals_pkey PRIMARY KEY (id);


--
-- Name: file_attachments file_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachments_pkey PRIMARY KEY (id);


--
-- Name: integration_sync_logs integration_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.integration_sync_logs
    ADD CONSTRAINT integration_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- Name: invoice_activities invoice_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoice_activities
    ADD CONSTRAINT invoice_activities_pkey PRIMARY KEY (id);


--
-- Name: invoice_comments invoice_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoice_comments
    ADD CONSTRAINT invoice_comments_pkey PRIMARY KEY (id);


--
-- Name: invoice_line_items invoice_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: payment_batches payment_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.payment_batches
    ADD CONSTRAINT payment_batches_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_items reconciliation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.reconciliation_items
    ADD CONSTRAINT reconciliation_items_pkey PRIMARY KEY (id);


--
-- Name: reconciliations reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.reconciliations
    ADD CONSTRAINT reconciliations_pkey PRIMARY KEY (id);


--
-- Name: risk_scores risk_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.risk_scores
    ADD CONSTRAINT risk_scores_pkey PRIMARY KEY (id);


--
-- Name: scheduled_tasks scheduled_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.scheduled_tasks
    ADD CONSTRAINT scheduled_tasks_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: supplier_bank_accounts supplier_bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.supplier_bank_accounts
    ADD CONSTRAINT supplier_bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: supplier_contacts supplier_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.supplier_contacts
    ADD CONSTRAINT supplier_contacts_pkey PRIMARY KEY (id);


--
-- Name: supplier_contracts supplier_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.supplier_contracts
    ADD CONSTRAINT supplier_contracts_pkey PRIMARY KEY (id);


--
-- Name: supplier_performance supplier_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.supplier_performance
    ADD CONSTRAINT supplier_performance_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verification_tokens verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.verification_tokens
    ADD CONSTRAINT verification_tokens_pkey PRIMARY KEY (identifier, token);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: _OrganizationMembers_AB_unique; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "_OrganizationMembers_AB_unique" ON public."_OrganizationMembers" USING btree ("A", "B");


--
-- Name: _OrganizationMembers_B_index; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "_OrganizationMembers_B_index" ON public."_OrganizationMembers" USING btree ("B");


--
-- Name: _SupplierTags_AB_unique; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "_SupplierTags_AB_unique" ON public."_SupplierTags" USING btree ("A", "B");


--
-- Name: _SupplierTags_B_index; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "_SupplierTags_B_index" ON public."_SupplierTags" USING btree ("B");


--
-- Name: accounts_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON public.accounts USING btree (provider, "providerAccountId");


--
-- Name: accounts_userId_provider_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "accounts_userId_provider_idx" ON public.accounts USING btree ("userId", provider);


--
-- Name: api_keys_keyHash_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "api_keys_keyHash_key" ON public.api_keys USING btree ("keyHash");


--
-- Name: api_keys_organizationId_isActive_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "api_keys_organizationId_isActive_idx" ON public.api_keys USING btree ("organizationId", "isActive");


--
-- Name: api_keys_prefix_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX api_keys_prefix_idx ON public.api_keys USING btree (prefix);


--
-- Name: api_keys_userId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "api_keys_userId_idx" ON public.api_keys USING btree ("userId");


--
-- Name: approval_chains_department_minAmount_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "approval_chains_department_minAmount_idx" ON public.approval_chains USING btree (department, "minAmount");


--
-- Name: approval_chains_isActive_department_category_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "approval_chains_isActive_department_category_idx" ON public.approval_chains USING btree ("isActive", department, category);


--
-- Name: approval_chains_organizationId_isActive_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "approval_chains_organizationId_isActive_idx" ON public.approval_chains USING btree ("organizationId", "isActive");


--
-- Name: approvals_approvalChainId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "approvals_approvalChainId_idx" ON public.approvals USING btree ("approvalChainId");


--
-- Name: approvals_approverId_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "approvals_approverId_status_idx" ON public.approvals USING btree ("approverId", status);


--
-- Name: approvals_invoiceId_approverId_level_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "approvals_invoiceId_approverId_level_key" ON public.approvals USING btree ("invoiceId", "approverId", level);


--
-- Name: approvals_invoiceId_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "approvals_invoiceId_status_idx" ON public.approvals USING btree ("invoiceId", status);


--
-- Name: approvals_slaDueDate_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "approvals_slaDueDate_status_idx" ON public.approvals USING btree ("slaDueDate", status);


--
-- Name: audit_logs_action_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "audit_logs_action_createdAt_idx" ON public.audit_logs USING btree (action, "createdAt");


--
-- Name: audit_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "audit_logs_createdAt_idx" ON public.audit_logs USING btree ("createdAt");


--
-- Name: audit_logs_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "audit_logs_entityType_entityId_idx" ON public.audit_logs USING btree ("entityType", "entityId");


--
-- Name: audit_logs_ipAddress_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "audit_logs_ipAddress_idx" ON public.audit_logs USING btree ("ipAddress");


--
-- Name: audit_logs_organizationId_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON public.audit_logs USING btree ("organizationId", "createdAt");


--
-- Name: audit_logs_severity_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "audit_logs_severity_createdAt_idx" ON public.audit_logs USING btree (severity, "createdAt");


--
-- Name: audit_logs_userId_action_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "audit_logs_userId_action_idx" ON public.audit_logs USING btree ("userId", action);


--
-- Name: bank_accounts_accountNumber_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "bank_accounts_accountNumber_idx" ON public.bank_accounts USING btree ("accountNumber");


--
-- Name: bank_accounts_isPrimary_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "bank_accounts_isPrimary_idx" ON public.bank_accounts USING btree ("isPrimary");


--
-- Name: bank_accounts_organizationId_isActive_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "bank_accounts_organizationId_isActive_idx" ON public.bank_accounts USING btree ("organizationId", "isActive");


--
-- Name: compliance_checks_checkType_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "compliance_checks_checkType_status_idx" ON public.compliance_checks USING btree ("checkType", status);


--
-- Name: compliance_checks_invoiceId_checkType_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "compliance_checks_invoiceId_checkType_idx" ON public.compliance_checks USING btree ("invoiceId", "checkType");


--
-- Name: compliance_checks_organizationId_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "compliance_checks_organizationId_createdAt_idx" ON public.compliance_checks USING btree ("organizationId", "createdAt");


--
-- Name: compliance_checks_supplierId_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "compliance_checks_supplierId_status_idx" ON public.compliance_checks USING btree ("supplierId", status);


--
-- Name: custom_fields_organizationId_entityType_fieldName_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "custom_fields_organizationId_entityType_fieldName_key" ON public.custom_fields USING btree ("organizationId", "entityType", "fieldName");


--
-- Name: custom_fields_organizationId_entityType_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "custom_fields_organizationId_entityType_idx" ON public.custom_fields USING btree ("organizationId", "entityType");


--
-- Name: delegated_approvals_approvalChainId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "delegated_approvals_approvalChainId_idx" ON public.delegated_approvals USING btree ("approvalChainId");


--
-- Name: delegated_approvals_delegateeId_startDate_endDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "delegated_approvals_delegateeId_startDate_endDate_idx" ON public.delegated_approvals USING btree ("delegateeId", "startDate", "endDate");


--
-- Name: delegated_approvals_delegatorId_isActive_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "delegated_approvals_delegatorId_isActive_idx" ON public.delegated_approvals USING btree ("delegatorId", "isActive");


--
-- Name: file_attachments_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "file_attachments_createdAt_idx" ON public.file_attachments USING btree ("createdAt");


--
-- Name: file_attachments_deletedAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "file_attachments_deletedAt_idx" ON public.file_attachments USING btree ("deletedAt");


--
-- Name: file_attachments_organizationId_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "file_attachments_organizationId_entityType_entityId_idx" ON public.file_attachments USING btree ("organizationId", "entityType", "entityId");


--
-- Name: file_attachments_storagePath_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "file_attachments_storagePath_idx" ON public.file_attachments USING btree ("storagePath");


--
-- Name: file_attachments_uploaderId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "file_attachments_uploaderId_idx" ON public.file_attachments USING btree ("uploaderId");


--
-- Name: idx_supplier_name_trgm; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX idx_supplier_name_trgm ON public.suppliers USING btree (name);


--
-- Name: integration_sync_logs_integrationId_startedAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "integration_sync_logs_integrationId_startedAt_idx" ON public.integration_sync_logs USING btree ("integrationId", "startedAt");


--
-- Name: integration_sync_logs_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX integration_sync_logs_status_idx ON public.integration_sync_logs USING btree (status);


--
-- Name: integrations_organizationId_type_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "integrations_organizationId_type_idx" ON public.integrations USING btree ("organizationId", type);


--
-- Name: integrations_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX integrations_status_idx ON public.integrations USING btree (status);


--
-- Name: integrations_type_provider_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX integrations_type_provider_idx ON public.integrations USING btree (type, provider);


--
-- Name: invoice_activities_action_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX invoice_activities_action_idx ON public.invoice_activities USING btree (action);


--
-- Name: invoice_activities_invoiceId_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoice_activities_invoiceId_createdAt_idx" ON public.invoice_activities USING btree ("invoiceId", "createdAt");


--
-- Name: invoice_comments_invoiceId_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoice_comments_invoiceId_createdAt_idx" ON public.invoice_comments USING btree ("invoiceId", "createdAt");


--
-- Name: invoice_comments_userId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoice_comments_userId_idx" ON public.invoice_comments USING btree ("userId");


--
-- Name: invoice_line_items_glCode_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoice_line_items_glCode_idx" ON public.invoice_line_items USING btree ("glCode");


--
-- Name: invoice_line_items_invoiceId_lineNumber_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "invoice_line_items_invoiceId_lineNumber_key" ON public.invoice_line_items USING btree ("invoiceId", "lineNumber");


--
-- Name: invoice_line_items_invoiceId_productCode_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoice_line_items_invoiceId_productCode_idx" ON public.invoice_line_items USING btree ("invoiceId", "productCode");


--
-- Name: invoices_approvalStatus_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoices_approvalStatus_status_idx" ON public.invoices USING btree ("approvalStatus", status);


--
-- Name: invoices_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoices_createdAt_idx" ON public.invoices USING btree ("createdAt");


--
-- Name: invoices_currentApproverId_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoices_currentApproverId_status_idx" ON public.invoices USING btree ("currentApproverId", status);


--
-- Name: invoices_dueDate_paymentStatus_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoices_dueDate_paymentStatus_idx" ON public.invoices USING btree ("dueDate", "paymentStatus");


--
-- Name: invoices_fraudScore_riskLevel_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoices_fraudScore_riskLevel_idx" ON public.invoices USING btree ("fraudScore", "riskLevel");


--
-- Name: invoices_invoiceDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoices_invoiceDate_idx" ON public.invoices USING btree ("invoiceDate");


--
-- Name: invoices_isDuplicate_duplicateConfidence_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoices_isDuplicate_duplicateConfidence_idx" ON public.invoices USING btree ("isDuplicate", "duplicateConfidence");


--
-- Name: invoices_organizationId_invoiceNumber_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "invoices_organizationId_invoiceNumber_key" ON public.invoices USING btree ("organizationId", "invoiceNumber");


--
-- Name: invoices_organizationId_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoices_organizationId_status_idx" ON public.invoices USING btree ("organizationId", status);


--
-- Name: invoices_slaStatus_slaDueDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoices_slaStatus_slaDueDate_idx" ON public.invoices USING btree ("slaStatus", "slaDueDate");


--
-- Name: invoices_supplierId_invoiceDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "invoices_supplierId_invoiceDate_idx" ON public.invoices USING btree ("supplierId", "invoiceDate");


--
-- Name: notifications_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "notifications_entityType_entityId_idx" ON public.notifications USING btree ("entityType", "entityId");


--
-- Name: notifications_organizationId_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "notifications_organizationId_createdAt_idx" ON public.notifications USING btree ("organizationId", "createdAt");


--
-- Name: notifications_status_sentAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "notifications_status_sentAt_idx" ON public.notifications USING btree (status, "sentAt");


--
-- Name: notifications_type_priority_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX notifications_type_priority_idx ON public.notifications USING btree (type, priority);


--
-- Name: notifications_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "notifications_userId_createdAt_idx" ON public.notifications USING btree ("userId", "createdAt");


--
-- Name: notifications_userId_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "notifications_userId_status_idx" ON public.notifications USING btree ("userId", status);


--
-- Name: organizations_country_isActive_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "organizations_country_isActive_idx" ON public.organizations USING btree (country, "isActive");


--
-- Name: organizations_plan_isActive_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "organizations_plan_isActive_idx" ON public.organizations USING btree (plan, "isActive");


--
-- Name: organizations_taxId_isActive_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "organizations_taxId_isActive_idx" ON public.organizations USING btree ("taxId", "isActive");


--
-- Name: organizations_taxId_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "organizations_taxId_key" ON public.organizations USING btree ("taxId");


--
-- Name: organizations_vatNumber_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "organizations_vatNumber_idx" ON public.organizations USING btree ("vatNumber");


--
-- Name: password_reset_tokens_email_token_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX password_reset_tokens_email_token_idx ON public.password_reset_tokens USING btree (email, token);


--
-- Name: password_reset_tokens_expires_used_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX password_reset_tokens_expires_used_idx ON public.password_reset_tokens USING btree (expires, used);


--
-- Name: password_reset_tokens_token_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX password_reset_tokens_token_key ON public.password_reset_tokens USING btree (token);


--
-- Name: payment_batches_batchNumber_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "payment_batches_batchNumber_key" ON public.payment_batches USING btree ("batchNumber");


--
-- Name: payment_batches_organizationId_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "payment_batches_organizationId_status_idx" ON public.payment_batches USING btree ("organizationId", status);


--
-- Name: payment_batches_paymentDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "payment_batches_paymentDate_idx" ON public.payment_batches USING btree ("paymentDate");


--
-- Name: payment_batches_status_scheduledFor_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "payment_batches_status_scheduledFor_idx" ON public.payment_batches USING btree (status, "scheduledFor");


--
-- Name: payments_invoiceId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "payments_invoiceId_idx" ON public.payments USING btree ("invoiceId");


--
-- Name: payments_organizationId_paymentNumber_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "payments_organizationId_paymentNumber_key" ON public.payments USING btree ("organizationId", "paymentNumber");


--
-- Name: payments_paymentBatchId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "payments_paymentBatchId_idx" ON public.payments USING btree ("paymentBatchId");


--
-- Name: payments_status_paymentDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "payments_status_paymentDate_idx" ON public.payments USING btree (status, "paymentDate");


--
-- Name: payments_supplierId_paymentDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "payments_supplierId_paymentDate_idx" ON public.payments USING btree ("supplierId", "paymentDate");


--
-- Name: reconciliation_items_reconciliationId_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "reconciliation_items_reconciliationId_status_idx" ON public.reconciliation_items USING btree ("reconciliationId", status);


--
-- Name: reconciliation_items_reference_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX reconciliation_items_reference_idx ON public.reconciliation_items USING btree (reference);


--
-- Name: reconciliation_items_transactionDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "reconciliation_items_transactionDate_idx" ON public.reconciliation_items USING btree ("transactionDate");


--
-- Name: reconciliations_bankAccountId_statementDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "reconciliations_bankAccountId_statementDate_idx" ON public.reconciliations USING btree ("bankAccountId", "statementDate");


--
-- Name: reconciliations_bankAccountId_statementDate_statementNumber_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "reconciliations_bankAccountId_statementDate_statementNumber_key" ON public.reconciliations USING btree ("bankAccountId", "statementDate", "statementNumber");


--
-- Name: reconciliations_status_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "reconciliations_status_createdAt_idx" ON public.reconciliations USING btree (status, "createdAt");


--
-- Name: risk_scores_assessedAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "risk_scores_assessedAt_idx" ON public.risk_scores USING btree ("assessedAt");


--
-- Name: risk_scores_invoiceId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "risk_scores_invoiceId_idx" ON public.risk_scores USING btree ("invoiceId");


--
-- Name: risk_scores_level_score_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX risk_scores_level_score_idx ON public.risk_scores USING btree (level, score);


--
-- Name: risk_scores_organizationId_createdAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "risk_scores_organizationId_createdAt_idx" ON public.risk_scores USING btree ("organizationId", "createdAt");


--
-- Name: risk_scores_supplierId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "risk_scores_supplierId_idx" ON public.risk_scores USING btree ("supplierId");


--
-- Name: scheduled_tasks_isActive_nextRunAt_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "scheduled_tasks_isActive_nextRunAt_idx" ON public.scheduled_tasks USING btree ("isActive", "nextRunAt");


--
-- Name: scheduled_tasks_organizationId_taskType_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "scheduled_tasks_organizationId_taskType_idx" ON public.scheduled_tasks USING btree ("organizationId", "taskType");


--
-- Name: scheduled_tasks_taskType_isActive_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "scheduled_tasks_taskType_isActive_idx" ON public.scheduled_tasks USING btree ("taskType", "isActive");


--
-- Name: sessions_ipAddress_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "sessions_ipAddress_idx" ON public.sessions USING btree ("ipAddress");


--
-- Name: sessions_sessionToken_expires_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "sessions_sessionToken_expires_idx" ON public.sessions USING btree ("sessionToken", expires);


--
-- Name: sessions_sessionToken_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "sessions_sessionToken_key" ON public.sessions USING btree ("sessionToken");


--
-- Name: sessions_userId_isValid_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "sessions_userId_isValid_idx" ON public.sessions USING btree ("userId", "isValid");


--
-- Name: supplier_bank_accounts_accountNumber_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "supplier_bank_accounts_accountNumber_idx" ON public.supplier_bank_accounts USING btree ("accountNumber");


--
-- Name: supplier_bank_accounts_supplierId_isPrimary_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "supplier_bank_accounts_supplierId_isPrimary_idx" ON public.supplier_bank_accounts USING btree ("supplierId", "isPrimary");


--
-- Name: supplier_contacts_email_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX supplier_contacts_email_idx ON public.supplier_contacts USING btree (email);


--
-- Name: supplier_contacts_supplierId_isPrimary_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "supplier_contacts_supplierId_isPrimary_idx" ON public.supplier_contacts USING btree ("supplierId", "isPrimary");


--
-- Name: supplier_contracts_endDate_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "supplier_contracts_endDate_idx" ON public.supplier_contracts USING btree ("endDate");


--
-- Name: supplier_contracts_supplierId_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "supplier_contracts_supplierId_status_idx" ON public.supplier_contracts USING btree ("supplierId", status);


--
-- Name: supplier_performance_supplierId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "supplier_performance_supplierId_idx" ON public.supplier_performance USING btree ("supplierId");


--
-- Name: supplier_performance_supplierId_period_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "supplier_performance_supplierId_period_key" ON public.supplier_performance USING btree ("supplierId", period);


--
-- Name: suppliers_category_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX suppliers_category_idx ON public.suppliers USING btree (category);


--
-- Name: suppliers_complianceStatus_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "suppliers_complianceStatus_idx" ON public.suppliers USING btree ("complianceStatus");


--
-- Name: suppliers_isActive_isBlacklisted_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "suppliers_isActive_isBlacklisted_idx" ON public.suppliers USING btree ("isActive", "isBlacklisted");


--
-- Name: suppliers_organizationId_name_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "suppliers_organizationId_name_key" ON public.suppliers USING btree ("organizationId", name);


--
-- Name: suppliers_organizationId_status_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "suppliers_organizationId_status_idx" ON public.suppliers USING btree ("organizationId", status);


--
-- Name: suppliers_riskLevel_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "suppliers_riskLevel_idx" ON public.suppliers USING btree ("riskLevel");


--
-- Name: suppliers_supplierCode_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "suppliers_supplierCode_key" ON public.suppliers USING btree ("supplierCode");


--
-- Name: suppliers_taxId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "suppliers_taxId_idx" ON public.suppliers USING btree ("taxId");


--
-- Name: suppliers_vatNumber_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "suppliers_vatNumber_idx" ON public.suppliers USING btree ("vatNumber");


--
-- Name: system_settings_category_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX system_settings_category_idx ON public.system_settings USING btree (category);


--
-- Name: system_settings_key_category_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX system_settings_key_category_idx ON public.system_settings USING btree (key, category);


--
-- Name: system_settings_key_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX system_settings_key_key ON public.system_settings USING btree (key);


--
-- Name: tags_organizationId_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "tags_organizationId_idx" ON public.tags USING btree ("organizationId");


--
-- Name: tags_organizationId_name_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "tags_organizationId_name_key" ON public.tags USING btree ("organizationId", name);


--
-- Name: users_department_role_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX users_department_role_idx ON public.users USING btree (department, role);


--
-- Name: users_email_isActive_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "users_email_isActive_idx" ON public.users USING btree (email, "isActive");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_employeeId_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "users_employeeId_key" ON public.users USING btree ("employeeId");


--
-- Name: users_primaryOrganizationId_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX "users_primaryOrganizationId_key" ON public.users USING btree ("primaryOrganizationId");


--
-- Name: users_role_isActive_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "users_role_isActive_idx" ON public.users USING btree (role, "isActive");


--
-- Name: verification_tokens_token_expires_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX verification_tokens_token_expires_idx ON public.verification_tokens USING btree (token, expires);


--
-- Name: verification_tokens_token_key; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE UNIQUE INDEX verification_tokens_token_key ON public.verification_tokens USING btree (token);


--
-- Name: webhooks_events_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX webhooks_events_idx ON public.webhooks USING btree (events);


--
-- Name: webhooks_organizationId_isActive_idx; Type: INDEX; Schema: public; Owner: creditorflow
--

CREATE INDEX "webhooks_organizationId_isActive_idx" ON public.webhooks USING btree ("organizationId", "isActive");


--
-- Name: _OrganizationMembers _OrganizationMembers_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."_OrganizationMembers"
    ADD CONSTRAINT "_OrganizationMembers_A_fkey" FOREIGN KEY ("A") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _OrganizationMembers _OrganizationMembers_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."_OrganizationMembers"
    ADD CONSTRAINT "_OrganizationMembers_B_fkey" FOREIGN KEY ("B") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _SupplierTags _SupplierTags_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."_SupplierTags"
    ADD CONSTRAINT "_SupplierTags_A_fkey" FOREIGN KEY ("A") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _SupplierTags _SupplierTags_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public."_SupplierTags"
    ADD CONSTRAINT "_SupplierTags_B_fkey" FOREIGN KEY ("B") REFERENCES public.tags(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accounts accounts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: api_keys api_keys_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: api_keys api_keys_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: approval_chains approval_chains_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.approval_chains
    ADD CONSTRAINT "approval_chains_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: approval_chains approval_chains_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.approval_chains
    ADD CONSTRAINT "approval_chains_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: approvals approvals_approvalChainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT "approvals_approvalChainId_fkey" FOREIGN KEY ("approvalChainId") REFERENCES public.approval_chains(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: approvals approvals_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT "approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: approvals approvals_delegatedFromId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT "approvals_delegatedFromId_fkey" FOREIGN KEY ("delegatedFromId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: approvals approvals_delegatedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT "approvals_delegatedToId_fkey" FOREIGN KEY ("delegatedToId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: approvals approvals_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT "approvals_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_log_invoice_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_log_invoice_fkey FOREIGN KEY ("entityId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: audit_logs audit_logs_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bank_accounts bank_accounts_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT "bank_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: compliance_checks compliance_checks_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.compliance_checks
    ADD CONSTRAINT "compliance_checks_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: compliance_checks compliance_checks_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.compliance_checks
    ADD CONSTRAINT "compliance_checks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: compliance_checks compliance_checks_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.compliance_checks
    ADD CONSTRAINT "compliance_checks_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: compliance_checks compliance_checks_validatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.compliance_checks
    ADD CONSTRAINT "compliance_checks_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: custom_fields custom_fields_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.custom_fields
    ADD CONSTRAINT "custom_fields_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delegated_approvals delegated_approvals_approvalChainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.delegated_approvals
    ADD CONSTRAINT "delegated_approvals_approvalChainId_fkey" FOREIGN KEY ("approvalChainId") REFERENCES public.approval_chains(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: delegated_approvals delegated_approvals_delegateeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.delegated_approvals
    ADD CONSTRAINT "delegated_approvals_delegateeId_fkey" FOREIGN KEY ("delegateeId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delegated_approvals delegated_approvals_delegatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.delegated_approvals
    ADD CONSTRAINT "delegated_approvals_delegatorId_fkey" FOREIGN KEY ("delegatorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: file_attachments file_attachment_invoice_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachment_invoice_fkey FOREIGN KEY ("entityId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: file_attachments file_attachments_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT "file_attachments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: file_attachments file_attachments_uploaderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT "file_attachments_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: integration_sync_logs integration_sync_logs_integrationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.integration_sync_logs
    ADD CONSTRAINT "integration_sync_logs_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES public.integrations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: integrations integrations_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT "integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoice_activities invoice_activities_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoice_activities
    ADD CONSTRAINT "invoice_activities_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoice_comments invoice_comments_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoice_comments
    ADD CONSTRAINT "invoice_comments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoice_comments invoice_comments_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoice_comments
    ADD CONSTRAINT "invoice_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.invoice_comments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoice_comments invoice_comments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoice_comments
    ADD CONSTRAINT "invoice_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoice_line_items invoice_line_items_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoices invoices_creatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_currentApproverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_currentApproverId_fkey" FOREIGN KEY ("currentApproverId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_duplicateOfId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoices invoices_parentInvoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_parentInvoiceId_fkey" FOREIGN KEY ("parentInvoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_updaterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_updaterId_fkey" FOREIGN KEY ("updaterId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_validatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_batches payment_batches_bankAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.payment_batches
    ADD CONSTRAINT "payment_batches_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES public.bank_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_batches payment_batches_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.payment_batches
    ADD CONSTRAINT "payment_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_batches payment_batches_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.payment_batches
    ADD CONSTRAINT "payment_batches_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments payments_bankAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES public.bank_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments payments_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments payments_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_paymentBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_paymentBatchId_fkey" FOREIGN KEY ("paymentBatchId") REFERENCES public.payment_batches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments payments_processedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments payments_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reconciliation_items reconciliation_items_matchedPaymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.reconciliation_items
    ADD CONSTRAINT "reconciliation_items_matchedPaymentId_fkey" FOREIGN KEY ("matchedPaymentId") REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reconciliation_items reconciliation_items_reconciliationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.reconciliation_items
    ADD CONSTRAINT "reconciliation_items_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES public.reconciliations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reconciliations reconciliations_bankAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.reconciliations
    ADD CONSTRAINT "reconciliations_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES public.bank_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reconciliations reconciliations_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.reconciliations
    ADD CONSTRAINT "reconciliations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: risk_scores risk_scores_assessedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.risk_scores
    ADD CONSTRAINT "risk_scores_assessedBy_fkey" FOREIGN KEY ("assessedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: risk_scores risk_scores_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.risk_scores
    ADD CONSTRAINT "risk_scores_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: risk_scores risk_scores_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.risk_scores
    ADD CONSTRAINT "risk_scores_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: risk_scores risk_scores_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.risk_scores
    ADD CONSTRAINT "risk_scores_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: scheduled_tasks scheduled_tasks_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.scheduled_tasks
    ADD CONSTRAINT "scheduled_tasks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_bank_accounts supplier_bank_accounts_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.supplier_bank_accounts
    ADD CONSTRAINT "supplier_bank_accounts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_contacts supplier_contacts_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.supplier_contacts
    ADD CONSTRAINT "supplier_contacts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_contracts supplier_contracts_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.supplier_contracts
    ADD CONSTRAINT "supplier_contracts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_performance supplier_performance_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.supplier_performance
    ADD CONSTRAINT "supplier_performance_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: suppliers suppliers_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT "suppliers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tags tags_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT "tags_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_primaryOrganizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_primaryOrganizationId_fkey" FOREIGN KEY ("primaryOrganizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: webhooks webhooks_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: creditorflow
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT "webhooks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: creditorflow
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict vFw2GSfNi6jbOmphECa6UK9It9BFVm4JzXswssajRArKeyeCPs4vtidGSFWY3Jb

