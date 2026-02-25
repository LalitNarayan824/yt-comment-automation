"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { mockComments, mockReplies } from "@/lib/mockData";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [videoId, setVideoId] = useState("");
    const [comments, setComments] = useState([]);
    const [replies, setReplies] = useState({});
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState({});
    const [posted, setPosted] = useState({});
    const [fetched, setFetched] = useState(false);

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

    const handleFetchComments = () => {
        if (!videoId.trim()) return;
        setLoading(true);
        setFetched(false);
        setComments([]);
        setReplies({});
        setPosted({});

        // Simulate API call (will be replaced with real API in Step 3)
        setTimeout(() => {
            setComments(mockComments);
            setLoading(false);
            setFetched(true);
        }, 1500);
    };

    const handleGenerateReply = (commentId) => {
        setGenerating((prev) => ({ ...prev, [commentId]: true }));

        // Simulate AI generation (will be replaced with real API in Step 4)
        setTimeout(() => {
            setReplies((prev) => ({
                ...prev,
                [commentId]: mockReplies[commentId] || "Thank you for your comment!",
            }));
            setGenerating((prev) => ({ ...prev, [commentId]: false }));
        }, 1200);
    };

    const handleReplyChange = (commentId, value) => {
        setReplies((prev) => ({ ...prev, [commentId]: value }));
    };

    const handlePost = (commentId) => {
        setPosted((prev) => ({ ...prev, [commentId]: true }));
        // Reset after 3 seconds
        setTimeout(() => {
            setPosted((prev) => ({ ...prev, [commentId]: false }));
        }, 3000);
    };

    const handleSignOut = () => {
        signOut({ callbackUrl: "/login" });
    };

    const getInitials = (name) => {
        return name
            .split(/[\s]+/)
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const avatarColors = [
        "bg-red-600",
        "bg-blue-600",
        "bg-green-600",
        "bg-purple-600",
        "bg-orange-500",
        "bg-teal-600",
    ];

    return (
        <div className="min-h-screen bg-yt-light-gray">
            {/* Navbar */}
            <nav className="bg-white border-b border-yt-gray-border sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
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
                        {/* Show user avatar/info from Google session */}
                        {session?.user?.image ? (
                            <img
                                src={session.user.image}
                                alt={session.user.name || "User"}
                                className="w-8 h-8 rounded-full"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-white">
                                    {session?.user?.name
                                        ? getInitials(session.user.name)
                                        : "U"}
                                </span>
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

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-6">
                {/* Video ID Input */}
                <div className="bg-white rounded-lg border border-yt-gray-border p-4 mb-6">
                    <label className="block text-sm font-medium text-yt-dark mb-2">
                        YouTube Video ID
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={videoId}
                            onChange={(e) => setVideoId(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleFetchComments()}
                            placeholder="e.g. dQw4w9WgXcQ"
                            className="flex-1 px-3 py-2 border border-yt-gray-border rounded-lg text-sm text-yt-dark placeholder:text-gray-400 focus:outline-none focus:border-yt-blue focus:ring-1 focus:ring-yt-blue"
                        />
                        <button
                            onClick={handleFetchComments}
                            disabled={!videoId.trim() || loading}
                            className="px-5 py-2 bg-yt-blue text-white text-sm font-medium rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                            {loading ? "Fetching..." : "Fetch Comments"}
                        </button>
                    </div>
                </div>

                {/* Empty State */}
                {!fetched && !loading && (
                    <div className="text-center py-20">
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
                                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                            />
                        </svg>
                        <p className="text-yt-gray-text text-sm">
                            Enter a video ID above to fetch and manage comments
                        </p>
                    </div>
                )}

                {/* Loading Skeleton */}
                {loading && (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="bg-white rounded-lg border border-yt-gray-border p-4 animate-pulse"
                            >
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-gray-200 rounded w-28" />
                                        <div className="h-4 bg-gray-200 rounded w-full" />
                                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Comment Cards */}
                {fetched && !loading && (
                    <div className="space-y-4">
                        <p className="text-sm text-yt-gray-text mb-2">
                            {comments.length} comments
                        </p>
                        {comments.map((comment, index) => (
                            <div
                                key={comment.id}
                                className="bg-white rounded-lg border border-yt-gray-border p-4"
                            >
                                <div className="flex gap-3">
                                    {/* Avatar */}
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${avatarColors[index % avatarColors.length]}`}
                                    >
                                        <span className="text-xs font-medium text-white">
                                            {getInitials(comment.author)}
                                        </span>
                                    </div>

                                    {/* Comment Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-yt-dark">
                                                @{comment.author}
                                            </span>
                                            <span className="text-xs text-yt-gray-text">
                                                {comment.publishedAt}
                                            </span>
                                        </div>
                                        <p className="text-sm text-yt-dark leading-relaxed mb-3">
                                            {comment.text}
                                        </p>

                                        {/* Like count */}
                                        <div className="flex items-center gap-1 mb-3">
                                            <svg
                                                className="w-4 h-4 text-yt-gray-text"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={1.5}
                                                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017a2 2 0 01-.632-.103l-3.114-1.038a1 1 0 00-.317-.052H5V10l4.293-4.293a1 1 0 01.707-.293h.382a1.5 1.5 0 011.458 1.858L11.149 10z"
                                                />
                                            </svg>
                                            <span className="text-xs text-yt-gray-text">
                                                {comment.likes}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="space-y-3">
                                            {!replies[comment.id] && !generating[comment.id] && (
                                                <button
                                                    onClick={() => handleGenerateReply(comment.id)}
                                                    className="text-sm text-yt-blue font-medium hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                                                >
                                                    ✨ Generate Reply
                                                </button>
                                            )}

                                            {generating[comment.id] && (
                                                <div className="flex items-center gap-2 text-sm text-yt-gray-text px-3 py-1.5">
                                                    <svg
                                                        className="w-4 h-4 animate-spin"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <circle
                                                            className="opacity-25"
                                                            cx="12"
                                                            cy="12"
                                                            r="10"
                                                            stroke="currentColor"
                                                            strokeWidth="4"
                                                        />
                                                        <path
                                                            className="opacity-75"
                                                            fill="currentColor"
                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                        />
                                                    </svg>
                                                    Generating AI reply...
                                                </div>
                                            )}

                                            {replies[comment.id] && (
                                                <div className="space-y-2">
                                                    <textarea
                                                        value={replies[comment.id]}
                                                        onChange={(e) =>
                                                            handleReplyChange(comment.id, e.target.value)
                                                        }
                                                        rows={3}
                                                        className="w-full px-3 py-2 text-sm border border-yt-gray-border rounded-lg focus:outline-none focus:border-yt-blue focus:ring-1 focus:ring-yt-blue resize-none text-yt-dark"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handlePost(comment.id)}
                                                            disabled={posted[comment.id]}
                                                            className="px-4 py-1.5 bg-yt-blue text-white text-sm font-medium rounded-full hover:bg-blue-700 disabled:opacity-70 transition-colors cursor-pointer"
                                                        >
                                                            {posted[comment.id]
                                                                ? "✓ Posted"
                                                                : "Approve & Post"}
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setReplies((prev) => {
                                                                    const next = { ...prev };
                                                                    delete next[comment.id];
                                                                    return next;
                                                                })
                                                            }
                                                            className="px-4 py-1.5 text-sm text-yt-gray-text hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
