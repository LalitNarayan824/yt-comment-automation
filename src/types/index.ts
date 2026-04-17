// Shared type definitions

export interface MockComment {
    id: string;
    author: string;
    text: string;
    publishedAt: string;
    likes: number;
}

export interface Comment {
    id: string;
    youtubeCommentId: string;
    videoId: string;
    authorName: string;
    authorChannelId?: string;
    authorProfileImage?: string;
    text: string;
    likeCount: number;
    totalReplyCount: number;
    publishedAt: string | Date;
    replied: boolean;
    replies?: Reply[];
    isToxic: boolean;
    isSpam: boolean;
    moderationStatus: string;
    priorityScore: number;
}

export interface Reply {
    id: string;
    commentId: string;
    generatedReply: string;
    editedReply?: string;
    posted: boolean;
    postedAt?: string | Date;
}

export interface YouTubeThumbnail {
    url: string;
    width?: number;
    height?: number;
}

export interface YouTubeThumbnails {
    default?: YouTubeThumbnail;
    medium?: YouTubeThumbnail;
    high?: YouTubeThumbnail;
}

export interface ChannelSnippet {
    title?: string;
    description?: string;
    customUrl?: string;
    thumbnails?: YouTubeThumbnails;
}

export interface ChannelStatistics {
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
    hiddenSubscriberCount?: boolean;
}

export interface Channel {
    id?: string;
    snippet?: ChannelSnippet;
    statistics?: ChannelStatistics;
}

export interface Video {
    id: string;
    youtubeVideoId: string;
    title: string;
    thumbnailUrl?: string;
    publishedAt: string | Date;
    userId: string;
}

export type Tone = "friendly" | "professional" | "humorous";

export type ToneInstructions = Record<Tone, string>;

export interface Persona {
    id: string;
    name: string;
    tone: string | null;
    emojiStyle: string | null;
    vocabularyRules: string | null;
    catchphrases: string | null;
    forbiddenWords: string | null;
    isDefault: boolean;
    createdAt: string;
}
