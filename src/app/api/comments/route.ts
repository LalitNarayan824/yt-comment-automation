import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextRequest } from "next/server";
import { getVideoByYoutubeId } from "@/lib/services/video.service";
import { syncComments, getCommentsByVideoId, analyzeUnprocessedComments } from "@/lib/services/comment.service";

export async function GET(request: NextRequest) {
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
        // Find the video in the database by YouTube video ID
        const dbVideo = await getVideoByYoutubeId(videoId);
        if (!dbVideo) {
            return Response.json(
                { error: "Video not found in database. Please refresh your dashboard first." },
                { status: 404 }
            );
        }

        // Fetch comments from YouTube API
        const res = await fetch(
            `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance`,
            {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            }
        );

        if (!res.ok) {
            const error = await res.json();
            return Response.json(
                { error: error.error?.message || "Failed to fetch comments" },
                { status: res.status }
            );
        }

        const data = await res.json();

        // Sync comments to database
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ytComments = (data.items || []).map((item: any) => {
            const snippet = item.snippet.topLevelComment.snippet;
            return {
                youtubeCommentId: item.snippet.topLevelComment.id,
                authorName: snippet.authorDisplayName,
                authorChannelId: snippet.authorChannelId?.value,
                authorProfileImage: snippet.authorProfileImageUrl,
                text: snippet.textDisplay,
                likeCount: snippet.likeCount || 0,
                totalReplyCount: item.snippet.totalReplyCount || 0,
                publishedAt: new Date(snippet.publishedAt),
            };
        });

        await syncComments(dbVideo.id, ytComments);

        // Run analysis on unprocessed comments
        await analyzeUnprocessedComments(dbVideo.id);

        // Return comments from the database (source of truth)
        const comments = await getCommentsByVideoId(dbVideo.id);

        return Response.json({
            comments,
            totalResults: comments.length,
        });
    } catch {
        return Response.json(
            { error: "Failed to fetch comments" },
            { status: 500 }
        );
    }
}
