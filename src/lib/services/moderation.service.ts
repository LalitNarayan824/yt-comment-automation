export interface ModerationResult {
    is_toxic: boolean;
    is_spam: boolean;
    moderation_status: "approved"| "blocked" ;
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
 * Moderate a comment given its isToxic , and isSpam
 */
export function moderateComment(toxicity: boolean, isSpam: boolean = false): ModerationResult {
   
    let status: "approved" | "blocked" = "approved";

    if (toxicity || isSpam) {
        status = "blocked";
    }

    return {
        is_toxic: toxicity,
        is_spam: isSpam,
        moderation_status: status,
        is_moderated: true,
    };
}
