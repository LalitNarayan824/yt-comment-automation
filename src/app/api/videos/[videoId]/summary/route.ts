import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { generateVideoSummary } from "@/lib/services/context.service";

interface Params { params: Promise<{ videoId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.googleId) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await prisma.user.findUnique({ where: { googleId: session.googleId } });
        if (!user) return Response.json({ error: "User not found" }, { status: 404 });

        const p = await params;
        const youtubeVideoId = p.videoId;

        const video = await prisma.video.findUnique({
            where: { youtubeVideoId }
        });

        if (!video || video.userId !== user.id) {
            return Response.json({ error: "Video not found" }, { status: 404 });
        }

        if (!video.description && !video.title) {
            return Response.json({ error: "Cannot generate summary without title or description." }, { status: 400 });
        }

        const updatedVideo = await generateVideoSummary(video.id, user.id, video.title, video.description, video.creatorSummary);

        return Response.json({ video: updatedVideo });
    } catch {
        return Response.json({ error: "Failed to generate summary" }, { status: 500 });
    }
}
