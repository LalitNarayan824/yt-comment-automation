import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { getPersonas, createPersona } from "@/lib/services/persona.service";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.googleId) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await prisma.user.findUnique({ where: { googleId: session.googleId } });
        if (!user) return Response.json({ error: "User not found" }, { status: 404 });

        const personas = await getPersonas(user.id);
        return Response.json({ personas });
    } catch {
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.googleId) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await prisma.user.findUnique({ where: { googleId: session.googleId } });
        if (!user) return Response.json({ error: "User not found" }, { status: 404 });

        const body = await request.json();
        if (!body.name) return Response.json({ error: "Name is required" }, { status: 400 });

        const persona = await createPersona(user.id, {
            name: body.name,
            tone: body.tone,
            emojiStyle: body.emojiStyle,
            vocabularyRules: body.vocabularyRules,
            catchphrases: body.catchphrases,
            forbiddenWords: body.forbiddenWords,
            isDefault: body.isDefault
        });

        return Response.json({ persona });
    } catch {
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
