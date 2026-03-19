import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { updateVideoContext } from "@/lib/services/context.service";

interface Params { params: Promise<{ videoId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
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

        return Response.json({ video });
    } catch {
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.googleId) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await prisma.user.findUnique({ where: { googleId: session.googleId } });
        if (!user) return Response.json({ error: "User not found" }, { status: 404 });

        const p = await params;
        const youtubeVideoId = p.videoId;
        const body = await request.json();

        const video = await prisma.video.findUnique({
            where: { youtubeVideoId }
        });

        if (!video || video.userId !== user.id) {
            return Response.json({ error: "Video not found" }, { status: 404 });
        }

        const updatedVideo = await updateVideoContext(video.id, user.id, {
            creatorContext: body.creatorContext !== undefined ? body.creatorContext : video.creatorContext,
            creatorSummary: body.creatorSummary !== undefined ? body.creatorSummary : video.creatorSummary
        });

        return Response.json({ video: updatedVideo });
    } catch {
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
