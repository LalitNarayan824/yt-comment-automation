import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { generateInsight } from "@/lib/services/insights.service";
import { computeGlobalMetrics } from "@/lib/services/analytics.service";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.googleId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { googleId: session.googleId } });
    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const generate = searchParams.get("generate");

    try {
        if (generate === "true") {
            // Full flow: compute metrics + call LLM + save checkpoint
            const result = await generateInsight(user.id);
            return Response.json(result);
        }

        // Default: return metrics + last saved insight (no LLM call)
        const metrics = await computeGlobalMetrics(user.id);

        const lastInsight = await prisma.insight.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });

        return Response.json({
            metrics,
            aiInsights: lastInsight?.outputData || null,
            lastUpdated: lastInsight?.createdAt || null,
        });
    } catch (error) {
        console.error("Error in insights API:", error);
        return Response.json(
            { error: "Failed to generate insights" },
            { status: 500 }
        );
    }
}
