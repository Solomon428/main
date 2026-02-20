const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  // First ensure org exists
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        id: 'default-org',
        name: 'CreditorFlow',
        slug: 'creditorflow',
        maxUsers: 10,
      }
    });
  }

  // Create admin user
  const user = await prisma.user.upsert({
    where: { email: 'admin@creditorflow.com' },
    update: {
      passwordHash: hashedPassword,
    },
    create: {
      email: 'admin@creditorflow.com',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      organizationId: org.id,
      isActive: true,
    }
  });

  console.log('✅ User created/updated:', user.email);
  console.log('   Password: password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
