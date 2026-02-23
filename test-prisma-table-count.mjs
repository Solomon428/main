import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$connect()
    console.log('DB connected for table count')
    const res = await prisma.$queryRaw`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    const count = Number(res[0]?.count ?? 0)
    console.log('Public base table count:', count)
  } catch (e) {
    console.error('ERR:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
