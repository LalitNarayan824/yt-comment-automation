import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextRequest } from "next/server";
import { markReplyPosted } from "@/lib/services/reply.service";

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { replyId, parentId, replyText }: { replyId?: string; parentId?: string; replyText?: string } = await request.json();

        // parentId is the YouTube Comment ID (needed for YouTube API)
        // replyId is our internal Database Reply UUID (needed for markReplyPosted)
        if (!replyId || !parentId || !replyText) {
            return Response.json(
                { error: "replyId, parentId (youtube comment id), and replyText are required" },
                { status: 400 }
            );
        }

        const res = await fetch(
            "https://www.googleapis.com/youtube/v3/comments?part=snippet",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    snippet: {
                        parentId: parentId, // Must be the YouTube Comment ID
                        textOriginal: replyText,
                    },
                }),
            }
        );

        if (!res.ok) {
            const error = await res.json();
            const message = error.error?.message || "Failed to post reply";

            // Handle common YouTube API errors
            if (res.status === 403) {
                return Response.json(
                    { error: "Permission denied — check your YouTube account permissions" },
                    { status: 403 }
                );
            }

            if (res.status === 401) {
                return Response.json(
                    { error: "Session expired — please sign out and sign in again" },
                    { status: 401 }
                );
            }

            return Response.json({ error: message }, { status: res.status });
        }

        const data = await res.json();

        // Success — now update our database state atomically
        await markReplyPosted(replyId);

        return Response.json({
            success: true,
            youtubeCommentId: data.id,
            text: data.snippet?.textDisplay,
        });
    } catch (error) {
        console.error("Post reply error:", error);
        return Response.json(
            { error: "Failed to post reply" },
            { status: 500 }
        );
    }
}
