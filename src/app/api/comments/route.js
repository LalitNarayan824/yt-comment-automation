import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextRequest } from "next/server";

export async function GET(request) {
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

        // Extract and structure the comments
        const comments = (data.items || []).map((item) => {
            const snippet = item.snippet.topLevelComment.snippet;
            return {
                id: item.snippet.topLevelComment.id,
                author: snippet.authorDisplayName,
                authorProfileImage: snippet.authorProfileImageUrl,
                text: snippet.textDisplay,
                likeCount: snippet.likeCount,
                publishedAt: snippet.publishedAt,
                totalReplyCount: item.snippet.totalReplyCount,
            };
        });

        return Response.json({
            comments,
            nextPageToken: data.nextPageToken || null,
            totalResults: data.pageInfo?.totalResults || comments.length,
        });
    } catch (error) {
        return Response.json(
            { error: "Failed to fetch comments" },
            { status: 500 }
        );
    }
}
