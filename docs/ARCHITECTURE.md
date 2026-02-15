# CreditorFlow Architecture

## System Overview

CreditorFlow is a modern enterprise invoice management system built with:
- **Frontend**: Next.js 14 + React 18 + TypeScript
- **Backend**: Next.js API Routes + Express (optional)
- **Database**: PostgreSQL 15 with Prisma ORM
- **Cache/Queue**: Redis with BullMQ
- **File Storage**: S3/Azure/Local (configurable)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │  Mobile App  │  │   API Clients │      │
│  │   (Next.js)  │  │   (Future)   │  │   (External)  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼────────────────┼────────────────┼────────────────┘
          │                │                │
          └────────────────┴────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     API Gateway Layer                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Next.js API Routes                       │  │
│  │  /api/invoices | /api/approvals | /api/payments      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Middleware: Auth | Rate Limit | Org Context | Audit  │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Service Layer                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │   IAM    │ │Invoices  │ │Approvals │ │ Payments │       │
│  │  Service │ │ Service  │ │ Service  │ │ Service  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Suppliers │ │Compliance│ │   Risk   │ │  Audit   │       │
│  │  Service │ │ Service  │ │ Service  │ │ Service  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Data Access Layer                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Prisma ORM                         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Transaction Manager                      │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Infrastructure Layer                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ PostgreSQL │  │   Redis    │  │ File Store │            │
│  │  (Data)    │  │(Cache/Jobs)│  │ (S3/Local) │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Invoice Processing
```
Upload → OCR Extraction → Validation → Compliance Check
    ↓
Risk Assessment → Approval Workflow → Payment Processing
    ↓
Reconciliation → Audit Trail → Reporting
```

### Approval Workflow
```
Invoice Submitted → Find Approval Chain → Assign Approvers
    ↓
Send Notifications → Await Decisions → Check SLA
    ↓
Escalate if Needed → Final Approval → Trigger Payment
```

## Database Schema

### Core Entities
- **Users**: Authentication, roles, preferences
- **Organizations**: Multi-tenancy, settings
- **Suppliers**: Vendor management, banking details
- **Invoices**: Invoice data, line items, documents
- **Approvals**: Workflow, delegation, escalation
- **Payments**: Payment records, batches

### Supporting Entities
- **Audit Logs**: Immutable audit trail
- **Notifications**: Multi-channel communications
- **File Attachments**: Document storage
- **Scheduled Tasks**: Background job configuration

## Security Architecture

### Authentication
- JWT-based authentication
- Session management
- API key support
- 2FA/TOTP support

### Authorization
- Role-Based Access Control (RBAC)
- Resource-level permissions
- Organization isolation

### Data Protection
- Encryption at rest (AES-256)
- TLS in transit
- Secure credential storage

## Job Processing

### Scheduled Tasks
- Invoice Processing
- Approval Reminders
- Payment Reconciliation
- Risk Assessment
- Compliance Checks

### Queue Workers
- OCR Processing
- Webhook Delivery
- Notification Sending

## Scalability Considerations

### Horizontal Scaling
- Stateless API servers
- Shared Redis for sessions/jobs
- Database read replicas

### Performance
- Database indexing
- Query optimization
- Redis caching
- File CDN for static assets
