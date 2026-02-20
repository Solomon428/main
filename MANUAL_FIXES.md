# CreditorFlow — Manual Fix Reference
# Items the automation script cannot safely handle
# Apply these after running fix-typescript-errors.ps1

---

## FIX M1: NotificationTypeEnum / PriorityLevelEnum — const object conversion

### File: src/domain/enums/NotificationTypeEnum.ts (or wherever it is defined)

Change FROM:
```typescript
export type NotificationTypeEnum = 'APPROVAL_REQUIRED' | 'INVOICE_APPROVED' | ...;
```

Change TO:
```typescript
export const NotificationTypeEnum = {
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  INVOICE_APPROVED: 'INVOICE_APPROVED',
  INVOICE_REJECTED: 'INVOICE_REJECTED',
  INVOICE_SUBMITTED: 'INVOICE_SUBMITTED',
  PAYMENT_PROCESSED: 'PAYMENT_PROCESSED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  SUPPLIER_VERIFIED: 'SUPPLIER_VERIFIED',
  FRAUD_ALERT: 'FRAUD_ALERT',
  PAYMENT_DUE_SOON: 'PAYMENT_DUE_SOON',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  MONTHLY_REPORT: 'MONTHLY_REPORT',
  SLA_BREACH: 'SLA_BREACH',
  SYSTEM_NOTIFICATION: 'SYSTEM_NOTIFICATION',
} as const;
export type NotificationTypeEnum = typeof NotificationTypeEnum[keyof typeof NotificationTypeEnum];
```

Apply the identical pattern to PriorityLevelEnum.

---

## FIX M2: Add missing type exports to src/types/index.ts

These types are imported by approver-router.impl.ts and other files but not exported:

```typescript
// Add to src/types/index.ts

export type ApprovalRoutingInput = {
  invoiceId: string;
  organizationId: string;
  amount: number;
  currency: string;
  supplierId?: string;
  requestedBy: string;
};

export type ApprovalRoutingResult = {
  chainId?: string;
  stages: ApprovalStage[];
  requiresApproval: boolean;
  reason?: string;
};

export type ApprovalStage = {
  sequence: number;
  approverId: string;
  approverRole: string;
  limit?: number;
  isBackup?: boolean;
  deadline?: Date;
};

export type SLAConfig = {
  hours: number;
  escalationHours?: number;
  warningThresholdPercent?: number;
};

export type DuplicateCheckInput = {
  invoiceNumber?: string;
  supplierId: string;
  amount: number;
  invoiceDate: Date;
  organizationId: string;
  excludeInvoiceId?: string;
};

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  confidence: number;
  matchedInvoiceId?: string;
  matchReasons: string[];
};

export type VATCheckResult = {
  isValid: boolean;
  vatNumber: string;
  supplierName?: string;
  errorCode?: string;
  checkedAt: Date;
};

export type BatchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

export type ExtractedInvoiceData = {
  invoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  totalAmount?: number;
  vatAmount?: number;
  currency?: string;
  supplierName?: string;
  supplierVATNumber?: string;
  lineItems?: ExtractedLineItem[];
  confidence: number;
};

export type ExtractedLineItem = {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  vatRate?: number;
};

export type ParserResult = {
  success: boolean;
  data?: ExtractedInvoiceData;
  confidence: number;
  processingMs?: number;
  errors?: string[];
};
```

---

## FIX M3: Fix logInfo function signature

### File: src/lib/utils/audit-logger.ts (or wherever logInfo is defined)

The function is called with 5 arguments but its signature accepts 1-3.

Find the current signature — it is likely:
```typescript
export function logInfo(message: string, context?: object, level?: string) { ... }
```

Change to:
```typescript
export function logInfo(
  message: string,
  context?: object,
  level?: string,
  organizationId?: string,
  userId?: string
) { ... }
```

Or, if the function is already flexible, the call sites need to be checked.
Search for `logInfo(` with 5 comma-separated arguments to find all call sites.

---

## FIX M4: Fix calculateConfidence function signature

Search for `calculateConfidence(` in the codebase.
The function is called with 5 arguments but expects 6.
Identify the call site and the definition — add the missing parameter (likely a weight or threshold value).

---

## FIX M5: Fix validateInvoiceVAT function signature

### File: src/logic-engine/compliance/vat-validator/ (locate the actual file)

The function is called with 3-4 arguments but defined to accept 1-2.
Add the additional parameters to the function signature:
```typescript
// Likely fix:
async function validateInvoiceVAT(
  vatNumber: string,
  countryCode?: string,
  organizationId?: string,
  cache?: boolean
): Promise<VATCheckResult>
```

---

## FIX M6: Fix checkForDuplicates and calculateScore static vs instance mismatch

These are called as instance methods but defined as static methods (or vice versa).

For `checkForDuplicates` in AdvancedDuplicateDetector:
- If it is `static checkForDuplicates(...)`, calls must use `AdvancedDuplicateDetector.checkForDuplicates(...)`
- If it is an instance method, the class must be instantiated first

For `calculateScore` in FraudScorer:
- Same pattern — verify static vs instance at definition and fix the call sites

---

## FIX M7: Fix selectApprover and assignBackup missing methods

### selectApprover does not exist on WorkloadBalancer
Find calls to `.selectApprover(...)` on a WorkloadBalancer instance.
Either:
a) Rename to the correct method name (check the class definition)
b) Add the method to the WorkloadBalancer class

### assignBackup does not exist on BackupApproverAssigner
Same pattern — either rename or add the method.

---

## FIX M8: Prisma db push — run after schema edits

After merging SCHEMA_ADDITIONS.prisma into prisma/schema.prisma:

```powershell
npx prisma generate
npx prisma db push --accept-data-loss
```

The --accept-data-loss flag is required because:
- Adding enum values to existing enums counts as a destructive change in Prisma's detection
- The database has no production data (verified: 0 tables before push)
- Therefore no actual data loss occurs

---

## VERIFICATION SEQUENCE

After applying all fixes, run in order:

1. Check error count:
   npx tsc --noEmit 2>&1 | Select-String "error TS" | Measure-Object -Line

2. Check remaining errors by category:
   npx tsc --noEmit 2>&1 | Select-String "error TS" | Group-Object { $_ -replace ".*error (TS\d+).*", '$1' } | Sort-Object Count -Descending

3. If errors remain, inspect the first 20:
   npx tsc --noEmit 2>&1 | Select-String "error TS" | Select-Object -First 20

4. Restart Next.js dev server:
   # Stop current process, then:
   npm run dev
