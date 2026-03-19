import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getUserByGoogleId } from "@/lib/services/user.service";
import { saveOrUpdateVideo, getVideosByUserId } from "@/lib/services/video.service";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken || !session?.googleId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get the DB user
        const dbUser = await getUserByGoogleId(session.googleId);
        if (!dbUser) {
            return Response.json({ error: "User not found in database" }, { status: 404 });
        }

        // Fetch videos from YouTube API
        const res = await fetch(
            "https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=10&order=date",
            {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            }
        );

        if (!res.ok) {
            const error = await res.json();
            return Response.json(
                { error: error.error?.message || "Failed to fetch videos" },
                { status: res.status }
            );
        }

        const data = await res.json();

        // Upsert each video to the database
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ytItems = data.items || [];
        for (const item of ytItems) {
            await saveOrUpdateVideo({
                youtubeVideoId: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                publishedAt: new Date(item.snippet.publishedAt),
                userId: dbUser.id,
            });
        }

        // Return videos from the database (source of truth)
        const videos = await getVideosByUserId(dbUser.id);
        return Response.json({ videos });
    } catch {
        return Response.json(
            { error: "Failed to fetch videos" },
            { status: 500 }
        );
    }
}
