import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

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

    // Filters
    const videoId = searchParams.get("videoId"); // internal DB video id
    const sentiment = searchParams.get("sentiment");
    const intent = searchParams.get("intent");
    const isSpam = searchParams.get("isSpam");
    const isToxic = searchParams.get("isToxic");
    const replied = searchParams.get("replied");
    const query = searchParams.get("q"); // text search
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 50);

    try {
        // Get all video IDs for this user
        const userVideos = await prisma.video.findMany({
            where: { userId: user.id },
            select: { id: true },
        });
        const userVideoIds = userVideos.map(v => v.id);

        // Build filter
        const where: Prisma.CommentWhereInput = {
            videoId: videoId ? videoId : { in: userVideoIds },
        };

        if (sentiment) where.sentiment = sentiment;
        if (intent) where.intent = intent;
        if (isSpam === "true") where.isSpam = true;
        if (isSpam === "false") where.isSpam = false;
        if (isToxic === "true") where.isToxic = true;
        if (isToxic === "false") where.isToxic = false;
        if (replied === "true") where.replied = true;
        if (replied === "false") where.replied = false;
        if (query) where.text = { contains: query, mode: "insensitive" };

        const comments = await prisma.comment.findMany({
            where,
            include: {
                video: { select: { title: true, youtubeVideoId: true } },
                replies: { select: { generatedReply: true, posted: true, postedAt: true }, take: 1, orderBy: { createdAt: "desc" } },
            },
            orderBy: { publishedAt: "desc" },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = comments.length > limit;
        const results = hasMore ? comments.slice(0, limit) : comments;
        const nextCursor = hasMore ? results[results.length - 1].id : null;

        // Also return the user's videos for the filter dropdown
        const videos = await prisma.video.findMany({
            where: { userId: user.id },
            select: { id: true, title: true, youtubeVideoId: true },
            orderBy: { publishedAt: "desc" },
        });

        return Response.json({
            comments: results,
            nextCursor,
            total: await prisma.comment.count({ where }),
            videos,
        });
    } catch (error) {
        console.error("Error in search API:", error);
        return Response.json({ error: "Failed to search comments" }, { status: 500 });
    }
}
