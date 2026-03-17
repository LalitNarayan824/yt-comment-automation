import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import type { Tone, ToneInstructions } from "@/types";
import { saveReply } from "@/lib/services/reply.service";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

interface GroqError {
    status?: number;
    message?: string;
}

async function generateWithRetry(prompt: string): Promise<string | undefined> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const completion = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
            });

            return completion.choices[0]?.message?.content?.trim();
        } catch (error: unknown) {
            const groqError = error as GroqError;
            const isRateLimit =
                groqError?.status === 429 ||
                groqError?.message?.includes("429") ||
                groqError?.message?.toLowerCase()?.includes("rate limit");

            if (isRateLimit && attempt < MAX_RETRIES - 1) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                console.log(
                    `Rate limited, retrying in ${delay}ms (attempt ${attempt + 1
                    }/${MAX_RETRIES})`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        const { commentId, commentText, tone = "friendly" }: { commentId?: string; commentText?: string; tone?: Tone } = await request.json();

        if (!commentId || !commentText) {
            return Response.json(
                { error: "commentId and commentText are required" },
                { status: 400 }
            );
        }

        if (!process.env.GROQ_API_KEY) {
            return Response.json(
                { error: "Groq API key not configured" },
                { status: 500 }
            );
        }

        const toneInstructions: ToneInstructions = {
            friendly:
                "Reply in a warm, friendly, and conversational tone. Be enthusiastic and appreciative.",
            professional:
                "Reply in a polite, professional, and composed tone. Be respectful and well-articulated.",
            humorous:
                "Reply in a witty, lighthearted, and humorous tone. Keep it fun but respectful.",
        };

        const toneGuide = toneInstructions[tone] || toneInstructions.friendly;

        const prompt = `You are a YouTube content creator replying to a comment on your video.
${toneGuide}
Keep the reply under 2-3 sentences. Do not use hashtags. Do not use emojis excessively.
Reply directly — do not include any prefix like "Reply:" or quotes.

Comment: "${commentText}"`;

        const generatedReplyText = await generateWithRetry(prompt);

        if (!generatedReplyText) {
            return Response.json(
                { error: "LLM returned an empty response" },
                { status: 500 }
            );
        }

        // Save generated reply to the database
        const dbReply = await saveReply(commentId, generatedReplyText);

        return Response.json({
            reply: dbReply.generatedReply,
            replyId: dbReply.id,
        });
    } catch (error: unknown) {
        const groqError = error as GroqError;
        console.error("Groq API error:", error);

        const isRateLimit =
            groqError?.status === 429 ||
            groqError?.message?.includes("429") ||
            groqError?.message?.toLowerCase()?.includes("rate limit");

        if (isRateLimit) {
            return Response.json(
                { error: "Rate limited — please wait a few seconds and try again" },
                { status: 429 }
            );
        }

        return Response.json(
            { error: groqError?.message || "Failed to generate reply" },
            { status: 500 }
        );
    }
}
