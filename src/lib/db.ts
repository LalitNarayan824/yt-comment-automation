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
    globalForPrisma.pgPool = pool;
    const adapter = new PrismaPg(pool as any);
    return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

