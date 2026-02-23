import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  try {
    await prisma.$connect()
    console.log('PRISMA QUICK CONNECT: OK')
    const res = await prisma.$queryRaw`SELECT 1 as test`
    console.log('PRISMA QUICK TEST RESULT:', res)
  } catch (e) {
    console.error('PRISMA QUICK ERROR:', e)
  } finally {
    await prisma.$disconnect()
  }
}

test()
