import { prisma } from "@/lib/db";

/**
 * Save a generated reply for a comment.
 * Does NOT mark the comment as replied — that happens on post.
 */
export async function saveReply(commentId: string, generatedReply: string) {
    return prisma.reply.create({
        data: {
            commentId,
            generatedReply,
        },
    });
}

/**
 * Mark a reply as posted and update the parent comment's replied status.
 * Uses a transaction to ensure atomicity.
 */
export async function markReplyPosted(replyId: string) {
    return prisma.$transaction(async (tx) => {
        const reply = await tx.reply.update({
            where: { id: replyId },
            data: {
                posted: true,
                postedAt: new Date(),
            },
        });

        await tx.comment.update({
            where: { id: reply.commentId },
            data: { replied: true },
        });

        return reply;
    });
}

/**
 * Get the latest reply for a comment.
 */
export async function getLatestReplyForComment(commentId: string) {
    return prisma.reply.findFirst({
        where: { commentId },
        orderBy: { createdAt: "desc" },
    });
}
