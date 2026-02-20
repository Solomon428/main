import { PrismaClient, Prisma } from "@prisma/client";

// Re-export Prisma namespace for consumers
export { Prisma };

// Export PrismaClient type for consumers
export type { PrismaClient };

// Health check result type
export interface DatabaseHealth {
  status: "healthy" | "unhealthy";
  responseTime: number;
  timestamp: string;
  error?: string;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Export a function to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error(
      "Database connection failed:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

// Export a function to disconnect from database
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error(
      "Error disconnecting from database:",
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
}

// Health check function for monitoring
export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: "healthy",
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "unhealthy",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}
