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
export async function analyzeUnprocessedComments(videoId: string, accessToken?: string | null) {
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

                let priorityScore = getPriorityScore(aiResult.intent, aiResult.sentiment, comment.likeCount);

                // we auto reply if the sentiment is positive and intent is appreciation and comment length is less than 10 words
                // we only auto reply to 75 % of these comments
                // we only auto reply if the comment is not replied already
                let isReplied = false
                if (aiResult.sentiment === 'positive' && aiResult.intent === 'appreciation' && comment.text.split(' ').length < 13 && accessToken && Math.random() < 0.75 && !comment.replied) {
                    isReplied = await AutoReply(comment, accessToken);
                }

                await prisma.comment.update({
                    where: { id: comment.id },
                    data: {
                        intent: aiResult.intent,
                        sentiment: aiResult.sentiment,

                        isToxic: modResult.is_toxic,

                        priorityScore,
                        isAnalyzed: true,
                        analyzedAt: new Date(),
                        isSpam: modResult.is_spam,
                        moderationStatus: modResult.moderation_status,
                        isModerated: modResult.is_moderated,
                        ...(isReplied ? { replied: true } : {}),
                    },
                });
            }
        }
    } catch (error) {
        console.error(`Failed to analyze comments batch for video ${videoId}:`, error);
        // We do not set isAnalyzed=true on total failure, letting it retry later
    }
}

async function AutoReply(
    comment: { id: string; text: string; youtubeCommentId: string },

    accessToken?: string | null
): Promise<boolean> {

    const replies = [
        "❤️",
        "🙌",
        "🔥",
        "😊",
        "🙏",

        "Thanks!",
        "Appreciate it!",
        "Means a lot!",
        "Glad you liked it!",
        "So glad! 😊",

        "❤️ Thanks!",
        "🙌 Appreciate it!",
        "🔥 Means a lot!",
        "😊 Glad you enjoyed it!",
        "🙏 Thanks a lot!",

        "Really appreciate it!",
        "Happy you liked it!",

        "Thanks for the support!",

    ];
    const autoReplyText = replies[Math.floor(Math.random() * replies.length)];

    try {
        const res = await fetch("https://www.googleapis.com/youtube/v3/comments?part=snippet", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                snippet: {
                    parentId: comment.youtubeCommentId, // Must be the YouTube Comment ID
                    textOriginal: autoReplyText,
                },
            }),
        });

        if (res.ok) {
            await prisma.reply.create({
                data: {
                    commentId: comment.id,
                    generatedReply: autoReplyText,
                    posted: true,
                    postedAt: new Date(),
                }
            });
            return true;
        } else {
            console.error("Failed to auto-reply to comment:", await res.text());
            return false;
        }
    } catch (error) {
        console.error("Error auto-replying:", error);
        return false;
    }

}

const getPriorityScore = (intent: string, sentiment: string, likeCount: number): number => {
    let priorityScore = 0;

    // 1. INTENT (Primary driver)
    switch (intent) {
        case 'question':
            priorityScore += 5;
            break;
        case 'complaint':

            priorityScore += 4;
            break;
        case 'appreciation':

            priorityScore += 1;
            break;
        default:
            priorityScore += 0;
    }

    // 2. SENTIMENT (Urgency modifier)
    switch (sentiment) {
        case 'negative':
            priorityScore += 3;
            break;
        case 'positive':
            priorityScore += 1;
            break;
    }

    // 3. ENGAGEMENT (log scale to avoid dominance)
    const likes = likeCount || 0;
    priorityScore += Math.log2(likes + 1) * 2;

    // 4. BONUS: Question + Negative = VERY IMPORTANT
    if (intent === 'question' && sentiment === 'negative') {
        priorityScore += 2;
    }

    // 5. PENALTY: Appreciation (we auto-reply anyway)
    if (intent === 'appreciation') {
        priorityScore -= 2;
    }

    return priorityScore;
}