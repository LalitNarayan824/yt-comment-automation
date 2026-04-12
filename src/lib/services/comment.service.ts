import { prisma } from "@/lib/db";
import { moderateComment } from "./moderation.service";

interface YouTubeComment {
    youtubeCommentId: string;
    authorName: string;
    authorChannelId?: string;
    authorProfileImage?: string;
    text: string;
    likeCount: number;
    totalReplyCount: number;
    publishedAt: Date;
}

/**
 * Sync comments from YouTube to the database.
 * Uses upsert to prevent duplicates and update like_count/text.
 */
export async function syncComments(videoId: string, comments: YouTubeComment[]) {
    const results = await Promise.all(
        comments.map((comment) =>
            prisma.comment.upsert({
                where: { youtubeCommentId: comment.youtubeCommentId },
                update: {
                    likeCount: comment.likeCount,
                    totalReplyCount: comment.totalReplyCount,
                    text: comment.text,
                },
                create: {
                    youtubeCommentId: comment.youtubeCommentId,
                    videoId,
                    authorName: comment.authorName,
                    authorChannelId: comment.authorChannelId,
                    authorProfileImage: comment.authorProfileImage,
                    text: comment.text,
                    likeCount: comment.likeCount,
                    totalReplyCount: comment.totalReplyCount,
                    publishedAt: comment.publishedAt,
                },
            })
        )
    );

    return results;
}

/**
 * Get all comments for a video from the database, with their latest reply.
 */
export async function getCommentsByVideoId(videoId: string, sort: 'recent' | 'priority' = 'recent', cursor?: string | null, limit: number = 20) {
    return prisma.comment.findMany({
        where: { videoId },
        include: {
            replies: {
                orderBy: { createdAt: "desc" },
                take: 1,
            },
        },
        orderBy: sort === 'priority'
            ? [{ priorityScore: 'desc' }, { publishedAt: 'desc' }, { id: 'asc' }]
            : [{ publishedAt: "desc" }, { id: 'asc' }],
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
    });
}

/**
 * Get a comment by its YouTube comment ID.
 */
export async function getCommentByYoutubeId(youtubeCommentId: string) {
    return prisma.comment.findUnique({ where: { youtubeCommentId } });
}

/**
 * Process unanalyzed comments for a specific video using ML service in batches
 */
export async function analyzeUnprocessedComments(videoId: string) {
    const unanalyzedComments = await prisma.comment.findMany({
        where: {
            videoId,
            isAnalyzed: false,
        },
    });

    if (unanalyzedComments.length === 0) return;

    const mlServiceUrl = process.env.ML_SERVICE_URL;
    const mlServiceKey = process.env.ML_SERVICE_KEY;

    if (!mlServiceUrl || !mlServiceKey) {
        console.error("ML service configuration is missing");
        return;
    }

    try {
        const BATCH_SIZE = 15;
        for (let batchStart = 0; batchStart < unanalyzedComments.length; batchStart += BATCH_SIZE) {
            const batch = unanalyzedComments.slice(batchStart, batchStart + BATCH_SIZE);
            const payload = batch.map(c => ({ text: c.text }));

            const response = await fetch(`${mlServiceUrl}/analyze-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mlServiceKey}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                console.error(`ML Service responded with status: ${response.status} for batch starting at ${batchStart}`);
                continue;
            }

            const batchResults = await response.json();

            for (let i = 0; i < batch.length; i++) {
                const comment = batch[i];
                const aiResult = batchResults[i];

                if (!aiResult) continue;

                const modResult = moderateComment(aiResult.toxicity, aiResult.is_spam);

                let priorityScore = (comment.likeCount || 0) * 2;
                if (aiResult.intent === 'question') priorityScore += 3;
                else if (aiResult.intent === 'criticism') priorityScore += 2;
                else if (aiResult.intent === 'praise' || aiResult.intent === 'appreciation') priorityScore += 1;

                if (aiResult.sentiment === 'negative') priorityScore += 2;
                else if (aiResult.sentiment === 'positive') priorityScore += 1;

                await prisma.comment.update({
                    where: { id: comment.id },
                    data: {
                        intent: aiResult.intent,
                        sentiment: aiResult.sentiment,
                        toxicityScore: aiResult.toxicity,
                        priorityScore,
                        isAnalyzed: true,
                        analyzedAt: new Date(),
                        isSpam: modResult.is_spam,
                        moderationStatus: modResult.moderation_status,
                        isModerated: modResult.is_moderated,
                    },
                });
            }
        }
    } catch (error) {
        console.error(`Failed to analyze comments batch for video ${videoId}:`, error);
        // We do not set isAnalyzed=true on total failure, letting it retry later
    }
}

