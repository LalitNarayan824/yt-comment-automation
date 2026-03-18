"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import type { Comment, Tone } from "@/types";

export default function VideoCommentsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const videoId = params.videoId as string;

    const [comments, setComments] = useState<Comment[]>([]);
    const [replies, setReplies] = useState<Record<string, string>>({}); // commentId -> generated text
    const [replyIds, setReplyIds] = useState<Record<string, string>>({}); // commentId -> reply DB UUID
    const [loading, setLoading] = useState<boolean>(false);
    const [generating, setGenerating] = useState<Record<string, boolean>>({});
    const [posted, setPosted] = useState<Record<string, boolean>>({});
    const [posting, setPosting] = useState<Record<string, boolean>>({});
    const [postError, setPostError] = useState<Record<string, string | null>>({});
    const [fetched, setFetched] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [tone, setTone] = useState<Tone>("friendly");
    const [genError, setGenError] = useState<Record<string, string | null>>({});
    const [filter, setFilter] = useState<"approved" | "flagged" | "blocked" | "all">("approved");

    // Auto-fetch comments when page loads
    useEffect(() => {
        if (status === "authenticated" && videoId) {
            handleFetchComments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, videoId]);

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
        } catch {
            setError("Network error — failed to fetch comments");
        } finally {
            setLoading(false);
            setFetched(true);
        }
    };

    const handleGenerateReply = async (commentId: string, commentText: string) => {
        setGenerating((prev) => ({ ...prev, [commentId]: true }));
        setGenError((prev) => ({ ...prev, [commentId]: null }));

        try {
            const res = await fetch("/api/generate-reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ commentId, commentText, tone }),
            });
            const data = await res.json();

            if (!res.ok) {
                setGenError((prev) => ({ ...prev, [commentId]: data.error || "Failed to generate" }));
            } else {
                setReplies((prev) => ({ ...prev, [commentId]: data.reply }));
                setReplyIds((prev) => ({ ...prev, [commentId]: data.replyId }));
            }
        } catch {
            setGenError((prev) => ({ ...prev, [commentId]: "Network error" }));
        } finally {
            setGenerating((prev) => ({ ...prev, [commentId]: false }));
        }
    };

    const handleReplyChange = (commentId: string, value: string) => {
        setReplies((prev) => ({ ...prev, [commentId]: value }));
    };

    const handlePost = async (commentId: string, youtubeCommentId: string) => {
        const replyText = replies[commentId];
        const replyId = replyIds[commentId];
        if (!replyText || !replyId) return;

        setPosting((prev) => ({ ...prev, [commentId]: true }));
        setPostError((prev) => ({ ...prev, [commentId]: null }));

        try {
            const res = await fetch("/api/post-reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ parentId: youtubeCommentId, replyId, replyText }),
            });
            const data = await res.json();

            if (!res.ok) {
                setPostError((prev) => ({ ...prev, [commentId]: data.error || "Failed to post" }));
            } else {
                setPosted((prev) => ({ ...prev, [commentId]: true }));
            }
        } catch {
            setPostError((prev) => ({ ...prev, [commentId]: "Network error" }));
        } finally {
            setPosting((prev) => ({ ...prev, [commentId]: false }));
        }
    };

    const formatTimeAgo = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
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

    const filteredComments = comments.filter((c: any) => filter === "all" || c.moderationStatus === filter);

    return (
        <div className="min-h-screen bg-yt-bg-page">
            {/* Navbar */}
            <nav className="bg-yt-bg-surface border-b border-yt-border sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="text-yt-text-secondary hover:text-yt-text-primary transition-colors cursor-pointer"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-5.5 bg-yt-red rounded flex items-center justify-center">
                                    <svg className="w-3 h-3 text-yt-text-inverse ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                                <span className="text-lg font-semibold text-yt-text-primary">CommentAI</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-4">
                                <a href="/dashboard" className="text-sm font-medium text-yt-text-secondary hover:text-yt-text-primary transition-colors">Dashboard</a>
                                <a href="/dashboard/personas" className="text-sm font-medium text-yt-text-secondary hover:text-yt-text-primary transition-colors">Personas</a>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-sm text-yt-text-secondary">
                            Video: <span className="font-mono text-yt-text-primary">{videoId}</span>
                        </div>
                        <button
                            onClick={handleFetchComments}
                            disabled={loading}
                            className="text-sm text-yt-blue hover:text-yt-blue-hover font-medium transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {loading ? "Refreshing..." : "↻ Refresh"}
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 py-6">
                {/* Error */}
                {error && (
                    <div className="bg-yt-error-bg border border-yt-error-border text-yt-error-text text-sm rounded-lg p-4 mb-6 flex items-center justify-between">
                        <span>{error}</span>
                        <button
                            onClick={handleFetchComments}
                            className="text-yt-error-text font-medium hover:underline cursor-pointer"
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
                                className="bg-yt-bg-surface rounded-lg border border-yt-border p-4 animate-pulse"
                            >
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 bg-yt-bg-skeleton rounded-full shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-yt-bg-skeleton rounded w-28" />
                                        <div className="h-4 bg-yt-bg-skeleton rounded w-full" />
                                        <div className="h-4 bg-yt-bg-skeleton rounded w-3/4" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {fetched && !loading && comments.length === 0 && !error && (
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
                                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                            />
                        </svg>
                        <p className="text-sm text-yt-text-secondary">
                            No comments found for this video
                        </p>
                    </div>
                )}

                {/* Comment Cards */}
                {fetched && !loading && comments.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex border-b border-yt-border mb-4">
                            {(["approved", "flagged", "blocked", "all"] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setFilter(tab)}
                                    className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${filter === tab ? "border-b-2 border-yt-blue text-yt-blue" : "text-yt-text-secondary hover:text-yt-text-primary"}`}
                                >
                                    {tab === "approved" ? "✅ Approved" : tab === "flagged" ? "⚠️ Flagged" : tab === "blocked" ? "❌ Blocked" : "All"}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-yt-text-secondary">
                                {filteredComments.length} comments shown
                            </p>
                            <div className="flex items-center gap-1 bg-yt-bg-elevated rounded-full p-1">
                                {(["friendly", "professional", "humorous"] as Tone[]).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTone(t)}
                                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer ${tone === t
                                            ? "bg-yt-bg-surface text-yt-text-primary shadow-sm"
                                            : "text-yt-text-secondary hover:text-yt-text-primary"
                                            }`}
                                    >
                                        {t === "friendly" ? "😊 Friendly" : t === "professional" ? "💼 Professional" : "😄 Humorous"}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {filteredComments.map((comment: any) => (
                            <div
                                key={comment.id}
                                className="bg-yt-bg-surface rounded-lg border border-yt-border p-4"
                            >
                                <div className="flex gap-3">
                                    {/* Avatar */}
                                    {comment.authorProfileImage ? (
                                        <img
                                            src={comment.authorProfileImage}
                                            alt={comment.authorName}
                                            className="w-10 h-10 rounded-full shrink-0"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-yt-avatar-blue flex items-center justify-center shrink-0">
                                            <span className="text-xs font-medium text-yt-text-inverse">
                                                {comment.authorName?.charAt(0)?.toUpperCase() || "?"}
                                            </span>
                                        </div>
                                    )}

                                    {/* Comment Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-yt-text-primary">
                                                @{comment.authorName}
                                            </span>
                                            <span className="text-xs text-yt-text-secondary">
                                                {formatTimeAgo(comment.publishedAt as string)}
                                            </span>
                                            {/* Moderation Badges */}
                                            {comment.isModerated && (
                                                <div className="flex items-center gap-1.5 ml-2">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${comment.moderationStatus === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : comment.moderationStatus === 'blocked' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500'}`}>
                                                        {comment.moderationStatus?.toUpperCase()}
                                                    </span>
                                                    {(comment.toxicityScore !== null && comment.toxicityScore !== undefined) && (
                                                        <span className="text-[10px] bg-yt-bg-elevated text-yt-text-secondary px-1.5 py-0.5 rounded border border-yt-border">
                                                            Toxicity: {(comment.toxicityScore * 100).toFixed(0)}%
                                                        </span>
                                                    )}
                                                    {comment.isSpam && (
                                                        <span className="text-[10px] bg-yt-error-bg text-yt-error-text px-1.5 py-0.5 rounded border border-yt-error-border">
                                                            SPAM
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <p
                                            className="text-sm text-yt-text-primary leading-relaxed mb-3"
                                            dangerouslySetInnerHTML={{ __html: comment.text }}
                                        />

                                        {/* Like count & Reply count */}
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4 text-yt-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017a2 2 0 01-.632-.103l-3.114-1.038a1 1 0 00-.317-.052H5V10l4.293-4.293a1 1 0 01.707-.293h.382a1.5 1.5 0 011.458 1.858L11.149 10z" />
                                                </svg>
                                                <span className="text-xs text-yt-text-secondary">{comment.likeCount}</span>
                                            </div>
                                            {comment.totalReplyCount > 0 && (
                                                <span className="text-xs text-yt-blue font-medium">
                                                    {comment.totalReplyCount} {comment.totalReplyCount === 1 ? "reply" : "replies"}
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="space-y-3">
                                            {/* Show existing reply if already replied in DB */}
                                            {(comment.replied || (comment.replies && comment.replies.length > 0)) && !replies[comment.id] ? (
                                                <div className="bg-yt-bg-elevated rounded-lg p-3 border border-yt-border">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-5 h-5 bg-yt-blue rounded-full flex items-center justify-center">
                                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                        <span className="text-xs font-medium text-yt-text-primary">AI Replied</span>
                                                    </div>
                                                    <p className="text-sm text-yt-text-secondary">
                                                        {comment.replies?.[0]?.posted ? comment.replies[0].editedReply || comment.replies[0].generatedReply : "Reply was posted to YouTube."}
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    {!replies[comment.id] && !generating[comment.id] && (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleGenerateReply(comment.id, comment.text)}
                                                                className="text-sm text-yt-blue font-medium hover:bg-yt-blue-subtle px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                                                            >
                                                                ✨ Generate Reply
                                                            </button>
                                                            {genError[comment.id] && (
                                                                <span className="text-xs text-yt-error-text">{genError[comment.id]}</span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {generating[comment.id] && (
                                                        <div className="flex items-center gap-2 text-sm text-yt-text-secondary px-3 py-1.5">
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
                                                                className="w-full px-3 py-2 text-sm border border-yt-border rounded-lg focus:outline-none focus:border-yt-blue focus:ring-1 focus:ring-yt-blue resize-none text-yt-text-primary bg-yt-bg-elevated"
                                                            />
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handlePost(comment.id, comment.youtubeCommentId)}
                                                                    disabled={posted[comment.id] || posting[comment.id]}
                                                                    className="px-4 py-1.5 bg-yt-blue text-yt-text-inverse text-sm font-medium rounded-full hover:bg-yt-blue-hover disabled:opacity-70 transition-colors cursor-pointer"
                                                                >
                                                                    {posting[comment.id] ? "Posting..." : posted[comment.id] ? "✓ Posted" : "Approve & Post"}
                                                                </button>
                                                                {postError[comment.id] && (
                                                                    <span className="text-xs text-yt-error-text">{postError[comment.id]}</span>
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
                                                                    className="px-4 py-1.5 text-sm text-yt-blue hover:bg-yt-blue-subtle rounded-full transition-colors cursor-pointer"
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
                                                                    className="px-4 py-1.5 text-sm text-yt-text-secondary hover:bg-yt-bg-surface-hover rounded-full transition-colors cursor-pointer"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
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
