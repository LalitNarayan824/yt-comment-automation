import type { MockComment } from "@/types";

export const mockComments: MockComment[] = [
    {
        id: "c1",
        author: "TechFan99",
        text: "This tutorial was incredibly helpful! I finally understood how async/await works. Thank you so much! 🙌",
        publishedAt: "2 hours ago",
        likes: 24,
    },
    {
        id: "c2",
        author: "CodeNewbie",
        text: "Can you make a video on React hooks? I'm struggling with useEffect cleanup functions.",
        publishedAt: "5 hours ago",
        likes: 12,
    },
    {
        id: "c3",
        author: "DevMaster42",
        text: "Great content as always! One small correction though — at 3:45 the import statement should be named, not default.",
        publishedAt: "1 day ago",
        likes: 8,
    },
    {
        id: "c4",
        author: "LearnToCode",
        text: "I've been following your channel for months now and my skills have improved so much. Keep it up! 💪",
        publishedAt: "1 day ago",
        likes: 31,
    },
    {
        id: "c5",
        author: "WebDev2024",
        text: "What IDE and theme are you using in this video? It looks really clean.",
        publishedAt: "3 days ago",
        likes: 5,
    },
    {
        id: "c6",
        author: "FullStackSara",
        text: "This is exactly what I needed for my project! Could you also cover authentication with NextAuth?",
        publishedAt: "4 days ago",
        likes: 17,
    },
];

export const mockReplies: Record<string, string> = {
    c1: "Thank you so much for the kind words! 😊 I'm really glad the async/await explanation clicked for you. Stay tuned for more deep dives!",
    c2: "Great suggestion! React hooks are definitely on my list — I'll cover useEffect cleanup in detail in an upcoming video. Stay tuned!",
    c3: "Really appreciate the catch! You're absolutely right about that import. I've pinned a correction in the comments. Thanks for keeping me honest! 👍",
    c4: "That means the world to me! 🙏 Seeing progress from viewers like you is what keeps me motivated to create more content.",
    c5: "I'm using VS Code with the 'One Dark Pro' theme and the 'JetBrains Mono' font. I'll add my full setup details in the description!",
    c6: "NextAuth is a fantastic topic! I'm actually planning a full authentication series. Thanks for the suggestion, Sara! 🚀",
};
