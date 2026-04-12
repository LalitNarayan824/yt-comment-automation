"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Channel, Video } from "@/types";
import { useYouTubeStore } from "@/store/useYouTubeStore";
import Link from "next/link";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const { channel, videos, isChannelFetched, isVideosFetched, setChannel, setVideos } = useYouTubeStore();
    const [loadingChannel, setLoadingChannel] = useState<boolean>(!isChannelFetched);
    const [loadingVideos, setLoadingVideos] = useState<boolean>(!isVideosFetched);
    const [error, setError] = useState<string | null>(null);

    // Fetch channel info and videos on mount
    useEffect(() => {
        if (status !== "authenticated") return;

        const fetchChannel = async () => {
            if (isChannelFetched) {
                setLoadingChannel(false);
                return;
            }
            try {
                const res = await fetch("/api/channel");
                const data = await res.json();
                if (res.ok && data.items?.length > 0) {
                    setChannel(data.items[0]);
                } else {
                    setError(data.error || "No channel found");
                }
            } catch {
                setError("Failed to load channel info");
            } finally {
                setLoadingChannel(false);
            }
        };

        const fetchVideos = async () => {
            if (isVideosFetched) {
                setLoadingVideos(false);
                return;
            }
            try {
                const res = await fetch("/api/videos");
                const data = await res.json();
                if (res.ok && data.videos) {
                    setVideos(data.videos);
                }
            } catch {
                // silently fail for videos
            } finally {
                setLoadingVideos(false);
            }
        };

        fetchChannel();
        fetchVideos();
    }, [status, isChannelFetched, isVideosFetched, setChannel, setVideos]);

    // Redirect to login if not authenticated
    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-yt-bg-page">
                <div className="text-sm text-yt-text-secondary">Loading...</div>
            </div>
        );
    }

    if (status === "unauthenticated") {
        router.push("/login");
        return null;
    }

    const handleSignOut = () => {
        signOut({ callbackUrl: "/" });
    };

    const handleSelectVideo = (videoId: string) => {
        router.push(`/dashboard/video/${videoId}`);
    };

    const formatCount = (count: string) => {
        const num = parseInt(count, 10);
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
        if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
        return num.toLocaleString();
    };

    return (
        <div className="min-h-screen bg-yt-bg-page">
            {/* Navbar */}
            <nav className="bg-yt-bg-surface border-b border-yt-border sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-5.5 bg-yt-red rounded flex items-center justify-center">
                                <svg
                                    className="w-3 h-3 text-yt-text-inverse ml-0.5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                            <span className="text-lg font-semibold text-yt-text-primary">
                                CommentAI
                            </span>
                        </div>
                        <div className="hidden sm:flex items-center gap-4">
                            <Link href="/dashboard" className="text-sm font-medium text-yt-text-primary">Dashboard</Link>
                            <Link href="/dashboard/personas" className="text-sm font-medium text-yt-text-secondary hover:text-yt-text-primary transition-colors">Personas</Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {session?.user?.image ? (
                            <img
                                src={session.user.image}
                                alt={session.user.name || "User"}
                                className="w-8 h-8 rounded-full"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-8 h-8 bg-yt-avatar-purple rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-yt-text-inverse">U</span>
                            </div>
                        )}
                        <span className="text-sm text-yt-text-primary hidden sm:block">
                            {session?.user?.name}
                        </span>
                        <button
                            onClick={handleSignOut}
                            className="text-sm text-yt-text-secondary hover:text-yt-text-primary transition-colors cursor-pointer"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content — Two Column Layout */}
            <main className="max-w-6xl mx-auto px-4 py-6">
                {error && (
                    <div className="bg-yt-error-bg border border-yt-error-border text-yt-error-text text-sm rounded-lg p-4 mb-6">
                        {error}
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* LEFT — Channel Info */}
                    <div className="lg:w-80 shrink-0">
                        <div className="bg-yt-bg-surface rounded-lg border border-yt-border p-6 sticky top-20">
                            {loadingChannel ? (
                                <div className="animate-pulse space-y-4">
                                    <div className="w-20 h-20 bg-yt-bg-skeleton rounded-full mx-auto" />
                                    <div className="h-5 bg-yt-bg-skeleton rounded w-3/4 mx-auto" />
                                    <div className="h-3 bg-yt-bg-skeleton rounded w-1/2 mx-auto" />
                                    <div className="space-y-2 pt-4 border-t border-yt-border">
                                        <div className="h-4 bg-yt-bg-skeleton rounded w-full" />
                                        <div className="h-4 bg-yt-bg-skeleton rounded w-full" />
                                        <div className="h-4 bg-yt-bg-skeleton rounded w-full" />
                                    </div>
                                </div>
                            ) : channel ? (
                                <div className="text-center">
                                    {/* Channel Avatar */}
                                    <img
                                        src={channel.snippet?.thumbnails?.medium?.url || channel.snippet?.thumbnails?.default?.url}
                                        alt={channel.snippet?.title}
                                        className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-yt-border"
                                        referrerPolicy="no-referrer"
                                    />
                                    {/* Channel Name */}
                                    <h2 className="text-lg font-semibold text-yt-text-primary mb-1">
                                        {channel.snippet?.title}
                                    </h2>
                                    {/* Custom URL */}
                                    {channel.snippet?.customUrl && (
                                        <p className="text-sm text-yt-text-secondary mb-4">
                                            {channel.snippet.customUrl}
                                        </p>
                                    )}

                                    {/* Stats */}
                                    <div className="border-t border-yt-border pt-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-yt-text-secondary">Subscribers</span>
                                            <span className="text-sm font-medium text-yt-text-primary">
                                                {channel.statistics?.subscriberCount
                                                    ? formatCount(channel.statistics.subscriberCount)
                                                    : "Hidden"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-yt-text-secondary">Total Views</span>
                                            <span className="text-sm font-medium text-yt-text-primary">
                                                {formatCount(channel.statistics?.viewCount || "0")}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-yt-text-secondary">Videos</span>
                                            <span className="text-sm font-medium text-yt-text-primary">
                                                {formatCount(channel.statistics?.videoCount || "0")}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Channel Description */}
                                    {channel.snippet?.description && (
                                        <div className="border-t border-yt-border pt-4 mt-4">
                                            <p className="text-xs text-yt-text-secondary text-left leading-relaxed line-clamp-4">
                                                {channel.snippet.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-sm text-yt-text-secondary">
                                        No channel info available
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT — Videos Grid */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-yt-text-primary">
                                Your Videos
                            </h2>
                            <p className="text-sm text-yt-text-secondary">
                                Select a video to manage its comments
                            </p>
                        </div>

                        {loadingVideos ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className="bg-yt-bg-surface rounded-lg border border-yt-border overflow-hidden animate-pulse"
                                    >
                                        <div className="aspect-video bg-yt-bg-skeleton" />
                                        <div className="p-3 space-y-2">
                                            <div className="h-4 bg-yt-bg-skeleton rounded w-full" />
                                            <div className="h-3 bg-yt-bg-skeleton rounded w-2/3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : videos.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {videos.map((video) => (
                                    <button
                                        key={video.youtubeVideoId}
                                        onClick={() => handleSelectVideo(video.youtubeVideoId)}
                                        className="bg-yt-bg-surface rounded-lg border border-yt-border overflow-hidden hover:border-yt-blue hover:shadow-sm transition-all text-left cursor-pointer group"
                                    >
                                        {/* Thumbnail */}
                                        <div className="aspect-video bg-yt-bg-elevated relative overflow-hidden">
                                            <img
                                                src={video.thumbnailUrl || ""}
                                                alt={video.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                referrerPolicy="no-referrer"
                                            />
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-transparent group-hover:bg-yt-overlay-hover transition-colors flex items-center justify-center">
                                                <span className="text-yt-text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-yt-overlay px-3 py-1.5 rounded-full">
                                                    Manage Comments
                                                </span>
                                            </div>
                                        </div>
                                        {/* Video Info */}
                                        <div className="p-3">
                                            <h3 className="text-sm font-medium text-yt-text-primary line-clamp-2 leading-snug mb-1">
                                                {video.title}
                                            </h3>
                                            <p className="text-xs text-yt-text-secondary">
                                                {new Date(video.publishedAt).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-yt-bg-surface rounded-lg border border-yt-border p-12 text-center">
                                <svg
                                    className="w-16 h-16 mx-auto text-yt-icon-muted mb-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                </svg>
                                <p className="text-sm text-yt-text-secondary">
                                    No videos found on your channel
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
