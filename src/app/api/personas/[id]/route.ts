import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { updatePersona, deletePersona, setDefaultPersona } from "@/lib/services/persona.service";

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.googleId) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await prisma.user.findUnique({ where: { googleId: session.googleId } });
        if (!user) return Response.json({ error: "User not found" }, { status: 404 });

        const body = await request.json();
        const p = await params;
        const id = p.id;

        if (body.action === 'set_default') {
            const persona = await setDefaultPersona(user.id, id);
            return Response.json({ persona });
        }

        const persona = await updatePersona(user.id, id, {
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

export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.googleId) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = await prisma.user.findUnique({ where: { googleId: session.googleId } });
        if (!user) return Response.json({ error: "User not found" }, { status: 404 });

        const p = await params;
        const id = p.id;

        await deletePersona(user.id, id);

        return Response.json({ success: true });
    } catch {
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
