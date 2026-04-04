export interface ModerationResult {
    toxicity_score: number;
    is_spam: boolean;
    moderation_status: "approved" | "flagged" | "blocked" | "pending";
    is_moderated: boolean;
}

/**
 * Detect spam based on heuristic rules
 */
// export function detectSpam(text: string): boolean {
//     const lowerText = text.toLowerCase();

//     // Check for links
//     if (lowerText.includes("http") || lowerText.includes("www")) {
//         return true;
//     }

//     // Check for promotional content
//     if (lowerText.match(/subscribe|check my channel/i)) {
//         return true;
//     }

//     // Check for overly short comments (likely spam or low effort)
//     if (text.trim().length <= 3) {
//         return true;
//     }

//     return false;
// }

/**
 * Moderate a comment given its ML toxicity score, and ML spam detection
 */
export function moderateComment( toxicityScore: number, isSpamML: boolean = false): ModerationResult {
    const isSpam = isSpamML;
    let status: "approved" | "flagged" | "blocked" | "pending" = "approved";

    if (toxicityScore > 0.65) {
        status = "blocked";
    } else if (isSpam) {
        status = "flagged";
    }

    return {
        toxicity_score: toxicityScore,
        is_spam: isSpam,
        moderation_status: status,
        is_moderated: true,
    };
}
