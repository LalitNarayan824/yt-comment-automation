import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const res = await fetch(
            "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
            {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            }
        );

        if (!res.ok) {
            const error = await res.json();
            return Response.json(
                { error: error.error?.message || "Failed to fetch channel info" },
                { status: res.status }
            );
        }

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: "Failed to fetch channel info" },
            { status: 500 }
        );
    }
}
