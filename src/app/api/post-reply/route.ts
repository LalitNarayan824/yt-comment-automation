import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { parentId, replyText }: { parentId?: string; replyText?: string } = await request.json();

        if (!parentId || !replyText) {
            return Response.json(
                { error: "parentId and replyText are required" },
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
                        parentId: parentId,
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

        return Response.json({
            success: true,
            commentId: data.id,
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
