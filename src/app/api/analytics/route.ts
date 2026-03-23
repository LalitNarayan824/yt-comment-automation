import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const youtubeVideoId = searchParams.get("videoId");

    if (!youtubeVideoId) {
      return NextResponse.json(
        { error: "videoId query parameter is required" },
        { status: 400 }
      );
    }

    const video = await prisma.video.findUnique({
      where: { youtubeVideoId }
    });

    if (!video) {
      return NextResponse.json(
        { error: "Video not found in database" },
        { status: 404 }
      );
    }

    const videoId = video.id;

    // 1. Overview KPIs
    const totalComments = await prisma.comment.count({ where: { videoId } });
    const totalRepliesPosted = await prisma.reply.count({
      where: { comment: { videoId }, posted: true },
    });
    const pendingReplies = await prisma.comment.count({
      where: { videoId, replied: false },
    });

    const replyRate = totalComments > 0 ? (totalRepliesPosted / totalComments) * 100 : 0;

    // Avg Response Time
    const responses = await prisma.reply.findMany({
      where: { comment: { videoId }, posted: true },
      include: { comment: true },
    });

    let avgResponseTimeMs = 0;
    if (responses.length > 0) {
      const totalResponseTime = responses.reduce((acc, r) => {
        if (r.postedAt && r.comment.publishedAt) {
          return acc + (r.postedAt.getTime() - r.comment.publishedAt.getTime());
        }
        return acc;
      }, 0);
      avgResponseTimeMs = totalResponseTime / responses.length;
    }

    // Average response time in hours (or whatever unit makes sense)
    const avgResponseTimeHours = avgResponseTimeMs / (1000 * 60 * 60);

    // 2. Audience Insights

    // Sentiment Distribution (using groupBy)
    const sentimentStatsRaw = await prisma.comment.groupBy({
      by: ["sentiment"],
      where: { videoId },
      _count: true,
    });

    const sentiment = sentimentStatsRaw.map(s => ({
      name: s.sentiment || "Unknown",
      value: s._count,
    }));

    // Intent Breakdown
    const intentStatsRaw = await prisma.comment.groupBy({
      by: ["intent"],
      where: { videoId },
      _count: true,
    });

    const intent = intentStatsRaw.map(i => ({
      name: i.intent || "Unknown",
      value: i._count,
    }));

    // 3. Moderation & Risk
    const moderationStatsRaw = await prisma.comment.groupBy({
      by: ["moderationStatus"],
      where: { videoId },
      _count: true,
    });

    const moderation = moderationStatsRaw.map(m => ({
      name: m.moderationStatus || "Unknown",
      value: m._count,
    }));

    // 4. Activity Trends
    // Prisma group-by by date requires specific timezone handling or raw queries
    // Doing a raw grouping by day using JS (if data isn't huge, which it might be, but it's MVP). 
    // For a real production app, we'd use raw SQL for date grouping.
    const allComments = await prisma.comment.findMany({
      where: { videoId },
      select: { createdAt: true, replied: true, replies: { select: { postedAt: true, posted: true } } },
      orderBy: { createdAt: 'asc' }
    });

    const activityMap: Record<string, { comments: number, replies: number }> = {};

    allComments.forEach(c => {
      const dateKey = c.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
      if (!activityMap[dateKey]) {
        activityMap[dateKey] = { comments: 0, replies: 0 };
      }
      activityMap[dateKey].comments++;

      c.replies.forEach(r => {
        if (r.posted && r.postedAt) {
          const replyDateKey = r.postedAt.toISOString().split("T")[0];
          if (!activityMap[replyDateKey]) {
            activityMap[replyDateKey] = { comments: 0, replies: 0 };
          }
          activityMap[replyDateKey].replies++;
        }
      });
    });

    const activity = Object.keys(activityMap).map(date => ({
      date,
      comments: activityMap[date].comments,
      replies: activityMap[date].replies,
    })).sort((a, b) => a.date.localeCompare(b.date));

    // 5. Actionable Insights
    const unansweredQuestionsCount = await prisma.comment.count({
      where: { videoId, intent: "question", replied: false }
    });

    const highPriorityPendingCount = await prisma.comment.count({
      where: { videoId, priorityScore: { gt: 70 }, replied: false }
    });

    const ignoredNegativeCount = await prisma.comment.count({
      where: { videoId, sentiment: "negative", replied: false }
    });


    return NextResponse.json({
      overview: {
        totalComments,
        totalRepliesPosted,
        pendingReplies,
        replyRate,
        avgResponseTimeHours,
      },
      sentiment,
      intent,
      moderation,
      activity,
      insights: {
        unansweredQuestions: unansweredQuestionsCount,
        highPriorityPending: highPriorityPendingCount,
        ignoredNegative: ignoredNegativeCount
      }
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
