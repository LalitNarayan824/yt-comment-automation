import { prisma } from "@/lib/db";
import { computeGlobalMetrics } from "./analytics.service";
import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// ── Types ─────────────────────────────────────────

interface AIInsightOutput {
    vibeCheck: string;
    summary: string;
    keyInsights: string[];
    risks: string[];
    opportunities: string[];
    recommendations: string[];
    actionLinks: { label: string; filter: string }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MetricsData = Record<string, any>;

// ── Checkpoint ────────────────────────────────────

export async function getLastCheckpoint(userId: string) {
    return prisma.insight.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
    });
}

// ── Context Builder ───────────────────────────────

function getChannelSize(totalComments: number): string {
    if (totalComments < 100) return "small";
    if (totalComments < 1000) return "medium";
    if (totalComments < 10000) return "large";
    return "very large";
}

function getPostingFrequency(totalVideos: number): string {
    if (totalVideos <= 2) return "low";
    if (totalVideos <= 8) return "medium";
    return "high";
}

// ── Trend Calculation ─────────────────────────────

function computeTrend(current: number, previous: number, threshold = 5): string {
    const diff = current - previous;
    if (diff > threshold) return "increasing";
    if (diff < -threshold) return "decreasing";
    return "stable";
}

// ── Build LLM Input ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildLLMInput(liveMetrics: MetricsData, lastCheckpoint: any, user: any) {
    const previousInput = lastCheckpoint?.inputData as MetricsData | null;
    const daysSinceLastCheck = lastCheckpoint
        ? Math.round((Date.now() - new Date(lastCheckpoint.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    const previousReplyRate = previousInput?.engagement?.replyRate ?? 0;
    const previousPositivePercent = previousInput?.sentiment?.positivePercent ?? 0;
    const previousNegativePercent = previousInput?.sentiment?.negativePercent ?? 0;

    return {
        context: {
            channelSize: getChannelSize(liveMetrics.totalComments),
            contentCategory: user.contentCategory,
            contentType: user.contentType,
            postingFrequency: getPostingFrequency(liveMetrics.totalVideos),
            audienceExpectation: user.audienceExpectation,
        },
        engagement: {
            totalComments: liveMetrics.totalComments,
            replyRate: liveMetrics.replyRate,
            pendingReplies: liveMetrics.pendingReplies,
            avgLikesPerComment: liveMetrics.avgLikesPerComment,
            daysSinceLastCheck,
            previousReplyRate,
            replyRateTrend: computeTrend(liveMetrics.replyRate, previousReplyRate),
        },
        questions: liveMetrics.questions,
        sentiment: {
            positivePercent: liveMetrics.sentiment.positivePercent,
            negativePercent: liveMetrics.sentiment.negativePercent,
            neutralPercent: liveMetrics.sentiment.neutralPercent,
            sentimentTrend: computeTrend(
                liveMetrics.sentiment.negativePercent,
                previousNegativePercent
            ) === "increasing"
                ? "negative increasing"
                : computeTrend(liveMetrics.sentiment.positivePercent, previousPositivePercent) === "increasing"
                    ? "positive increasing"
                    : "stable",
        },
        intent: {
            questionsPercent: liveMetrics.intent.questionsPercent,
            appreciationPercent: liveMetrics.intent.appreciationPercent,
            criticismPercent: liveMetrics.intent.criticismPercent,
        },
        moderation: {
            allowed: liveMetrics.moderation.allowed,
            blocked: liveMetrics.moderation.blocked,
            toxicCount: liveMetrics.moderation.toxicCount,
            spamCount: liveMetrics.moderation.spamCount,
        },
        priority: liveMetrics.priority,
        healthScore: liveMetrics.healthScore,
    };
}

// ── LLM Prompt ────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI analytics assistant for a YouTube creator.

You analyze structured community engagement data and provide sharp, actionable insights.

Your job is to:
1. Evaluate engagement health
2. Identify missed opportunities (especially unanswered questions)
3. Detect sentiment risks or negative trends
4. Assess community quality (spam/toxicity)
5. Highlight growth signals

Use the provided context (channel size, content type, audience expectations) to interpret whether metrics are good or bad.

Guidelines:
- Be specific and data-driven (use numbers from input)
- Avoid generic statements
- Do not repeat the input
- Keep insights concise but meaningful
- Focus on what actually matters for improving engagement

Important:
- Prioritize insights about unanswered questions and negative sentiment
- If something is improving, highlight it briefly
- If something is risky, explain why it matters

You MUST respond with valid JSON matching this exact structure:
{
  "vibeCheck": "one of: 🔥 Excellent, 🟢 Good, ⚠️ Needs Attention, 🚨 Critical",
  "summary": "2-3 line overview string",
  "keyInsights": ["insight1", "insight2", ...],
  "risks": ["risk1", "risk2", ...],
  "opportunities": ["opp1", "opp2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "actionLinks": [{"label": "button text", "filter": "filter:value"}, ...]
}

For actionLinks, suggest UI filters like:
- "intent:question" for unanswered questions
- "sentiment:negative" for negative comments
- "priority:high" for high priority comments
- "moderation:flagged" for flagged comments`;

// ── Call Groq ─────────────────────────────────────

async function callGroqLLM(input: MetricsData): Promise<AIInsightOutput> {
    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
                role: "user",
                content: `Analyze the following channel data and return insights as JSON.\n\nData:\n${JSON.stringify(input, null, 2)}`,
            },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content || "{}";

    try {
        const parsed = JSON.parse(text) as AIInsightOutput;
        return {
            vibeCheck: parsed.vibeCheck || "🟢 Good",
            summary: parsed.summary || "No summary available.",
            keyInsights: parsed.keyInsights || [],
            risks: parsed.risks || [],
            opportunities: parsed.opportunities || [],
            recommendations: parsed.recommendations || [],
            actionLinks: parsed.actionLinks || [],
        };
    } catch {
        return {
            vibeCheck: "⚠️ Needs Attention",
            summary: "Failed to parse AI response. Please try again.",
            keyInsights: [],
            risks: [],
            opportunities: [],
            recommendations: [],
            actionLinks: [],
        };
    }
}

// ── Main Orchestrator ─────────────────────────────

export async function generateInsight(userId: string) {
    // 1. Get user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    // 2. Compute live metrics
    const liveMetrics = await computeGlobalMetrics(userId);

    // 3. Get last checkpoint — seed baseline if none exists
    let lastCheckpoint = await getLastCheckpoint(userId);

    if (!lastCheckpoint) {
        // Seed a zero-baseline checkpoint as the starting point
        lastCheckpoint = await prisma.insight.create({
            data: {
                userId,
                inputData: {
                    context: {},
                    engagement: { totalComments: 0, replyRate: 0, pendingReplies: 0, avgLikesPerComment: 0, daysSinceLastCheck: 0, previousReplyRate: 0 },
                    questions: { total: 0, responseRate: 0 },
                    sentiment: { positivePercent: 0, negativePercent: 0, neutralPercent: 0 },
                    intent: { questionsPercent: 0, appreciationPercent: 0, criticismPercent: 0 },
                    moderation: { allowed: 0, blocked: 0, toxicCount: 0, spamCount: 0 },
                    priority: { avgScore: 0, highPriorityTotal: 0, highPriorityResponseRate: 0 },
                    healthScore: 0,
                },
                outputData: {
                    vibeCheck: "🟢 Good",
                    summary: "Baseline checkpoint — no analysis yet.",
                    keyInsights: [], risks: [], opportunities: [], recommendations: [], actionLinks: [],
                },
            },
        });
    }

    // 4. Build LLM input
    const llmInput = buildLLMInput(liveMetrics, lastCheckpoint, user);

    // 5. Call LLM
    const aiOutput = await callGroqLLM(llmInput);

    // 6. Save new checkpoint
    const insight = await prisma.insight.create({
        data: {
            userId,
            inputData: llmInput as object,
            outputData: aiOutput as object,
        },
    });

    return {
        metrics: liveMetrics,
        aiInsights: aiOutput,
        lastUpdated: insight.createdAt,
    };
}
