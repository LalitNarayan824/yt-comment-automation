import { prisma } from "@/lib/db";

/**
 * Compute all global KPIs across all videos for a user.
 */
export async function computeGlobalMetrics(userId: string) {
    // Get all video IDs for this user
    const userVideos = await prisma.video.findMany({
        where: { userId },
        select: { id: true, title: true, youtubeVideoId: true },
    });

    const videoIds = userVideos.map(v => v.id);
    const totalVideos = userVideos.length;

    if (totalVideos === 0) {
        return getEmptyMetrics();
    }

    // ── KPIs ──────────────────────────────────────
    const totalComments = await prisma.comment.count({
        where: { videoId: { in: videoIds } },
    });

    const totalRepliesGenerated = await prisma.reply.count({
        where: { comment: { videoId: { in: videoIds } } },
    });

    const totalRepliesPosted = await prisma.reply.count({
        where: { comment: { videoId: { in: videoIds } }, posted: true },
    });

    const pendingReplies = totalComments > 0
        ? await prisma.comment.count({ where: { videoId: { in: videoIds }, replied: false } })
        : 0;

    const replyRate = totalComments > 0 ? (totalRepliesPosted / totalComments) * 100 : 0;

    // ── Average Response Time ─────────────────────
    const postedReplies = await prisma.reply.findMany({
        where: { comment: { videoId: { in: videoIds } }, posted: true },
        select: { postedAt: true, comment: { select: { publishedAt: true } } },
    });

    let avgResponseTimeHours = 0;
    if (postedReplies.length > 0) {
        const totalMs = postedReplies.reduce((acc, r) => {
            if (r.postedAt && r.comment.publishedAt) {
                return acc + (r.postedAt.getTime() - r.comment.publishedAt.getTime());
            }
            return acc;
        }, 0);
        avgResponseTimeHours = totalMs / postedReplies.length / (1000 * 60 * 60);
    }

    // ── Sentiment Distribution ────────────────────
    const sentimentRaw = await prisma.comment.groupBy({
        by: ["sentiment"],
        where: { videoId: { in: videoIds }, isAnalyzed: true },
        _count: true,
    });

    const analyzedCount = sentimentRaw.reduce((acc, s) => acc + s._count, 0);
    const sentimentMap: Record<string, number> = {};
    sentimentRaw.forEach(s => {
        const key = s.sentiment || "unknown";
        sentimentMap[key] = s._count;
    });

    const positivePercent = analyzedCount > 0 ? ((sentimentMap["positive"] || 0) / analyzedCount) * 100 : 0;
    const negativePercent = analyzedCount > 0 ? ((sentimentMap["negative"] || 0) / analyzedCount) * 100 : 0;
    const neutralPercent = analyzedCount > 0 ? ((sentimentMap["neutral"] || 0) / analyzedCount) * 100 : 0;

    // ── Intent Distribution ───────────────────────
    const intentRaw = await prisma.comment.groupBy({
        by: ["intent"],
        where: { videoId: { in: videoIds }, isAnalyzed: true },
        _count: true,
    });

    const intentMap: Record<string, number> = {};
    intentRaw.forEach(i => {
        const key = i.intent || "unknown";
        intentMap[key] = i._count;
    });

    const questionsPercent = analyzedCount > 0 ? ((intentMap["question"] || 0) / analyzedCount) * 100 : 0;
    const appreciationPercent = analyzedCount > 0 ? ((intentMap["appreciation"] || 0) / analyzedCount) * 100 : 0;
    const criticismPercent = analyzedCount > 0 ? ((intentMap["criticism"] || 0) / analyzedCount) * 100 : 0;

    // ── Moderation ────────────────────────────────
    const moderationRaw = await prisma.comment.groupBy({
        by: ["moderationStatus"],
        where: { videoId: { in: videoIds } },
        _count: true,
    });

    const moderationMap: Record<string, number> = {};
    moderationRaw.forEach(m => {
        moderationMap[m.moderationStatus] = m._count;
    });

    const toxicCount = await prisma.comment.count({
        where: { videoId: { in: videoIds }, isToxic: true },
    });

    const spamCount = await prisma.comment.count({
        where: { videoId: { in: videoIds }, isSpam: true },
    });

    // ── Priority ──────────────────────────────────
    const priorityAgg = await prisma.comment.aggregate({
        where: { videoId: { in: videoIds }, isAnalyzed: true },
        _avg: { priorityScore: true },
    });

    const highPriorityTotal = await prisma.comment.count({
        where: { videoId: { in: videoIds }, priorityScore: { gte: 70 } },
    });

    const highPriorityReplied = await prisma.comment.count({
        where: { videoId: { in: videoIds }, priorityScore: { gte: 70 }, replied: true },
    });

    const highPriorityResponseRate = highPriorityTotal > 0
        ? (highPriorityReplied / highPriorityTotal) * 100
        : 0;

    // ── Questions ─────────────────────────────────
    const totalQuestions = await prisma.comment.count({
        where: { videoId: { in: videoIds }, intent: "question" },
    });

    const answeredQuestions = await prisma.comment.count({
        where: { videoId: { in: videoIds }, intent: "question", replied: true },
    });

    const questionResponseRate = totalQuestions > 0
        ? (answeredQuestions / totalQuestions) * 100
        : 0;

    // ── Average Likes ─────────────────────────────
    const likesAgg = await prisma.comment.aggregate({
        where: { videoId: { in: videoIds } },
        _avg: { likeCount: true },
    });

    // ── Top Videos ────────────────────────────────
    const topVideos = await Promise.all(
        userVideos.map(async (v) => {
            const commentCount = await prisma.comment.count({ where: { videoId: v.id } });
            const repliedCount = await prisma.reply.count({
                where: { comment: { videoId: v.id }, posted: true },
            });
            const videoReplyRate = commentCount > 0 ? (repliedCount / commentCount) * 100 : 0;

            return {
                videoId: v.youtubeVideoId,
                title: v.title,
                commentCount,
                replyRate: Math.round(videoReplyRate * 10) / 10,
            };
        })
    );

    topVideos.sort((a, b) => b.commentCount - a.commentCount);

    // ── Activity Trends ───────────────────────────
    const allComments = await prisma.comment.findMany({
        where: { videoId: { in: videoIds } },
        select: { publishedAt: true, replies: { select: { postedAt: true, posted: true } } },
        orderBy: { publishedAt: "asc" },
    });

    const activityMap: Record<string, { comments: number; replies: number }> = {};
    allComments.forEach(c => {
        const dateKey = c.publishedAt.toISOString().split("T")[0];
        if (!activityMap[dateKey]) activityMap[dateKey] = { comments: 0, replies: 0 };
        activityMap[dateKey].comments++;

        c.replies.forEach(r => {
            if (r.posted && r.postedAt) {
                const rKey = r.postedAt.toISOString().split("T")[0];
                if (!activityMap[rKey]) activityMap[rKey] = { comments: 0, replies: 0 };
                activityMap[rKey].replies++;
            }
        });
    });

    const activity = Object.keys(activityMap)
        .map(date => ({ date, ...activityMap[date] }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // ── Channel Health Score ──────────────────────
    // Composite: 40% reply rate + 30% positive sentiment + 30% moderation health
    const modHealthPercent = totalComments > 0
        ? ((totalComments - toxicCount - spamCount) / totalComments) * 100
        : 100;
    const healthScore = Math.round(
        replyRate * 0.4 + positivePercent * 0.3 + modHealthPercent * 0.3
    );

    return {
        totalVideos,
        totalComments,
        totalRepliesGenerated,
        totalRepliesPosted,
        pendingReplies,
        replyRate: Math.round(replyRate * 10) / 10,
        avgResponseTimeHours: Math.round(avgResponseTimeHours * 10) / 10,
        avgLikesPerComment: Math.round((likesAgg._avg.likeCount || 0) * 10) / 10,
        sentiment: {
            positivePercent: Math.round(positivePercent * 10) / 10,
            negativePercent: Math.round(negativePercent * 10) / 10,
            neutralPercent: Math.round(neutralPercent * 10) / 10,
            distribution: sentimentRaw.map(s => ({ name: s.sentiment || "unknown", value: s._count })),
        },
        intent: {
            questionsPercent: Math.round(questionsPercent * 10) / 10,
            appreciationPercent: Math.round(appreciationPercent * 10) / 10,
            criticismPercent: Math.round(criticismPercent * 10) / 10,
            distribution: intentRaw.map(i => ({ name: i.intent || "unknown", value: i._count })),
        },
        questions: {
            total: totalQuestions,
            responseRate: Math.round(questionResponseRate * 10) / 10,
        },
        moderation: {
            allowed: moderationMap["approved"] || 0,
            blocked: (moderationMap["blocked"] || 0) + (moderationMap["flagged"] || 0),
            toxicCount,
            spamCount,
            distribution: moderationRaw.map(m => ({ name: m.moderationStatus, value: m._count })),
        },
        priority: {
            avgScore: Math.round(priorityAgg._avg.priorityScore || 0),
            highPriorityTotal,
            highPriorityResponseRate: Math.round(highPriorityResponseRate * 10) / 10,
        },
        topVideos: topVideos.slice(0, 5),
        activity,
        healthScore,
    };
}

function getEmptyMetrics() {
    return {
        totalVideos: 0,
        totalComments: 0,
        totalRepliesGenerated: 0,
        totalRepliesPosted: 0,
        pendingReplies: 0,
        replyRate: 0,
        avgResponseTimeHours: 0,
        avgLikesPerComment: 0,
        sentiment: {
            positivePercent: 0, negativePercent: 0, neutralPercent: 0,
            distribution: [],
        },
        intent: {
            questionsPercent: 0, appreciationPercent: 0, criticismPercent: 0,
            distribution: [],
        },
        questions: { total: 0, responseRate: 0 },
        moderation: {
            allowed: 0, blocked: 0, toxicCount: 0, spamCount: 0,
            distribution: [],
        },
        priority: { avgScore: 0, highPriorityTotal: 0, highPriorityResponseRate: 0 },
        topVideos: [],
        activity: [],
        healthScore: 0,
    };
}
