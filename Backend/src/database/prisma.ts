import { PrismaClient } from "@prisma/client";

/**
 * Singleton do Prisma Client para evitar múltiplas instâncias.
 * Em serverless, reutiliza a conexão entre invocações.
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" 
    ? ["query", "error", "warn"]
    : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

/**
 * Graceful shutdown do Prisma em ambientes não-serverless.
 */
if (process.env.SERVERLESS !== "true") {
  process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
