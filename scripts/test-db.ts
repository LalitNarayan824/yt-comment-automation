/**
 * Stage 1 — Database Connection Test
 * 
 * This script tests the connection to the Neon PostgreSQL database
 * by inserting a test user record and then reading it back.
 * 
 * Run: npx tsx scripts/test-db.ts
 */

import "dotenv/config";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
    const connectionString = process.env.DATABASE_URL!;
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set in .env");
    }

    console.log("🔌 Connecting to database...\n");

    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool as any);
    const prisma = new PrismaClient({ adapter });

    try {
        // 1. Test connection by querying tables
        const tableCheck: { table_name: string }[] = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `;
        console.log("✅ Connected! Tables found:");
        console.table(tableCheck);

        // 2. Insert a test user
        console.log("\n📝 Inserting test user...");
        const testUser = await prisma.user.upsert({
            where: { googleId: "test-google-id-12345" },
            update: {
                name: "Test User (updated)",
                email: "test@example.com",
            },
            create: {
                googleId: "test-google-id-12345",
                email: "test@example.com",
                name: "Test User",
                channelId: "UC_test_channel_123",
            },
        });
        console.log("✅ Test user created/updated:");
        console.table(testUser);

        // 3. Read it back
        console.log("\n📖 Reading test user back from database...");
        const readBack = await prisma.user.findUnique({
            where: { googleId: "test-google-id-12345" },
        });
        console.log("✅ User read successfully:");
        console.table(readBack);

        // 4. Clean up — delete the test user
        console.log("\n🧹 Cleaning up test data...");
        await prisma.user.delete({
            where: { googleId: "test-google-id-12345" },
        });
        console.log("✅ Test user deleted.");

        console.log("\n🎉 Database connection test PASSED! All operations successful.");
    } catch (e) {
        console.error("❌ Database test FAILED:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
