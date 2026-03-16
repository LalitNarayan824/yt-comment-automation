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
    author: string;
    authorProfileImage?: string;
    text: string;
    likeCount: number;
    publishedAt: string;
    totalReplyCount: number;
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

export interface VideoSnippet {
    title: string;
    description?: string;
    publishedAt: string;
    thumbnails?: YouTubeThumbnails;
}

export interface Video {
    id: {
        videoId: string;
    };
    snippet: VideoSnippet;
}

export type Tone = "friendly" | "professional" | "humorous";

export type ToneInstructions = Record<Tone, string>;
