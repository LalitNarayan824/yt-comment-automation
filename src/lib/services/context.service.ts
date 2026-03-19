import { prisma } from "@/lib/db";
import Groq from "groq-sdk";

export interface UpdateContextInput {
    creatorContext?: string;
    creatorSummary?: string;
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Updates a video's creator context
 */
export async function updateVideoContext(videoId: string, userId: string, data: UpdateContextInput) {
    return prisma.video.update({
        where: { id: videoId, userId },
        data: {
            creatorContext: data.creatorContext,
            creatorSummary: data.creatorSummary,
            contextUpdatedAt: new Date()
        },
    });
}

/**
 * Gets a video's context details for prompt injection
 */
export async function getVideoContext(videoId: string) {
    return prisma.video.findUnique({
        where: { id: videoId }
    });
}

/**
 * Generates an AI summary for a video based on its title, description and creator's summary
 */
export async function generateVideoSummary(
    videoId: string,
    userId: string,
    title: string,
    description: string | null,
    creatorSummary: string | null
) {
    if (!description && !title) throw new Error("Need title or description to summarize");

    const prompt = `
Summarize this YouTube video in 3-5 lines:

Title: ${title}
Description: ${description ? description.slice(0, 1500) : "No description available."}
${creatorSummary ? `Creator's Summary/Notes: ${creatorSummary}\nPlease thoroughly weave the creator's summary/notes into your final 3-5 line summary so it encapsulates all the necessary context.` : ""}

IMPORTANT INSTRUCTIONS:
- ONLY output the summary text itself.
- Do NOT output conversational filler like "Here is a summary:" or "Unfortunately, there is no video content...".
- If the description is missing or extremely short, just base the summary heavily on the Title and Creator's Summary, do not complain about missing content.
- If there is truly zero usable info, output this exactly: "Not enough info to summarize: please provide a Creator's Summary."
`;

    const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }]
    });

    const summary = completion.choices[0]?.message?.content?.trim() || "";

    return prisma.video.update({
        where: { id: videoId, userId },
        data: {
            aiSummary: summary,
            summaryGenerated: true,
            contextUpdatedAt: new Date()
        }
    });
}
