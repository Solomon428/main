import { PrismaClient, UserRole, Department, SupplierCategory, SupplierStatus, RiskLevel, Currency, InvoiceStatus, PaymentStatus, ApprovalStatus, PaymentMethod, BankAccountType } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash password for all users (password: 'password123')
  const defaultPassword = await hash('password123', 10);

  // Create organization first
  const organization = await prisma.organization.upsert({
    where: { id: 'org-001' },
    update: {},
    create: {
      id: 'org-001',
      name: 'CreditorFlow Demo Organization',
      legalName: 'CreditorFlow Demo Organization (Pty) Ltd',
      taxId: '1234567890',
      vatNumber: '4123456789',
      registrationNumber: '2010/123456/07',
      industry: 'Financial Services',
      email: 'info@creditorflow.com',
      phoneNumber: '+27 11 123 4567',
      addressLine1: '123 Main Street',
      city: 'Johannesburg',
      state: 'Gauteng',
      postalCode: '2000',
      country: 'South Africa',
      countryCode: 'ZA',
      currency: Currency.ZAR,
      baseCurrency: Currency.ZAR,
      isActive: true,
      isVerified: true,
    },
  });

  console.log('✅ Organization created:', organization.name);

  // Create users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@creditorflow.com' },
      update: {},
      create: {
        employeeId: 'EMP001',
        email: 'admin@creditorflow.com',
        passwordHash: defaultPassword,
        name: 'System Administrator',
        firstName: 'System',
        lastName: 'Administrator',
        role: UserRole.ADMIN,
        department: Department.IT,
        jobTitle: 'System Administrator',
        isActive: true,
        emailNotifications: true,
        pushNotifications: true,
        organizations: { connect: { id: organization.id } },
      },
    }),
    prisma.user.upsert({
      where: { email: 'clerk@creditorflow.com' },
      update: {},
      create: {
        employeeId: 'EMP002',
        email: 'clerk@creditorflow.com',
        passwordHash: defaultPassword,
        name: 'Credit Clerk',
        firstName: 'Credit',
        lastName: 'Clerk',
        role: UserRole.CREDIT_CLERK,
        department: Department.FINANCE,
        jobTitle: 'Credit Clerk',
        isActive: true,
        emailNotifications: true,
        organizations: { connect: { id: organization.id } },
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager@creditorflow.com' },
      update: {},
      create: {
        employeeId: 'EMP003',
        email: 'manager@creditorflow.com',
        passwordHash: defaultPassword,
        name: 'Branch Manager',
        firstName: 'Branch',
        lastName: 'Manager',
        role: UserRole.BRANCH_MANAGER,
        department: Department.FINANCE,
        jobTitle: 'Branch Manager',
        isActive: true,
        emailNotifications: true,
        organizations: { connect: { id: organization.id } },
      },
    }),
    prisma.user.upsert({
      where: { email: 'fm@creditorflow.com' },
      update: {},
      create: {
        employeeId: 'EMP004',
        email: 'fm@creditorflow.com',
        passwordHash: defaultPassword,
        name: 'Financial Manager',
        firstName: 'Financial',
        lastName: 'Manager',
        role: UserRole.FINANCIAL_MANAGER,
        department: Department.FINANCE,
        jobTitle: 'Financial Manager',
        isActive: true,
        emailNotifications: true,
        organizations: { connect: { id: organization.id } },
      },
    }),
    prisma.user.upsert({
      where: { email: 'exec@creditorflow.com' },
      update: {},
      create: {
        employeeId: 'EMP005',
        email: 'exec@creditorflow.com',
        passwordHash: defaultPassword,
        name: 'Executive',
        firstName: 'Executive',
        lastName: 'User',
        role: UserRole.EXECUTIVE,
        department: Department.FINANCE,
        jobTitle: 'Executive',
        isActive: true,
        emailNotifications: true,
        organizations: { connect: { id: organization.id } },
      },
    }),
    prisma.user.upsert({
      where: { email: 'gfm@creditorflow.com' },
      update: {},
      create: {
        employeeId: 'EMP006',
        email: 'gfm@creditorflow.com',
        passwordHash: defaultPassword,
        name: 'Group Financial Manager',
        firstName: 'Group Financial',
        lastName: 'Manager',
        role: UserRole.GROUP_FINANCIAL_MANAGER,
        department: Department.FINANCE,
        jobTitle: 'Group Financial Manager',
        isActive: true,
        emailNotifications: true,
        organizations: { connect: { id: organization.id } },
      },
    }),
  ]);

  console.log('✅ Users created:', users.length);

  // Create suppliers
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { id: 'supplier-001' },
      update: {},
      create: {
        id: 'supplier-001',
        organizationId: organization.id,
        supplierCode: 'SUP001',
        name: 'Office Supplies Ltd',
        legalName: 'Office Supplies Limited',
        vatNumber: '4123456789',
        registrationNumber: '2010/123456/07',
        category: SupplierCategory.GOODS,
        status: SupplierStatus.ACTIVE,
        riskLevel: RiskLevel.LOW,
        primaryContactEmail: 'john@officesupplies.co.za',
        primaryContactPhone: '011-123-4567',
        addressLine1: '123 Main Street',
        city: 'Johannesburg',
        postalCode: '2000',
        country: 'South Africa',
        countryCode: 'ZA',
        currency: Currency.ZAR,
        isActive: true,
        isVerified: true,
      },
    }),
    prisma.supplier.upsert({
      where: { id: 'supplier-002' },
      update: {},
      create: {
        id: 'supplier-002',
        organizationId: organization.id,
        supplierCode: 'SUP002',
        name: 'Tech Solutions Inc',
        legalName: 'Tech Solutions Incorporated',
        vatNumber: '4987654321',
        registrationNumber: '2015/987654/08',
        category: SupplierCategory.TECHNOLOGY,
        status: SupplierStatus.ACTIVE,
        riskLevel: RiskLevel.MEDIUM,
        primaryContactEmail: 'info@techsolutions.co.za',
        primaryContactPhone: '011-987-6543',
        addressLine1: '456 Tech Park',
        city: 'Johannesburg',
        postalCode: '1685',
        country: 'South Africa',
        countryCode: 'ZA',
        currency: Currency.ZAR,
        isActive: true,
        isVerified: true,
      },
    }),
    prisma.supplier.upsert({
      where: { id: 'supplier-003' },
      update: {},
      create: {
        id: 'supplier-003',
        organizationId: organization.id,
        supplierCode: 'SUP003',
        name: 'Logistics Pro',
        legalName: 'Logistics Pro (Pty) Ltd',
        vatNumber: '4567891234',
        registrationNumber: '2012/456789/03',
        category: SupplierCategory.LOGISTICS,
        status: SupplierStatus.ACTIVE,
        riskLevel: RiskLevel.LOW,
        primaryContactEmail: 'ops@logisticspro.co.za',
        primaryContactPhone: '011-456-7890',
        addressLine1: '789 Industrial Road',
        city: 'Pretoria',
        postalCode: '0184',
        country: 'South Africa',
        countryCode: 'ZA',
        currency: Currency.ZAR,
        isActive: true,
        isVerified: true,
      },
    }),
  ]);

  console.log('✅ Suppliers created:', suppliers.length);

  // Create bank account
  const bankAccount = await prisma.bankAccount.upsert({
    where: { id: 'bank-001' },
    update: {},
    create: {
      id: 'bank-001',
      organizationId: organization.id,
      accountName: 'Primary Operating Account',
      accountNumber: '1234567890',
      bankName: 'Standard Bank',
      bankCode: '051001',
      branchName: 'Johannesburg Main',
      branchCode: '051001',
      currency: Currency.ZAR,
      accountType: BankAccountType.CURRENT,
      isPrimary: true,
      isActive: true,
    },
  });

  console.log('✅ Bank account created:', bankAccount.accountName);

  // Create sample invoices
  const invoices = await Promise.all([
    prisma.invoice.upsert({
      where: { id: 'inv-001' },
      update: {},
      create: {
        id: 'inv-001',
        organizationId: organization.id,
        invoiceNumber: 'INV-2026-001',
        supplierId: suppliers[0].id,
        invoiceDate: new Date('2026-01-15'),
        dueDate: new Date('2026-02-15'),
        subtotalExclVAT: 10000.00,
        vatRate: 15.00,
        vatAmount: 1500.00,
        totalAmount: 11500.00,
        amountDue: 11500.00,
        currency: Currency.ZAR,
        status: InvoiceStatus.PENDING_APPROVAL,
        paymentStatus: PaymentStatus.UNPAID,
        approvalStatus: ApprovalStatus.PENDING,
        supplierName: suppliers[0].name,
        supplierVAT: suppliers[0].vatNumber,
        paymentTerms: 30,
      },
    }),
    prisma.invoice.upsert({
      where: { id: 'inv-002' },
      update: {},
      create: {
        id: 'inv-002',
        organizationId: organization.id,
        invoiceNumber: 'INV-2026-002',
        supplierId: suppliers[1].id,
        invoiceDate: new Date('2026-01-20'),
        dueDate: new Date('2026-02-20'),
        subtotalExclVAT: 25000.00,
        vatRate: 15.00,
        vatAmount: 3750.00,
        totalAmount: 28750.00,
        amountDue: 28750.00,
        currency: Currency.ZAR,
        status: InvoiceStatus.APPROVED,
        paymentStatus: PaymentStatus.UNPAID,
        approvalStatus: ApprovalStatus.APPROVED,
        supplierName: suppliers[1].name,
        supplierVAT: suppliers[1].vatNumber,
        paymentTerms: 30,
        readyForPayment: true,
      },
    }),
    prisma.invoice.upsert({
      where: { id: 'inv-003' },
      update: {},
      create: {
        id: 'inv-003',
        organizationId: organization.id,
        invoiceNumber: 'INV-2026-003',
        supplierId: suppliers[2].id,
        invoiceDate: new Date('2026-01-25'),
        dueDate: new Date('2026-02-25'),
        subtotalExclVAT: 5000.00,
        vatRate: 15.00,
        vatAmount: 750.00,
        totalAmount: 5750.00,
        amountDue: 5750.00,
        currency: Currency.ZAR,
        status: InvoiceStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        approvalStatus: ApprovalStatus.APPROVED,
        supplierName: suppliers[2].name,
        supplierVAT: suppliers[2].vatNumber,
        paymentTerms: 30,
        paidDate: new Date('2026-02-01'),
      },
    }),
  ]);

  console.log('✅ Invoices created:', invoices.length);

  // Create approval chains
  const approvalChain = await prisma.approvalChain.upsert({
    where: { id: 'chain-001' },
    update: {},
    create: {
      id: 'chain-001',
      organizationId: organization.id,
      name: 'Standard Approval Workflow',
      description: 'Default approval workflow for invoices',
      type: 'SEQUENTIAL',
      minAmount: 0,
      maxAmount: 1000000,
      currency: Currency.ZAR,
      levels: [
        { level: 1, role: 'CREDIT_CLERK', maxAmount: 10000 },
        { level: 2, role: 'BRANCH_MANAGER', maxAmount: 50000 },
        { level: 3, role: 'FINANCIAL_MANAGER', maxAmount: 200000 },
        { level: 4, role: 'EXECUTIVE', maxAmount: 1000000 },
      ],
      approverRoles: ['CREDIT_CLERK', 'BRANCH_MANAGER', 'FINANCIAL_MANAGER', 'EXECUTIVE'],
      autoEscalation: true,
      escalationHours: 24,
      reminderHours: 12,
      allowDelegation: true,
      isActive: true,
    },
  });

  console.log('✅ Approval chain created:', approvalChain.name);

  // Create system settings
  const settings = await Promise.all([
    prisma.systemSetting.upsert({
      where: { key: 'company.name' },
      update: {},
      create: {
        key: 'company.name',
        value: 'CreditorFlow Demo Organization',
        description: 'Company name displayed in the application',
        category: 'GENERAL',
        dataType: 'STRING',
      },
    }),
    prisma.systemSetting.upsert({
      where: { key: 'invoice.default_payment_terms' },
      update: {},
      create: {
        key: 'invoice.default_payment_terms',
        value: 30,
        description: 'Default payment terms in days',
        category: 'INVOICE',
        dataType: 'NUMBER',
      },
    }),
    prisma.systemSetting.upsert({
      where: { key: 'approval.auto_escalate' },
      update: {},
      create: {
        key: 'approval.auto_escalate',
        value: true,
        description: 'Automatically escalate overdue approvals',
        category: 'APPROVAL',
        dataType: 'BOOLEAN',
      },
    }),
  ]);

  console.log('✅ System settings created:', settings.length);

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   • Organization: ${organization.name}`);
  console.log(`   • Users: ${users.length} (password: 'password123')`);
  console.log(`   • Suppliers: ${suppliers.length}`);
  console.log(`   • Invoices: ${invoices.length}`);
  console.log(`   • Bank Accounts: 1`);
  console.log(`   • Approval Chains: 1`);
  console.log(`   • System Settings: ${settings.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
