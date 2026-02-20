import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function testConnection() {
  console.log('Testing database connection...');
  
  try {
    await prisma.$connect();
    console.log('✓ Connected to database');
    
    // Test query
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✓ Query executed successfully');
    console.log('PostgreSQL version:', result);
    
    // Count tables
    const tables = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `;
    console.log('✓ Tables in database:', tables[0].count);
    
    // Test each model
    const tests = [
      { model: 'user', fn: () => prisma.user.count() },
      { model: 'organization', fn: () => prisma.organization.count() },
      { model: 'supplier', fn: () => prisma.supplier.count() },
      { model: 'invoice', fn: () => prisma.invoice.count() },
      { model: 'approval', fn: () => prisma.approval.count() },
    ];
    
    console.log('\nTesting models:');
    for (const test of tests) {
      try {
        const count = await test.fn();
        console.log(`  ✓ ${test.model}: ${count} records`);
      } catch (e: any) {
        console.log(`  ✗ ${test.model}: ${e.message}`);
      }
    }
    
    await prisma.$disconnect();
    console.log('\n✓ All tests completed');
    process.exit(0);
    
  } catch (error: any) {
    console.error('✗ Connection test failed:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();
