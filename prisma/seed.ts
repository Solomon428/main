import {
  PrismaClient,
  UserRole,
  Department,
  SupplierCategory,
  SupplierStatus,
  RiskLevel,
  Currency,
  InvoiceStatus,
  PaymentStatus,
  ApprovalStatus,
  PaymentMethod,
  BankAccountType,
  ApprovalChainType,
  ComplianceStatus,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationStatus,
  ScheduledTaskType,
  ScheduledTaskStatus,
  StorageProvider,
  IntegrationType,
  IntegrationStatus,
  SyncStatus,
  EntityType,
  AuditAction,
  LogSeverity,
  MatchingStatus,
  ReconciliationStatus,
  TransactionType,
  ReconciliationItemStatus,
  ComplianceCheckType,
  ApprovalDecision,
  SLAStatus,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function seedDevelopmentEnvironment() {
  console.log("🌱 Initializing CreditorFlow EMS development seed...");
  console.log(
    "🔐 Password policy: bcryptjs, saltRounds=12, POPIA-compliant complexity",
  );
  console.log(
    "🇿🇦 Locale: en-ZA, Currency: ZAR, VAT: 15%, Timezone: Africa/Johannesburg",
  );

  try {
    // POPIA-compliant master password for all development users
    const developmentPassword = "CredFlow@Dev2026!";
    const hashedPassword = await hash(developmentPassword, 12);

    // ========================================================================
    // STEP 1: CREATE ORGANIZATION (Multi-tenant root entity)
    // ========================================================================
    console.log("\n📦 Creating organization...");
    const organization = await prisma.organization.upsert({
      where: { id: "dev-org-001" },
      update: {},
      create: {
        id: "dev-org-001",
        name: "IntelliAI Group (Development)",
        legalName: "IntelliAI Group Proprietary Limited",
        tradingName: "IntelliAI",
        taxId: "9876543210",
        vatNumber: "4012345678",
        registrationNumber: "2026/123456/07",
        companyNumber: "CIPC-2026-001",
        industry: "Financial Services",
        sector: "Technology",
        employeeCount: 50,
        annualRevenue: 25000000.0,
        fiscalYearEnd: "2026-12-31",
        website: "https://intelliAI.co.za",
        email: "info@intelliAI.co.za",
        phoneNumber: "+27110000000",
        faxNumber: "+27110000001",
        addressLine1: "123 Sandton Drive",
        addressLine2: "Sandton Business Park",
        city: "Johannesburg",
        state: "Gauteng",
        postalCode: "2196",
        country: "South Africa",
        countryCode: "ZA",
        timezone: "Africa/Johannesburg",
        currency: Currency.ZAR,
        baseCurrency: Currency.ZAR,
        supportedCurrencies: ["ZAR", "USD", "EUR"],
        settings: {
          invoiceNumbering: "auto",
          invoicePrefix: "INV",
          autoApproveThreshold: 5000,
          requirePOForInvoices: true,
        },
        complianceSettings: {
          requireVATValidation: true,
          requireTaxIdValidation: true,
          enableSanctionsScreening: false,
        },
        riskSettings: {
          defaultRiskLevel: RiskLevel.MEDIUM,
          autoFlagHighValue: true,
          highValueThreshold: 100000,
        },
        approvalSettings: {
          enableAutoEscalation: true,
          escalationHours: 24,
          requireDualApproval: false,
        },
        paymentSettings: {
          defaultPaymentTerms: 30,
          defaultPaymentMethod: PaymentMethod.EFT,
          enableBatchPayments: true,
        },
        notificationSettings: {
          enableEmail: true,
          enableSMS: false,
          enableSlack: false,
        },
        brandingSettings: {
          primaryColor: "#1e40af",
          logoUrl: "/assets/logo.png",
          companyName: "IntelliAI Group",
        },
        securitySettings: {
          require2FA: false,
          sessionTimeoutMinutes: 30,
          passwordExpiryDays: 90,
        },
        integrationSettings: {
          enableERP: false,
          enableBankFeed: false,
          enableOCR: false,
        },
        isActive: true,
        isVerified: true,
        isTrial: false,
        trialEndsAt: null,
        plan: "ENTERPRISE",
        planExpiresAt: new Date("2027-12-31"),
        maxUsers: 50,
        maxInvoices: 10000,
        storageQuota: BigInt(10737418240),
        storageUsed: 0,
        metadata: {
          environment: "development",
          seededBy: "Omega-Class Agent",
          seedTimestamp: new Date().toISOString(),
        },
        externalId: "EXT-ORG-001",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    });
    console.log(
      `✅ Organization created: ${organization.name} (ID: ${organization.id})`,
    );

    // ========================================================================
    // STEP 2: CREATE USERS (Role-based access control)
    // ========================================================================
    console.log("\n👥 Creating development users...");
    const users = await Promise.all([
      // SUPER_ADMIN — Full system access (primary contact)
      prisma.user.upsert({
        where: { email: "admin@creditorflow.com" },
        update: {},
        create: {
          employeeId: "EMP-001",
          email: "admin@creditorflow.com",
          emailVerified: new Date(),
          name: "Solomon Makwedini",
          firstName: "Solomon",
          lastName: "Makwedini",
          image: null,
          passwordHash: hashedPassword,
          role: UserRole.SUPER_ADMIN,
          department: Department.FINANCE,
          position: "Chief Executive Officer",
          jobTitle: "CEO",
          phoneNumber: "+27110000000",
          mobileNumber: "+27820000000",
          timezone: "Africa/Johannesburg",
          language: "en",
          locale: "en-ZA",
          isActive: true,
          isLocked: false,
          lastLoginAt: null,
          lastLoginIp: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
          passwordChangedAt: new Date(),
          passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorMethod: null,
          recoveryCodes: [],
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          notificationSettings: {
            invoiceSubmitted: true,
            approvalRequested: true,
            paymentProcessed: true,
            riskAlert: true,
            complianceAlert: true,
          },
          theme: "light",
          sidebarCollapsed: false,
          defaultDashboard: "executive-overview",
          sessionTimeout: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          // 👇 Only SUPER_ADMIN gets primaryOrganizationId
          primaryOrganizationId: organization.id,
        },
      }),
      // CREDIT_CLERK — Invoice processing role
      prisma.user.upsert({
        where: { email: "clerk@creditorflow.com" },
        update: {},
        create: {
          employeeId: "EMP-002",
          email: "clerk@creditorflow.com",
          emailVerified: new Date(),
          name: "Credit Clerk",
          firstName: "Credit",
          lastName: "Clerk",
          passwordHash: hashedPassword,
          role: UserRole.CREDIT_CLERK,
          department: Department.FINANCE,
          position: "Credit Processing Clerk",
          jobTitle: "Credit Clerk",
          phoneNumber: "+27110000001",
          timezone: "Africa/Johannesburg",
          locale: "en-ZA",
          isActive: true,
          isLocked: false,
          passwordChangedAt: new Date(),
          passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          emailNotifications: true,
          pushNotifications: true,
          theme: "light",
          defaultDashboard: "invoice-queue",
          sessionTimeout: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
          // No primaryOrganizationId
        },
      }),
      // BRANCH_MANAGER — Approval authority up to ZAR 50,000
      prisma.user.upsert({
        where: { email: "manager@creditorflow.com" },
        update: {},
        create: {
          employeeId: "EMP-003",
          email: "manager@creditorflow.com",
          emailVerified: new Date(),
          name: "Branch Manager",
          firstName: "Branch",
          lastName: "Manager",
          passwordHash: hashedPassword,
          role: UserRole.BRANCH_MANAGER,
          department: Department.FINANCE,
          position: "Branch Operations Manager",
          jobTitle: "Branch Manager",
          phoneNumber: "+27110000002",
          timezone: "Africa/Johannesburg",
          locale: "en-ZA",
          isActive: true,
          isLocked: false,
          passwordChangedAt: new Date(),
          passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          emailNotifications: true,
          pushNotifications: true,
          theme: "light",
          defaultDashboard: "approval-queue",
          sessionTimeout: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      // FINANCIAL_MANAGER — Approval authority up to ZAR 200,000
      prisma.user.upsert({
        where: { email: "fm@creditorflow.com" },
        update: {},
        create: {
          employeeId: "EMP-004",
          email: "fm@creditorflow.com",
          emailVerified: new Date(),
          name: "Financial Manager",
          firstName: "Financial",
          lastName: "Manager",
          passwordHash: hashedPassword,
          role: UserRole.FINANCIAL_MANAGER,
          department: Department.FINANCE,
          position: "Financial Operations Manager",
          jobTitle: "Financial Manager",
          phoneNumber: "+27110000003",
          timezone: "Africa/Johannesburg",
          locale: "en-ZA",
          isActive: true,
          isLocked: false,
          passwordChangedAt: new Date(),
          passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          emailNotifications: true,
          pushNotifications: true,
          theme: "light",
          defaultDashboard: "financial-reports",
          sessionTimeout: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      // EXECUTIVE — Approval authority up to ZAR 1,000,000
      prisma.user.upsert({
        where: { email: "exec@creditorflow.com" },
        update: {},
        create: {
          employeeId: "EMP-005",
          email: "exec@creditorflow.com",
          emailVerified: new Date(),
          name: "Executive User",
          firstName: "Executive",
          lastName: "User",
          passwordHash: hashedPassword,
          role: UserRole.EXECUTIVE,
          department: Department.FINANCE,
          position: "Executive Director",
          jobTitle: "Executive",
          phoneNumber: "+27110000004",
          timezone: "Africa/Johannesburg",
          locale: "en-ZA",
          isActive: true,
          isLocked: false,
          passwordChangedAt: new Date(),
          passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          emailNotifications: true,
          pushNotifications: true,
          theme: "light",
          defaultDashboard: "executive-overview",
          sessionTimeout: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      // GROUP_FINANCIAL_MANAGER — Highest approval authority
      prisma.user.upsert({
        where: { email: "gfm@creditorflow.com" },
        update: {},
        create: {
          employeeId: "EMP-006",
          email: "gfm@creditorflow.com",
          emailVerified: new Date(),
          name: "Group Financial Manager",
          firstName: "Group Financial",
          lastName: "Manager",
          passwordHash: hashedPassword,
          role: UserRole.GROUP_FINANCIAL_MANAGER,
          department: Department.FINANCE,
          position: "Group Financial Controller",
          jobTitle: "Group Financial Manager",
          phoneNumber: "+27110000005",
          timezone: "Africa/Johannesburg",
          locale: "en-ZA",
          isActive: true,
          isLocked: false,
          passwordChangedAt: new Date(),
          passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          emailNotifications: true,
          pushNotifications: true,
          theme: "light",
          defaultDashboard: "group-reports",
          sessionTimeout: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    ]);
    console.log(
      `✅ Users created: ${users.length} (all password: ${developmentPassword})`,
    );

    // ========================================================================
    // (rest of the seed unchanged: suppliers, bank account, invoices, etc.)
    // ========================================================================
    console.log("\n🏢 Creating suppliers...");
    const suppliers = await Promise.all([
      prisma.supplier.upsert({
        where: { id: "sup-001" },
        update: {},
        create: {
          id: "sup-001",
          organizationId: organization.id,
          supplierCode: "SUP-001",
          name: "Office Supplies Ltd",
          legalName: "Office Supplies Limited",
          tradingName: "Office Supplies",
          taxId: "1234567890",
          vatNumber: "4123456789",
          registrationNumber: "2010/123456/07",
          companyNumber: "CIPC-2010-001",
          status: SupplierStatus.VERIFIED,
          category: SupplierCategory.GOODS,
          subCategory: "Stationery",
          industry: "Retail",
          riskLevel: RiskLevel.LOW,
          riskScore: 15.5,
          complianceStatus: ComplianceStatus.COMPLIANT,
          contactPerson: { name: "John Smith", title: "Sales Manager" },
          primaryContactName: "John Smith",
          primaryContactEmail: "john@officesupplies.co.za",
          primaryContactPhone: "011-123-4567",
          accountsContactName: "Mary Jones",
          accountsContactEmail: "accounts@officesupplies.co.za",
          accountsContactPhone: "011-123-4568",
          billingAddress: {
            line1: "123 Main Street",
            city: "Johannesburg",
            postalCode: "2000",
          },
          shippingAddress: {
            line1: "123 Main Street",
            city: "Johannesburg",
            postalCode: "2000",
          },
          addressLine1: "123 Main Street",
          city: "Johannesburg",
          postalCode: "2000",
          country: "South Africa",
          countryCode: "ZA",
          bankDetails: {
            accountName: "Office Supplies Ltd",
            accountNumber: "1234567890",
          },
          bankName: "Standard Bank",
          bankCode: "051001",
          branchName: "Johannesburg Main",
          branchCode: "051001",
          accountNumber: "1234567890",
          accountType: BankAccountType.CURRENT,
          swiftCode: "SBZAZAJJ",
          currency: Currency.ZAR,
          paymentTerms: 30,
          creditLimit: 50000.0,
          creditTerms: "Net 30",
          earlyPaymentDiscount: 2.5,
          discountDays: 10,
          totalTransactions: 0,
          totalInvoices: 0,
          totalAmount: 0.0,
          totalPaid: 0.0,
          totalOutstanding: 0.0,
          averageInvoiceAmount: null,
          averagePaymentDays: null,
          isActive: true,
          isPreferred: true,
          isVerified: true,
          isWhitelisted: true,
          isBlacklisted: false,
          onHold: false,
          verifiedAt: new Date(),
          verifiedBy: users[0].id,
          onboardingCompletedAt: new Date(),
          notes: "Preferred supplier for office stationery",
          tags: ["stationery", "preferred", "local"],
          customFields: { supplierTier: "Gold" },
          externalId: "EXT-SUP-001",
          source: "MANUAL",
          metadata: { onboardedBy: "admin@creditorflow.com" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      prisma.supplier.upsert({
        where: { id: "sup-002" },
        update: {},
        create: {
          id: "sup-002",
          organizationId: organization.id,
          supplierCode: "SUP-002",
          name: "Tech Solutions Inc",
          legalName: "Tech Solutions Incorporated",
          taxId: "9876543210",
          vatNumber: "4987654321",
          registrationNumber: "2015/987654/08",
          status: SupplierStatus.VERIFIED,
          category: SupplierCategory.TECHNOLOGY,
          industry: "Information Technology",
          riskLevel: RiskLevel.MEDIUM,
          riskScore: 45.0,
          complianceStatus: ComplianceStatus.COMPLIANT,
          primaryContactEmail: "info@techsolutions.co.za",
          primaryContactPhone: "011-987-6543",
          addressLine1: "456 Tech Park",
          city: "Johannesburg",
          postalCode: "1685",
          country: "South Africa",
          countryCode: "ZA",
          bankName: "First National Bank",
          bankCode: "250655",
          accountNumber: "9876543210",
          accountType: BankAccountType.CURRENT,
          currency: Currency.ZAR,
          paymentTerms: 30,
          creditLimit: 100000.0,
          isActive: true,
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: users[0].id,
          tags: ["technology", "it-services"],
          externalId: "EXT-SUP-002",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      prisma.supplier.upsert({
        where: { id: "sup-003" },
        update: {},
        create: {
          id: "sup-003",
          organizationId: organization.id,
          supplierCode: "SUP-003",
          name: "Logistics Pro",
          legalName: "Logistics Pro (Pty) Ltd",
          vatNumber: "4567891234",
          registrationNumber: "2012/456789/03",
          status: SupplierStatus.ACTIVE,
          category: SupplierCategory.LOGISTICS,
          riskLevel: RiskLevel.LOW,
          complianceStatus: ComplianceStatus.COMPLIANT,
          primaryContactEmail: "ops@logisticspro.co.za",
          primaryContactPhone: "011-456-7890",
          addressLine1: "789 Industrial Road",
          city: "Pretoria",
          postalCode: "0184",
          country: "South Africa",
          countryCode: "ZA",
          bankName: "Absa Bank",
          bankCode: "632005",
          accountNumber: "4567891234",
          currency: Currency.ZAR,
          paymentTerms: 14,
          isActive: true,
          isVerified: true,
          tags: ["logistics", "transport"],
          externalId: "EXT-SUP-003",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    ]);
    console.log(`✅ Suppliers created: ${suppliers.length}`);

    // ========================================================================
    // STEP 4: CREATE BANK ACCOUNT
    // ========================================================================
    console.log("\n🏦 Creating bank account...");
    const bankAccount = await prisma.bankAccount.upsert({
      where: { id: "bank-001" },
      update: {},
      create: {
        id: "bank-001",
        organizationId: organization.id,
        accountName: "Primary Operating Account",
        accountNumber: "1234567890",
        bankName: "Standard Bank",
        bankCode: "051001",
        branchName: "Johannesburg Main",
        branchCode: "051001",
        swiftCode: "SBZAZAJJ",
        currency: Currency.ZAR,
        accountType: BankAccountType.CURRENT,
        isPrimary: true,
        isActive: true,
        openingBalance: 500000.0,
        currentBalance: 485230.5,
        availableBalance: 485230.5,
        lastReconciledAt: new Date("2026-01-31"),
        metadata: { accountPurpose: "operational-expenses" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Bank account created: ${bankAccount.accountName}`);

    // ========================================================================
    // STEP 5: CREATE SAMPLE INVOICES
    // ========================================================================
    console.log("\n🧾 Creating sample invoices...");
    const invoices = await Promise.all([
      prisma.invoice.upsert({
        where: { id: "inv-001" },
        update: {},
        create: {
          id: "inv-001",
          organizationId: organization.id,
          invoiceNumber: "INV-2026-001",
          supplierId: suppliers[0].id,
          creatorId: users[1].id,
          referenceNumber: "PO-2026-001",
          purchaseOrderNumber: "PO-2026-001",
          invoiceDate: new Date("2026-01-15"),
          dueDate: new Date("2026-02-15"),
          receivedDate: new Date("2026-01-16"),
          subtotalExclVAT: 10000.0,
          vatRate: 15.0,
          vatAmount: 1500.0,
          totalAmount: 11500.0,
          amountPaid: 0.0,
          amountDue: 11500.0,
          discountAmount: 0.0,
          currency: Currency.ZAR,
          exchangeRate: 1.0,
          baseCurrency: Currency.ZAR,
          baseCurrencyAmount: 11500.0,
          status: InvoiceStatus.PENDING_APPROVAL,
          paymentStatus: PaymentStatus.UNPAID,
          approvalStatus: ApprovalStatus.PENDING,
          riskLevel: RiskLevel.LOW,
          fraudScore: 5.2,
          anomalyScore: 2.1,
          duplicateConfidence: null,
          isDuplicate: false,
          slaStatus: SLAStatus.ON_TRACK,
          slaDueDate: new Date("2026-01-20"),
          processingDeadline: new Date("2026-01-22"),
          supplierName: suppliers[0].name,
          supplierVAT: suppliers[0].vatNumber,
          supplierTaxId: suppliers[0].taxId,
          paymentTerms: 30,
          paymentMethod: PaymentMethod.EFT,
          bankAccountId: bankAccount.id,
          glCode: "6000-001",
          costCenter: "CC-ADMIN",
          department: "Administration",
          budgetCategory: "Office Supplies",
          pdfUrl: "/uploads/invoices/inv-001.pdf",
          pdfHash: "sha256-abc123def456",
          ocrText: "Invoice from Office Supplies Ltd...",
          ocrConfidence: 98.5,
          extractionMethod: "TESSERACT",
          extractionConfidence: 97.2,
          validationScore: 95.0,
          isRecurring: false,
          isUrgent: false,
          requiresAttention: false,
          manualReviewRequired: false,
          isEscalated: false,
          vatCompliant: true,
          termsCompliant: true,
          fullyApproved: false,
          readyForPayment: false,
          currentApproverId: users[2].id,
          currentStage: 1,
          totalStages: 3,
          notes: "Monthly stationery order",
          tags: ["stationery", "recurring"],
          customFields: { department: "Admin", projectCode: "PROJ-001" },
          source: "MANUAL",
          externalId: "EXT-INV-001",
          metadata: { uploadedBy: "clerk@creditorflow.com" },
          createdAt: new Date("2026-01-16T09:00:00Z"),
          updatedAt: new Date("2026-01-16T09:00:00Z"),
        },
      }),
      prisma.invoice.upsert({
        where: { id: "inv-002" },
        update: {},
        create: {
          id: "inv-002",
          organizationId: organization.id,
          invoiceNumber: "INV-2026-002",
          supplierId: suppliers[1].id,
          creatorId: users[1].id,
          validatorId: users[3].id,
          invoiceDate: new Date("2026-01-20"),
          dueDate: new Date("2026-02-20"),
          receivedDate: new Date("2026-01-21"),
          validatedDate: new Date("2026-01-22"),
          approvedDate: new Date("2026-01-23"),
          subtotalExclVAT: 25000.0,
          vatRate: 15.0,
          vatAmount: 3750.0,
          totalAmount: 28750.0,
          amountPaid: 0.0,
          amountDue: 28750.0,
          currency: Currency.ZAR,
          status: InvoiceStatus.APPROVED,
          paymentStatus: PaymentStatus.UNPAID,
          approvalStatus: ApprovalStatus.APPROVED,
          riskLevel: RiskLevel.MEDIUM,
          fraudScore: 22.3,
          slaStatus: SLAStatus.ON_TRACK,
          slaDueDate: new Date("2026-01-25"),
          supplierName: suppliers[1].name,
          supplierVAT: suppliers[1].vatNumber,
          paymentTerms: 30,
          paymentMethod: PaymentMethod.EFT,
          bankAccountId: bankAccount.id,
          glCode: "6100-002",
          costCenter: "CC-IT",
          department: "IT",
          pdfUrl: "/uploads/invoices/inv-002.pdf",
          ocrConfidence: 96.8,
          extractionConfidence: 95.5,
          validationScore: 98.0,
          isUrgent: false,
          vatCompliant: true,
          fullyApproved: true,
          readyForPayment: true,
          currentApproverId: users[3].id,
          currentStage: 3,
          totalStages: 3,
          notes: "IT infrastructure upgrade",
          tags: ["technology", "infrastructure"],
          source: "MANUAL",
          externalId: "EXT-INV-002",
          createdAt: new Date("2026-01-21T10:30:00Z"),
          updatedAt: new Date("2026-01-23T14:00:00Z"),
        },
      }),
      prisma.invoice.upsert({
        where: { id: "inv-003" },
        update: {},
        create: {
          id: "inv-003",
          organizationId: organization.id,
          invoiceNumber: "INV-2026-003",
          supplierId: suppliers[2].id,
          creatorId: users[1].id,
          validatorId: users[3].id,
          invoiceDate: new Date("2026-01-25"),
          dueDate: new Date("2026-02-25"),
          receivedDate: new Date("2026-01-26"),
          validatedDate: new Date("2026-01-27"),
          approvedDate: new Date("2026-01-28"),
          paidDate: new Date("2026-02-01"),
          subtotalExclVAT: 5000.0,
          vatRate: 15.0,
          vatAmount: 750.0,
          totalAmount: 5750.0,
          amountPaid: 5750.0,
          amountDue: 0.0,
          currency: Currency.ZAR,
          status: InvoiceStatus.PAID,
          paymentStatus: PaymentStatus.PAID,
          approvalStatus: ApprovalStatus.APPROVED,
          riskLevel: RiskLevel.LOW,
          fraudScore: 3.1,
          slaStatus: SLAStatus.COMPLETED,
          supplierName: suppliers[2].name,
          supplierVAT: suppliers[2].vatNumber,
          paymentTerms: 14,
          paymentMethod: PaymentMethod.EFT,
          bankAccountId: bankAccount.id,
          glCode: "6200-003",
          costCenter: "CC-LOGISTICS",
          department: "Operations",
          pdfUrl: "/uploads/invoices/inv-003.pdf",
          ocrConfidence: 99.1,
          extractionConfidence: 98.8,
          validationScore: 99.5,
          vatCompliant: true,
          fullyApproved: true,
          readyForPayment: true,
          currentStage: 3,
          totalStages: 3,
          notes: "Logistics services - January",
          tags: ["logistics", "paid"],
          source: "MANUAL",
          externalId: "EXT-INV-003",
          createdAt: new Date("2026-01-26T08:15:00Z"),
          updatedAt: new Date("2026-02-01T16:45:00Z"),
        },
      }),
    ]);
    console.log(`✅ Invoices created: ${invoices.length}`);

    // ========================================================================
    // STEP 6: CREATE APPROVAL CHAIN
    // ========================================================================
    console.log("\n⚙️ Creating approval workflow...");
    const approvalChain = await prisma.approvalChain.upsert({
      where: { id: "chain-001" },
      update: {},
      create: {
        id: "chain-001",
        organizationId: organization.id,
        name: "Standard Approval Workflow",
        description: "Default sequential approval workflow for invoices",
        type: ApprovalChainType.SEQUENTIAL,
        department: null,
        category: null,
        minAmount: 0.0,
        maxAmount: 1000000.0,
        currency: Currency.ZAR,
        levels: [
          {
            level: 1,
            role: UserRole.CREDIT_CLERK,
            maxAmount: 10000,
            required: true,
          },
          {
            level: 2,
            role: UserRole.BRANCH_MANAGER,
            maxAmount: 50000,
            required: true,
          },
          {
            level: 3,
            role: UserRole.FINANCIAL_MANAGER,
            maxAmount: 200000,
            required: true,
          },
          {
            level: 4,
            role: UserRole.EXECUTIVE,
            maxAmount: 1000000,
            required: true,
          },
        ],
        approverRoles: [
          UserRole.CREDIT_CLERK,
          UserRole.BRANCH_MANAGER,
          UserRole.FINANCIAL_MANAGER,
          UserRole.EXECUTIVE,
        ],
        specificApprovers: [],
        alternateApprovers: [],
        autoEscalation: true,
        escalationHours: 24,
        reminderHours: 12,
        allowDelegation: true,
        requireAllApprovers: false,
        conditions: { requirePO: true, requireVAT: true },
        rules: { autoApproveUnder: 5000, requireDualApprovalOver: 500000 },
        isActive: true,
        priority: 1,
        metadata: { createdBy: "admin@creditorflow.com", version: "1.0" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Approval chain created: ${approvalChain.name}`);

    // ========================================================================
    // STEP 7: CREATE SYSTEM SETTINGS
    // ========================================================================
    console.log("\n⚙️ Creating system settings...");
    const settings = await Promise.all([
      prisma.systemSetting.upsert({
        where: { key: "company.name" },
        update: {},
        create: {
          key: "company.name",
          value: "IntelliAI Group (Development)",
          defaultValue: "CreditorFlow EMS",
          description: "Company name displayed in the application",
          category: "GENERAL",
          dataType: "STRING",
          isEncrypted: false,
          isEditable: true,
          isVisible: true,
          requiresRestart: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      prisma.systemSetting.upsert({
        where: { key: "invoice.default_payment_terms" },
        update: {},
        create: {
          key: "invoice.default_payment_terms",
          value: 30,
          defaultValue: 30,
          description: "Default payment terms in days",
          category: "INVOICE",
          dataType: "NUMBER",
          isEncrypted: false,
          isEditable: true,
          isVisible: true,
          requiresRestart: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      prisma.systemSetting.upsert({
        where: { key: "approval.auto_escalate" },
        update: {},
        create: {
          key: "approval.auto_escalate",
          value: true,
          defaultValue: true,
          description: "Automatically escalate overdue approvals",
          category: "APPROVAL",
          dataType: "BOOLEAN",
          isEncrypted: false,
          isEditable: true,
          isVisible: true,
          requiresRestart: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      prisma.systemSetting.upsert({
        where: { key: "compliance.vat_rate" },
        update: {},
        create: {
          key: "compliance.vat_rate",
          value: 15.0,
          defaultValue: 15.0,
          description: "South African VAT rate (SARS compliant)",
          category: "COMPLIANCE",
          dataType: "NUMBER",
          isEncrypted: false,
          isEditable: false,
          isVisible: true,
          requiresRestart: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      prisma.systemSetting.upsert({
        where: { key: "security.session_timeout" },
        update: {},
        create: {
          key: "security.session_timeout",
          value: 30,
          defaultValue: 30,
          description: "User session timeout in minutes",
          category: "SECURITY",
          dataType: "NUMBER",
          isEncrypted: false,
          isEditable: true,
          isVisible: true,
          requiresRestart: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    ]);
    console.log(`✅ System settings created: ${settings.length}`);

    // ========================================================================
    // STEP 8: OUTPUT CREDENTIALS
    // ========================================================================
    console.log("\n" + "═".repeat(60));
    console.log("🔐 DEVELOPMENT LOGIN CREDENTIALS");
    console.log("═".repeat(60));
    console.log(`Application URL:    http://localhost:3000/login`); // 👈 Updated port to 3000
    console.log(`Database:           PostgreSQL @ localhost:5432/creditorflow`);
    console.log(`Environment:        development`);
    console.log("");
    console.log("┌─────────────────────────────────────────────────┐");
    console.log("│ SUPER_ADMIN (Full Access)                       │");
    console.log("├─────────────────────────────────────────────────┤");
    console.log(`│ Email:    admin@creditorflow.com                │`);
    console.log(`│ Password: ${developmentPassword}                │`);
    console.log("├─────────────────────────────────────────────────┤");
    console.log("│ CREDIT_CLERK (Invoice Processing)               │");
    console.log("├─────────────────────────────────────────────────┤");
    console.log(`│ Email:    clerk@creditorflow.com                │`);
    console.log(`│ Password: ${developmentPassword}                │`);
    console.log("├─────────────────────────────────────────────────┤");
    console.log("│ BRANCH_MANAGER (Approvals ≤ ZAR 50,000)         │");
    console.log("├─────────────────────────────────────────────────┤");
    console.log(`│ Email:    manager@creditorflow.com              │`);
    console.log(`│ Password: ${developmentPassword}                │`);
    console.log("├─────────────────────────────────────────────────┤");
    console.log("│ FINANCIAL_MANAGER (Approvals ≤ ZAR 200,000)     │");
    console.log("├─────────────────────────────────────────────────┤");
    console.log(`│ Email:    fm@creditorflow.com                   │`);
    console.log(`│ Password: ${developmentPassword}                │`);
    console.log("├─────────────────────────────────────────────────┤");
    console.log("│ EXECUTIVE (Approvals ≤ ZAR 1,000,000)           │");
    console.log("├─────────────────────────────────────────────────┤");
    console.log(`│ Email:    exec@creditorflow.com                 │`);
    console.log(`│ Password: ${developmentPassword}                │`);
    console.log("├─────────────────────────────────────────────────┤");
    console.log("│ GROUP_FINANCIAL_MANAGER (Unlimited Approval)    │");
    console.log("├─────────────────────────────────────────────────┤");
    console.log(`│ Email:    gfm@creditorflow.com                  │`);
    console.log(`│ Password: ${developmentPassword}                │`);
    console.log("└─────────────────────────────────────────────────┘");
    console.log("");
    console.log("⚠️  SECURITY NOTICE:");
    console.log("   • These credentials are for DEVELOPMENT ONLY");
    console.log("   • Rotate ALL passwords before staging/production");
    console.log("   • Never commit credentials to version control");
    console.log("   • Enable TWO_FACTOR_ENABLED in production");
    console.log("═".repeat(60));

    // ========================================================================
    // STEP 9: VERIFICATION QUERIES
    // ========================================================================
    console.log("\n🔍 Verification queries (run in psql):");
    console.log(`\\c creditorflow`);
    console.log(
      `SELECT id, email, role, "primaryOrganizationId" FROM users WHERE email LIKE '%@creditorflow.com' ORDER BY role;`,
    );
    console.log(
      `SELECT id, name, "vatNumber", status FROM suppliers WHERE "organizationId" = 'dev-org-001';`,
    );
    console.log(
      `SELECT "invoiceNumber", "totalAmount", status, "paymentStatus" FROM invoices WHERE "organizationId" = 'dev-org-001';`,
    );

    return {
      organization,
      users,
      suppliers,
      bankAccount,
      invoices,
      approvalChain,
      settings,
      credentials: {
        password: developmentPassword,
        users: users.map((u) => ({ email: u.email, role: u.role })),
      },
    };
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log("\n🔌 Database connection closed");
  }
}

seedDevelopmentEnvironment()
  .then((result) => {
    console.log("\n🎉 Seed completed successfully");
    console.log(`📊 Summary:`);
    console.log(`   • Organization: ${result.organization.name}`);
    console.log(`   • Users: ${result.users.length} (6 role-based accounts)`);
    console.log(`   • Suppliers: ${result.suppliers.length} (SA-compliant)`);
    console.log(`   • Invoices: ${result.invoices.length} (VAT-calculated)`);
    console.log(`   • Bank Accounts: 1`);
    console.log(`   • Approval Chains: 1`);
    console.log(`   • System Settings: ${result.settings.length}`);
    console.log(
      `\n✅ Ready for authentication testing at http://localhost:3000/login`,
    ); // 👈 Updated port
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Seed execution failed");
    console.error(error);
    process.exit(1);
  });
