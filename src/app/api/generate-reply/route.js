import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function generateWithRetry(prompt) {
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

      return completion.choices[0]?.message?.content.trim();
    } catch (error) {
      const isRateLimit =
        error?.status === 429 ||
        error?.message?.includes("429") ||
        error?.message?.toLowerCase()?.includes("rate limit");

      if (isRateLimit && attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.log(
          `Rate limited, retrying in ${delay}ms (attempt ${
            attempt + 1
          }/${MAX_RETRIES})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

export async function POST(request) {
  try {
    const { commentText, tone = "friendly" } = await request.json();

    if (!commentText) {
      return Response.json(
        { error: "commentText is required" },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return Response.json(
        { error: "Groq API key not configured" },
        { status: 500 }
      );
    }

    const toneInstructions = {
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

    const reply = await generateWithRetry(prompt);

    return Response.json({ reply });
  } catch (error) {
    console.error("Groq API error:", error);

    const isRateLimit =
      error?.status === 429 ||
      error?.message?.includes("429") ||
      error?.message?.toLowerCase()?.includes("rate limit");

    if (isRateLimit) {
      return Response.json(
        { error: "Rate limited — please wait a few seconds and try again" },
        { status: 429 }
      );
    }

    return Response.json(
      { error: error.message || "Failed to generate reply" },
      { status: 500 }
    );
  }
}