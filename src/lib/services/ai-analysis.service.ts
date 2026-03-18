import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export interface CommentAnalysisResult {
    intent: string;
    sentiment: string;
    toxicityScore: number;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export async function analyzeComment(text: string): Promise<CommentAnalysisResult> {
    const prompt = `
    Analyze the following YouTube comment and return ONLY a valid JSON object without markdown formatting or surrounding backticks. The JSON must have these exact keys:
    - "intent" (question, appreciation, complaint, spam, other)
    - "sentiment" (positive, negative, neutral)
    - "toxicityScore" (float between 0.0 and 1.0)
  
    Comment: "${text}"
    `;

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
                // temperature: 0.2 to make it more deterministic for JSON
                temperature: 0.2,
                response_format: { type: "json_object" }
            });

            const content = completion.choices[0]?.message?.content?.trim();

            if (!content) {
                throw new Error("Empty response from AI");
            }

            const parsed = JSON.parse(content);

            return {
                intent: parsed.intent || "other",
                sentiment: parsed.sentiment || "neutral",
                toxicityScore: typeof parsed.toxicityScore === "number" ? parsed.toxicityScore : 0.0
            };

        } catch (error: any) {
            const isRateLimit =
                error?.status === 429 ||
                error?.message?.includes("429") ||
                error?.message?.toLowerCase()?.includes("rate limit");

            if (isRateLimit && attempt < MAX_RETRIES - 1) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                console.log(
                    `Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else if (attempt === MAX_RETRIES - 1) {
                console.error("Failed to analyze comment after retries:", error);
                // Return a safe neutral fallback instead of throwing to avoid breaking the comment pipeline
                return {
                    intent: "other",
                    sentiment: "neutral",
                    toxicityScore: 0.0
                };
            }
        }
    }

    return {
        intent: "other",
        sentiment: "neutral",
        toxicityScore: 0.0
    };
}
