import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextRequest } from "next/server";
import { getVideoByYoutubeId } from "@/lib/services/video.service";
import { getCommentsByVideoId } from "@/lib/services/comment.service";

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!videoId) {
        return Response.json({ error: "videoId is required" }, { status: 400 });
    }

    try {
        // Find the video in the database by YouTube video ID
        const dbVideo = await getVideoByYoutubeId(videoId);
        if (!dbVideo) {
            return Response.json(
                { error: "Video not found in database. Please refresh your dashboard first." },
                { status: 404 }
            );
        }

        // Return comments from the database (source of truth)
        const sort = request.nextUrl.searchParams.get('sort') === 'priority' ? 'priority' : 'recent';
        const commentsRaw = await getCommentsByVideoId(dbVideo.id, sort, cursor, limit);

        let nextCursor = null;
        if (commentsRaw.length > limit) {
            const lastItem = commentsRaw.pop();
            nextCursor = lastItem!.id;
        }

        return Response.json({
            comments: commentsRaw,
            nextCursor,
            totalResults: commentsRaw.length,
        });
    } catch {
        return Response.json(
            { error: "Failed to fetch comments" },
            { status: 500 }
        );
    }
}
