"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [channel, setChannel] = useState(null);
    const [videos, setVideos] = useState([]);
    const [loadingChannel, setLoadingChannel] = useState(true);
    const [loadingVideos, setLoadingVideos] = useState(true);
    const [error, setError] = useState(null);

    // Fetch channel info and videos on mount
    useEffect(() => {
        if (status !== "authenticated") return;

        const fetchChannel = async () => {
            try {
                const res = await fetch("/api/channel");
                const data = await res.json();
                if (res.ok && data.items?.length > 0) {
                    setChannel(data.items[0]);
                } else {
                    setError(data.error || "No channel found");
                }
            } catch (err) {
                setError("Failed to load channel info");
            } finally {
                setLoadingChannel(false);
            }
        };

        const fetchVideos = async () => {
            try {
                const res = await fetch("/api/videos");
                const data = await res.json();
                if (res.ok && data.items) {
                    setVideos(data.items);
                }
            } catch (err) {
                // silently fail for videos
            } finally {
                setLoadingVideos(false);
            }
        };

        fetchChannel();
        fetchVideos();
    }, [status]);

    // Redirect to login if not authenticated
    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-yt-light-gray">
                <div className="text-sm text-yt-gray-text">Loading...</div>
            </div>
        );
    }

    if (status === "unauthenticated") {
        router.push("/login");
        return null;
    }

    const handleSignOut = () => {
        signOut({ callbackUrl: "/login" });
    };

    const handleSelectVideo = (videoId) => {
        router.push(`/dashboard/video/${videoId}`);
    };

    const formatCount = (count) => {
        const num = parseInt(count, 10);
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
        if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
        return num.toLocaleString();
    };

    return (
        <div className="min-h-screen bg-yt-light-gray">
            {/* Navbar */}
            <nav className="bg-white border-b border-yt-gray-border sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-5.5 bg-yt-red rounded flex items-center justify-center">
                            <svg
                                className="w-3 h-3 text-white ml-0.5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                        <span className="text-lg font-semibold text-yt-dark">
                            CommentAI
                        </span>
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
                            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-white">U</span>
                            </div>
                        )}
                        <span className="text-sm text-yt-dark hidden sm:block">
                            {session?.user?.name}
                        </span>
                        <button
                            onClick={handleSignOut}
                            className="text-sm text-yt-gray-text hover:text-yt-dark transition-colors cursor-pointer"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content — Two Column Layout */}
            <main className="max-w-6xl mx-auto px-4 py-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-6">
                        {error}
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* LEFT — Channel Info */}
                    <div className="lg:w-80 shrink-0">
                        <div className="bg-white rounded-lg border border-yt-gray-border p-6 sticky top-20">
                            {loadingChannel ? (
                                <div className="animate-pulse space-y-4">
                                    <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto" />
                                    <div className="h-5 bg-gray-200 rounded w-3/4 mx-auto" />
                                    <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
                                    <div className="space-y-2 pt-4 border-t border-yt-gray-border">
                                        <div className="h-4 bg-gray-200 rounded w-full" />
                                        <div className="h-4 bg-gray-200 rounded w-full" />
                                        <div className="h-4 bg-gray-200 rounded w-full" />
                                    </div>
                                </div>
                            ) : channel ? (
                                <div className="text-center">
                                    {/* Channel Avatar */}
                                    <img
                                        src={channel.snippet?.thumbnails?.medium?.url || channel.snippet?.thumbnails?.default?.url}
                                        alt={channel.snippet?.title}
                                        className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-yt-gray-border"
                                        referrerPolicy="no-referrer"
                                    />
                                    {/* Channel Name */}
                                    <h2 className="text-lg font-semibold text-yt-dark mb-1">
                                        {channel.snippet?.title}
                                    </h2>
                                    {/* Custom URL */}
                                    {channel.snippet?.customUrl && (
                                        <p className="text-sm text-yt-gray-text mb-4">
                                            {channel.snippet.customUrl}
                                        </p>
                                    )}

                                    {/* Stats */}
                                    <div className="border-t border-yt-gray-border pt-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-yt-gray-text">Subscribers</span>
                                            <span className="text-sm font-medium text-yt-dark">
                                                {channel.statistics?.subscriberCount
                                                    ? formatCount(channel.statistics.subscriberCount)
                                                    : "Hidden"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-yt-gray-text">Total Views</span>
                                            <span className="text-sm font-medium text-yt-dark">
                                                {formatCount(channel.statistics?.viewCount || "0")}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-yt-gray-text">Videos</span>
                                            <span className="text-sm font-medium text-yt-dark">
                                                {formatCount(channel.statistics?.videoCount || "0")}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Channel Description */}
                                    {channel.snippet?.description && (
                                        <div className="border-t border-yt-gray-border pt-4 mt-4">
                                            <p className="text-xs text-yt-gray-text text-left leading-relaxed line-clamp-4">
                                                {channel.snippet.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-sm text-yt-gray-text">
                                        No channel info available
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT — Videos Grid */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-yt-dark">
                                Your Videos
                            </h2>
                            <p className="text-sm text-yt-gray-text">
                                Select a video to manage its comments
                            </p>
                        </div>

                        {loadingVideos ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className="bg-white rounded-lg border border-yt-gray-border overflow-hidden animate-pulse"
                                    >
                                        <div className="aspect-video bg-gray-200" />
                                        <div className="p-3 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-full" />
                                            <div className="h-3 bg-gray-200 rounded w-2/3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : videos.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {videos.map((video) => (
                                    <button
                                        key={video.id.videoId}
                                        onClick={() => handleSelectVideo(video.id.videoId)}
                                        className="bg-white rounded-lg border border-yt-gray-border overflow-hidden hover:border-yt-blue hover:shadow-sm transition-all text-left cursor-pointer group"
                                    >
                                        {/* Thumbnail */}
                                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                            <img
                                                src={video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url}
                                                alt={video.snippet.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                referrerPolicy="no-referrer"
                                            />
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 px-3 py-1.5 rounded-full">
                                                    Manage Comments
                                                </span>
                                            </div>
                                        </div>
                                        {/* Video Info */}
                                        <div className="p-3">
                                            <h3 className="text-sm font-medium text-yt-dark line-clamp-2 leading-snug mb-1">
                                                {video.snippet.title}
                                            </h3>
                                            <p className="text-xs text-yt-gray-text">
                                                {new Date(video.snippet.publishedAt).toLocaleDateString("en-US", {
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
                            <div className="bg-white rounded-lg border border-yt-gray-border p-12 text-center">
                                <svg
                                    className="w-16 h-16 mx-auto text-gray-300 mb-4"
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
                                <p className="text-sm text-yt-gray-text">
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
