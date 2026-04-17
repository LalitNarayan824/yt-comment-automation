import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { NextRequest } from "next/server";
import { getVideoByYoutubeId } from "@/lib/services/video.service";
import { syncNewCommentsFromYouTube, analyzeUnprocessedComments } from "@/lib/services/comment.service";

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
        return Response.json({ error: "videoId is required" }, { status: 400 });
    }

    try {
        const dbVideo = await getVideoByYoutubeId(videoId);
        if (!dbVideo) {
            return Response.json(
                { error: "Video not found in database. Please refresh your dashboard first." },
                { status: 404 }
            );
        }

        // 1. Incrementally sync only new comments from YouTube
        const newCount = await syncNewCommentsFromYouTube(dbVideo.id, videoId, session.accessToken);

        // 2. Run AI analysis on all unprocessed comments (including newly synced ones)
        await analyzeUnprocessedComments(dbVideo.id, session.accessToken);

        return Response.json({
            success: true,
            newCount,
        });
    } catch (error) {
        console.error("Sync error:", error);
        return Response.json(
            { error: "Failed to sync comments from YouTube" },
            { status: 500 }
        );
    }
}
