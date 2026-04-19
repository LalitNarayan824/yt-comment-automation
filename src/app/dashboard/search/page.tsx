"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ── Types ─────────────────────────────────────

interface VideoOption {
    id: string;
    title: string;
    youtubeVideoId: string;
}

interface CommentResult {
    id: string;
    text: string;
    authorName: string;
    authorProfileImage: string | null;
    likeCount: number;
    sentiment: string | null;
    intent: string | null;
    isSpam: boolean;
    isToxic: boolean;
    replied: boolean;
    priorityScore: number;
    publishedAt: string;
    video: { title: string; youtubeVideoId: string };
    replies: { generatedReply: string; posted: boolean; postedAt: string | null }[];
}

const SENTIMENTS = ["positive", "negative", "neutral"];
const INTENTS = ["question", "appreciation", "criticism"];

export default function SearchPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const urlParams = useSearchParams();

    // Filters
    const [videoId, setVideoId] = useState("");
    const [sentiment, setSentiment] = useState(urlParams?.get("sentiment") || "");
    const [intent, setIntent] = useState(urlParams?.get("intent") || "");
    const [isSpam, setIsSpam] = useState("");
    const [isToxic, setIsToxic] = useState("");
    const [replied, setReplied] = useState("");
    const [query, setQuery] = useState("");

    // Data
    const [videos, setVideos] = useState<VideoOption[]>([]);
    const [comments, setComments] = useState<CommentResult[]>([]);
    const [total, setTotal] = useState(0);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Initialize filters from url params (for action links from insights)
    useEffect(() => {
        const s = urlParams?.get("sentiment");
        const i = urlParams?.get("intent");
        const sp = urlParams?.get("isSpam");
        const t = urlParams?.get("isToxic");
        const r = urlParams?.get("replied");

        if (s) setSentiment(s);
        if (i) setIntent(i);
        if (sp) setIsSpam(sp);
        if (t) setIsToxic(t);
        if (r) setReplied(r);

        // Auto-search if any filter came from URL
        if (s || i || sp || t || r) {
            // defer to next tick so state is set
            setTimeout(() => handleSearch(), 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const buildQueryString = useCallback((cursor?: string) => {
        const params = new URLSearchParams();
        if (videoId) params.set("videoId", videoId);
        if (sentiment) params.set("sentiment", sentiment);
        if (intent) params.set("intent", intent);
        if (isSpam) params.set("isSpam", isSpam);
        if (isToxic) params.set("isToxic", isToxic);
        if (replied) params.set("replied", replied);
        if (query) params.set("q", query);
        if (cursor) params.set("cursor", cursor);
        return params.toString();
    }, [videoId, sentiment, intent, isSpam, isToxic, replied, query]);

    const handleSearch = useCallback(async (cursor?: string) => {
        setLoading(true);
        try {
            const qs = buildQueryString(cursor);
            const res = await fetch(`/api/comments/search?${qs}`);
            const data = await res.json();

            if (res.ok) {
                if (cursor) {
                    setComments(prev => [...prev, ...data.comments]);
                } else {
                    setComments(data.comments);
                }
                setTotal(data.total);
                setNextCursor(data.nextCursor);
                if (!cursor && data.videos) setVideos(data.videos);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
            setSearched(true);
        }
    }, [buildQueryString]);

    // Fetch videos for dropdown on mount
    useEffect(() => {
        if (status !== "authenticated") return;
        const fetchVideos = async () => {
            try {
                const res = await fetch("/api/comments/search");
                const data = await res.json();
                if (res.ok && data.videos) {
                    setVideos(data.videos);
                }
            } catch (err) {
                console.error("Failed to load videos:", err);
            }
        };
        fetchVideos();
    }, [status]);

    const handleClear = () => {
        setVideoId("");
        setSentiment("");
        setIntent("");
        setIsSpam("");
        setIsToxic("");
        setReplied("");
        setQuery("");
        setComments([]);
        setTotal(0);
        setNextCursor(null);
        setSearched(false);
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-yt-bg-page flex items-center justify-center">
                <p className="text-sm text-yt-text-secondary">Loading...</p>
            </div>
        );
    }

    if (status === "unauthenticated") {
        router.push("/login");
        return null;
    }

    return (
        <div className="min-h-screen bg-yt-bg-page">
            {/* Navbar */}
            <nav className="bg-yt-bg-surface border-b border-yt-border sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
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
                            <Link href="/dashboard" className="text-sm font-medium text-yt-text-secondary hover:text-yt-text-primary transition-colors">Dashboard</Link>
                            <Link href="/dashboard/insights" className="text-sm font-medium text-yt-text-secondary hover:text-yt-text-primary transition-colors">Insights</Link>
                            <Link href="/dashboard/search" className="text-sm font-medium text-yt-text-primary">Search</Link>
                            <Link href="/dashboard/personas" className="text-sm font-medium text-yt-text-secondary hover:text-yt-text-primary transition-colors">Personas</Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {session?.user?.image ? (
                            <img src={session.user.image} alt={session.user.name || "User"} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-8 h-8 bg-yt-avatar-purple rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-yt-text-inverse">U</span>
                            </div>
                        )}
                        <span className="text-sm text-yt-text-primary hidden sm:block">{session?.user?.name}</span>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
                <h1 className="text-2xl font-bold text-yt-text-primary">Search Comments</h1>

                {/* Filters */}
                <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        {/* Video */}
                        <div>
                            <label className="text-xs text-yt-text-secondary block mb-1">Video</label>
                            <select value={videoId} onChange={e => setVideoId(e.target.value)} className="w-full text-sm bg-yt-bg-elevated border border-yt-border rounded-md px-2 py-1.5 text-yt-text-primary">
                                <option value="">All Videos</option>
                                {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                            </select>
                        </div>
                        {/* Sentiment */}
                        <div>
                            <label className="text-xs text-yt-text-secondary block mb-1">Sentiment</label>
                            <select value={sentiment} onChange={e => setSentiment(e.target.value)} className="w-full text-sm bg-yt-bg-elevated border border-yt-border rounded-md px-2 py-1.5 text-yt-text-primary">
                                <option value="">Any</option>
                                {SENTIMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        {/* Intent */}
                        <div>
                            <label className="text-xs text-yt-text-secondary block mb-1">Intent</label>
                            <select value={intent} onChange={e => setIntent(e.target.value)} className="w-full text-sm bg-yt-bg-elevated border border-yt-border rounded-md px-2 py-1.5 text-yt-text-primary">
                                <option value="">Any</option>
                                {INTENTS.map(i => <option key={i} value={i}>{i}</option>)}
                            </select>
                        </div>
                        {/* Replied */}
                        <div>
                            <label className="text-xs text-yt-text-secondary block mb-1">Reply Status</label>
                            <select value={replied} onChange={e => setReplied(e.target.value)} className="w-full text-sm bg-yt-bg-elevated border border-yt-border rounded-md px-2 py-1.5 text-yt-text-primary">
                                <option value="">Any</option>
                                <option value="true">Replied</option>
                                <option value="false">Not Replied</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        {/* Spam */}
                        <div>
                            <label className="text-xs text-yt-text-secondary block mb-1">Spam</label>
                            <select value={isSpam} onChange={e => setIsSpam(e.target.value)} className="w-full text-sm bg-yt-bg-elevated border border-yt-border rounded-md px-2 py-1.5 text-yt-text-primary">
                                <option value="false">Non-Spam</option>
                                <option value="true">Spam Only</option>
                                <option value="">Any</option>
                            </select>
                        </div>
                        {/* Toxic */}
                        <div>
                            <label className="text-xs text-yt-text-secondary block mb-1">Toxic</label>
                            <select value={isToxic} onChange={e => setIsToxic(e.target.value)} className="w-full text-sm bg-yt-bg-elevated border border-yt-border rounded-md px-2 py-1.5 text-yt-text-primary">
                                <option value="false">Non-Toxic</option>
                                <option value="true">Toxic Only</option>
                                <option value="">Any</option>
                            </select>
                        </div>
                        {/* Text Search */}
                        <div className="col-span-2">
                            <label className="text-xs text-yt-text-secondary block mb-1">Text Search</label>
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSearch()}
                                placeholder="Search comment text..."
                                className="w-full text-sm bg-yt-bg-elevated border border-yt-border rounded-md px-2 py-1.5 text-yt-text-primary placeholder:text-yt-text-secondary"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleSearch()}
                            disabled={loading}
                            className="text-sm bg-yt-blue hover:bg-yt-blue-hover text-white font-medium px-4 py-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {loading ? "Searching..." : "🔍 Search"}
                        </button>
                        <button
                            onClick={handleClear}
                            className="text-sm text-yt-text-secondary hover:text-yt-text-primary border border-yt-border px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                        >
                            Clear
                        </button>
                        {searched && (
                            <span className="text-xs text-yt-text-secondary ml-auto">{total} result{total !== 1 ? "s" : ""} found</span>
                        )}
                    </div>
                </div>

                {/* Results */}
                {loading && !comments.length && (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-yt-bg-surface border border-yt-border rounded-lg p-4 animate-pulse">
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 bg-yt-bg-skeleton rounded-full shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-yt-bg-skeleton rounded w-1/4" />
                                        <div className="h-3 bg-yt-bg-skeleton rounded w-3/4" />
                                        <div className="h-3 bg-yt-bg-skeleton rounded w-1/2" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {searched && !loading && comments.length === 0 && (
                    <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-12 text-center">
                        <p className="text-sm text-yt-text-secondary">No comments found matching your filters</p>
                    </div>
                )}

                {comments.length > 0 && (
                    <div className="space-y-3">
                        {comments.map(comment => (
                            <div key={comment.id} className="bg-yt-bg-surface border border-yt-border rounded-lg p-4">
                                <div className="flex gap-3">
                                    {/* Avatar */}
                                    {comment.authorProfileImage ? (
                                        <img src={comment.authorProfileImage} alt="" className="w-8 h-8 rounded-full shrink-0" referrerPolicy="no-referrer" />
                                    ) : (
                                        <div className="w-8 h-8 bg-yt-avatar-purple rounded-full shrink-0 flex items-center justify-center">
                                            <span className="text-xs text-white">{comment.authorName[0]}</span>
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        {/* Header */}
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="text-sm font-medium text-yt-text-primary">{comment.authorName}</span>
                                            <span className="text-xs text-yt-text-secondary">
                                                {new Date(comment.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </span>
                                            {comment.likeCount > 0 && (
                                                <span className="text-xs text-yt-text-secondary">👍 {comment.likeCount}</span>
                                            )}
                                        </div>

                                        {/* Video Tag */}
                                        <Link
                                            href={`/dashboard/video/${comment.video.youtubeVideoId}`}
                                            className="inline-block text-xs text-yt-blue hover:underline mb-1.5"
                                        >
                                            📺 {comment.video.title}
                                        </Link>

                                        {/* Text */}
                                        <p className="text-sm text-yt-text-primary leading-relaxed mb-2">{comment.text}</p>

                                        {/* Badges */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {comment.sentiment && (
                                                <Badge
                                                    label={comment.sentiment}
                                                    color={comment.sentiment === "positive" ? "bg-green-500/20 text-green-400" : comment.sentiment === "negative" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}
                                                />
                                            )}
                                            {comment.intent && (
                                                <Badge label={comment.intent} color="bg-purple-500/20 text-purple-400" />
                                            )}
                                            {comment.isSpam && <Badge label="spam" color="bg-yellow-500/20 text-yellow-400" />}
                                            {comment.isToxic && <Badge label="toxic" color="bg-orange-500/20 text-orange-400" />}
                                            {comment.replied ? (
                                                <Badge label="replied" color="bg-blue-500/20 text-blue-400" />
                                            ) : (
                                                <Badge label="no reply" color="bg-gray-500/20 text-gray-500" />
                                            )}
                                            {comment.priorityScore >= 70 && (
                                                <Badge label={`priority: ${comment.priorityScore}`} color="bg-red-500/20 text-red-400" />
                                            )}
                                        </div>

                                        {/* Reply preview */}
                                        {comment.replies.length > 0 && comment.replies[0].posted && (
                                            <div className="mt-2 pl-3 border-l-2 border-yt-blue">
                                                <p className="text-xs text-yt-text-secondary">✅ Reply posted</p>
                                                <p className="text-xs text-yt-text-primary mt-0.5 line-clamp-2">{comment.replies[0].generatedReply}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Load More */}
                        {nextCursor && (
                            <div className="text-center py-3">
                                <button
                                    onClick={() => handleSearch(nextCursor)}
                                    disabled={loading}
                                    className="text-sm text-yt-blue hover:text-yt-blue-hover font-medium cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? "Loading..." : "Load more results"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

function Badge({ label, color }: { label: string; color: string }) {
    return (
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${color}`}>
            {label}
        </span>
    );
}
