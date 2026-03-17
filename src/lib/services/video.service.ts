import { prisma } from "@/lib/db";

interface SaveOrUpdateVideoParams {
    youtubeVideoId: string;
    title: string;
    thumbnailUrl?: string;
    publishedAt: Date;
    userId: string;
}

/**
 * Upsert a video — insert if new, update title/thumbnail if exists.
 */
export async function saveOrUpdateVideo(params: SaveOrUpdateVideoParams) {
    const { youtubeVideoId, title, thumbnailUrl, publishedAt, userId } = params;

    return prisma.video.upsert({
        where: { youtubeVideoId },
        update: {
            title,
            thumbnailUrl: thumbnailUrl ?? undefined,
        },
        create: {
            youtubeVideoId,
            title,
            thumbnailUrl,
            publishedAt,
            userId,
        },
    });
}

/**
 * Get all videos for a user, ordered by publishedAt descending.
 */
export async function getVideosByUserId(userId: string) {
    return prisma.video.findMany({
        where: { userId },
        orderBy: { publishedAt: "desc" },
    });
}

/**
 * Get a video by its YouTube video ID.
 */
export async function getVideoByYoutubeId(youtubeVideoId: string) {
    return prisma.video.findUnique({ where: { youtubeVideoId } });
}
