import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    pgPool: pg.Pool | undefined;
};

function createPrismaClient(): PrismaClient {
    const pool = globalForPrisma.pgPool ?? new pg.Pool({ connectionString });
    if (process.env.NODE_ENV !== "production") {
        globalForPrisma.pgPool = pool;
    }
    const adapter = new PrismaPg(pool as any);
    return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
