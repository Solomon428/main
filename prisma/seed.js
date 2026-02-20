const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Create admin user
    const user = await prisma.user.upsert({
      where: { email: "admin@creditorflow.com" },
      update: {},
      create: {
        email: "admin@creditorflow.com",
        name: "System Administrator",
        passwordHash: hashedPassword,
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log("✓ Created user:", user.email);

    // Create organization
    const org = await prisma.organization.upsert({
      where: { id: "default-org" },
      update: {},
      create: {
        id: "default-org",
        name: "CreditorFlow Demo Company",
        taxId: "1234567890",
        isActive: true,
        currency: "ZAR",
      },
    });
    console.log("✓ Created organization:", org.name);

    // Create supplier
    const supplier = await prisma.supplier.create({
      data: {
        organizationId: org.id,
        name: "Acme Supplies Ltd",
        email: "accounts@acmesupplies.com",
        taxId: "9876543210",
        status: "ACTIVE",
        isActive: true,
        category: "SERVICES",
        paymentTerms: 30,
      },
    });
    console.log("✓ Created supplier:", supplier.name);

    // Create sample invoices
    const now = new Date();
    const invoice1 = await prisma.invoice.create({
      data: {
        organizationId: org.id,
        invoiceNumber: "INV-2024-001",
        supplierId: supplier.id,
        creatorId: user.id,
        totalAmount: 15000.0,
        subtotalExclVAT: 13043.48,
        vatAmount: 1956.52,
        vatRate: 15.0,
        currency: "ZAR",
        status: "PENDING_APPROVAL",
        paymentStatus: "UNPAID",
        approvalStatus: "PENDING",
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        invoiceDate: now,
        supplierName: supplier.name,
        isUrgent: false,
      },
    });

    const invoice2 = await prisma.invoice.create({
      data: {
        organizationId: org.id,
        invoiceNumber: "INV-2024-002",
        supplierId: supplier.id,
        creatorId: user.id,
        totalAmount: 8500.5,
        subtotalExclVAT: 7391.74,
        vatAmount: 1108.76,
        vatRate: 15.0,
        currency: "ZAR",
        status: "APPROVED",
        paymentStatus: "SCHEDULED",
        approvalStatus: "APPROVED",
        dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        invoiceDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        supplierName: supplier.name,
        isUrgent: true,
      },
    });

    const invoice3 = await prisma.invoice.create({
      data: {
        organizationId: org.id,
        invoiceNumber: "INV-2024-003",
        supplierId: supplier.id,
        creatorId: user.id,
        totalAmount: 3200.0,
        subtotalExclVAT: 2782.61,
        vatAmount: 417.39,
        vatRate: 15.0,
        currency: "ZAR",
        status: "PAID",
        paymentStatus: "PAID",
        approvalStatus: "APPROVED",
        dueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        invoiceDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        supplierName: supplier.name,
        isUrgent: false,
      },
    });

    console.log("✓ Created 3 invoices");

    console.log("");
    console.log(
      "═══════════════════════════════════════════════════════════════",
    );
    console.log("  ✅ SEEDING COMPLETE!");
    console.log("");
    console.log("  🔐 Login Credentials:");
    console.log("     Email:    admin@creditorflow.com");
    console.log("     Password: admin123");
    console.log("");
    console.log("  🌐 Open: http://localhost:3000");
    console.log(
      "═══════════════════════════════════════════════════════════════",
    );
  } catch (error) {
    console.error("❌ Seeding error:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
