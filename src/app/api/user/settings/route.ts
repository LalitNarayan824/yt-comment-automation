import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.googleId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { googleId: session.googleId },
        select: { contentCategory: true, contentType: true, audienceExpectation: true },
    });

    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json(user);
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.googleId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { contentCategory, contentType, audienceExpectation } = body;

        const updated = await prisma.user.update({
            where: { googleId: session.googleId },
            data: {
                ...(contentCategory && { contentCategory }),
                ...(contentType && { contentType }),
                ...(audienceExpectation && { audienceExpectation }),
            },
            select: { contentCategory: true, contentType: true, audienceExpectation: true },
        });

        return Response.json(updated);
    } catch (error) {
        console.error("Error updating user settings:", error);
        return Response.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
