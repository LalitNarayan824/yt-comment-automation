"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";

export default function VideoCommentsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const videoId = params.videoId;

    const [comments, setComments] = useState([]);
    const [replies, setReplies] = useState({});
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState({});
    const [posted, setPosted] = useState({});
    const [posting, setPosting] = useState({});
    const [postError, setPostError] = useState({});
    const [fetched, setFetched] = useState(false);
    const [error, setError] = useState(null);
    const [tone, setTone] = useState("friendly");
    const [genError, setGenError] = useState({});

    // Auto-fetch comments when page loads
    useEffect(() => {
        if (status === "authenticated" && videoId) {
            handleFetchComments();
        }
    }, [status, videoId]);

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

    const handleFetchComments = async () => {
        setLoading(true);
        setFetched(false);
        setComments([]);
        setReplies({});
        setPosted({});
        setError(null);

        try {
            const res = await fetch(`/api/comments?videoId=${videoId}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to fetch comments");
            } else {
                setComments(data.comments || []);
            }
        } catch (err) {
            setError("Network error — failed to fetch comments");
        } finally {
            setLoading(false);
            setFetched(true);
        }
    };

    const handleGenerateReply = async (commentId, commentText) => {
        setGenerating((prev) => ({ ...prev, [commentId]: true }));
        setGenError((prev) => ({ ...prev, [commentId]: null }));

        try {
            const res = await fetch("/api/generate-reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ commentText, tone }),
            });
            const data = await res.json();

            if (!res.ok) {
                setGenError((prev) => ({ ...prev, [commentId]: data.error || "Failed to generate" }));
            } else {
                setReplies((prev) => ({ ...prev, [commentId]: data.reply }));
            }
        } catch (err) {
            setGenError((prev) => ({ ...prev, [commentId]: "Network error" }));
        } finally {
            setGenerating((prev) => ({ ...prev, [commentId]: false }));
        }
    };

    const handleReplyChange = (commentId, value) => {
        setReplies((prev) => ({ ...prev, [commentId]: value }));
    };

    const handlePost = async (commentId) => {
        const replyText = replies[commentId];
        if (!replyText) return;

        setPosting((prev) => ({ ...prev, [commentId]: true }));
        setPostError((prev) => ({ ...prev, [commentId]: null }));

        try {
            const res = await fetch("/api/post-reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ parentId: commentId, replyText }),
            });
            const data = await res.json();

            if (!res.ok) {
                setPostError((prev) => ({ ...prev, [commentId]: data.error || "Failed to post" }));
            } else {
                setPosted((prev) => ({ ...prev, [commentId]: true }));
            }
        } catch (err) {
            setPostError((prev) => ({ ...prev, [commentId]: "Network error" }));
        } finally {
            setPosting((prev) => ({ ...prev, [commentId]: false }));
        }
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
        if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
        if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
        return "just now";
    };

    return (
        <div className="min-h-screen bg-yt-light-gray">
            {/* Navbar */}
            <nav className="bg-white border-b border-yt-gray-border sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="text-yt-gray-text hover:text-yt-dark transition-colors cursor-pointer"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-5.5 bg-yt-red rounded flex items-center justify-center">
                                <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                            <span className="text-lg font-semibold text-yt-dark">CommentAI</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-sm text-yt-gray-text">
                            Video: <span className="font-mono text-yt-dark">{videoId}</span>
                        </div>
                        <button
                            onClick={handleFetchComments}
                            disabled={loading}
                            className="text-sm text-yt-blue hover:text-blue-700 font-medium transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {loading ? "Refreshing..." : "↻ Refresh"}
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 py-6">
                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-6 flex items-center justify-between">
                        <span>{error}</span>
                        <button
                            onClick={handleFetchComments}
                            className="text-red-700 font-medium hover:underline cursor-pointer"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Loading Skeleton */}
                {loading && (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
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

                {/* Empty State */}
                {fetched && !loading && comments.length === 0 && !error && (
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
                                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                            />
                        </svg>
                        <p className="text-sm text-yt-gray-text">
                            No comments found for this video
                        </p>
                    </div>
                )}

                {/* Comment Cards */}
                {fetched && !loading && comments.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-yt-gray-text">
                                {comments.length} comments loaded
                            </p>
                            <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
                                {["friendly", "professional", "humorous"].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTone(t)}
                                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer ${tone === t
                                            ? "bg-white text-yt-dark shadow-sm"
                                            : "text-yt-gray-text hover:text-yt-dark"
                                            }`}
                                    >
                                        {t === "friendly" ? "😊 Friendly" : t === "professional" ? "💼 Professional" : "😄 Humorous"}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {comments.map((comment) => (
                            <div
                                key={comment.id}
                                className="bg-white rounded-lg border border-yt-gray-border p-4"
                            >
                                <div className="flex gap-3">
                                    {/* Avatar */}
                                    {comment.authorProfileImage ? (
                                        <img
                                            src={comment.authorProfileImage}
                                            alt={comment.author}
                                            className="w-10 h-10 rounded-full shrink-0"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-medium text-white">
                                                {comment.author?.charAt(0)?.toUpperCase() || "?"}
                                            </span>
                                        </div>
                                    )}

                                    {/* Comment Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-yt-dark">
                                                @{comment.author}
                                            </span>
                                            <span className="text-xs text-yt-gray-text">
                                                {formatTimeAgo(comment.publishedAt)}
                                            </span>
                                        </div>
                                        <p
                                            className="text-sm text-yt-dark leading-relaxed mb-3"
                                            dangerouslySetInnerHTML={{ __html: comment.text }}
                                        />

                                        {/* Like count & Reply count */}
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4 text-yt-gray-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017a2 2 0 01-.632-.103l-3.114-1.038a1 1 0 00-.317-.052H5V10l4.293-4.293a1 1 0 01.707-.293h.382a1.5 1.5 0 011.458 1.858L11.149 10z" />
                                                </svg>
                                                <span className="text-xs text-yt-gray-text">{comment.likeCount}</span>
                                            </div>
                                            {comment.totalReplyCount > 0 && (
                                                <span className="text-xs text-yt-blue font-medium">
                                                    {comment.totalReplyCount} {comment.totalReplyCount === 1 ? "reply" : "replies"}
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="space-y-3">
                                            {!replies[comment.id] && !generating[comment.id] && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleGenerateReply(comment.id, comment.text)}
                                                        className="text-sm text-yt-blue font-medium hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                                                    >
                                                        ✨ Generate Reply
                                                    </button>
                                                    {genError[comment.id] && (
                                                        <span className="text-xs text-red-500">{genError[comment.id]}</span>
                                                    )}
                                                </div>
                                            )}

                                            {generating[comment.id] && (
                                                <div className="flex items-center gap-2 text-sm text-yt-gray-text px-3 py-1.5">
                                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Generating AI reply...
                                                </div>
                                            )}

                                            {replies[comment.id] && (
                                                <div className="space-y-2">
                                                    <textarea
                                                        value={replies[comment.id]}
                                                        onChange={(e) => handleReplyChange(comment.id, e.target.value)}
                                                        rows={3}
                                                        className="w-full px-3 py-2 text-sm border border-yt-gray-border rounded-lg focus:outline-none focus:border-yt-blue focus:ring-1 focus:ring-yt-blue resize-none text-yt-dark"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handlePost(comment.id)}
                                                            disabled={posted[comment.id] || posting[comment.id]}
                                                            className="px-4 py-1.5 bg-yt-blue text-white text-sm font-medium rounded-full hover:bg-blue-700 disabled:opacity-70 transition-colors cursor-pointer"
                                                        >
                                                            {posting[comment.id] ? "Posting..." : posted[comment.id] ? "✓ Posted" : "Approve & Post"}
                                                        </button>
                                                        {postError[comment.id] && (
                                                            <span className="text-xs text-red-500">{postError[comment.id]}</span>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setReplies((prev) => {
                                                                    const next = { ...prev };
                                                                    delete next[comment.id];
                                                                    return next;
                                                                });
                                                                handleGenerateReply(comment.id, comment.text);
                                                            }}
                                                            className="px-4 py-1.5 text-sm text-yt-blue hover:bg-blue-50 rounded-full transition-colors cursor-pointer"
                                                        >
                                                            ↻ Regenerate
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
