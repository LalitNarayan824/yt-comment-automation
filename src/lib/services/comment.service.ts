import { prisma } from "@/lib/db";

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
export async function getCommentsByVideoId(videoId: string) {
    return prisma.comment.findMany({
        where: { videoId },
        include: {
            replies: {
                orderBy: { createdAt: "desc" },
                take: 1,
            },
        },
        orderBy: { publishedAt: "desc" },
    });
}

/**
 * Get a comment by its YouTube comment ID.
 */
export async function getCommentByYoutubeId(youtubeCommentId: string) {
    return prisma.comment.findUnique({ where: { youtubeCommentId } });
}
