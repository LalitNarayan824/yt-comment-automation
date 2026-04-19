"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";

// ── Types ─────────────────────────────────────

interface AIInsights {
    vibeCheck: string;
    summary: string;
    keyInsights: string[];
    risks: string[];
    opportunities: string[];
    recommendations: string[];
    actionLinks: { label: string; filter: string }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Metrics = Record<string, any>;

interface UserSettings {
    contentCategory: string;
    contentType: string;
    audienceExpectation: string;
}

const CONTENT_CATEGORIES = ["education", "tech", "gaming", "entertainment", "vlog", "music", "news"];
const CONTENT_TYPES = [
    "Programming Tutorials", "Web Development", "AI / Machine Learning",
    "Tech Reviews", "Gaming Walkthroughs", "Comedy", "Travel Vlogs",
    "Music Production", "News & Politics", "Lifestyle"
];
const AUDIENCE_EXPECTATIONS = ["high interaction", "moderate interaction", "low interaction"];

const PIE_COLORS = ["#22c55e", "#ef4444", "#6b7280", "#3b82f6", "#f59e0b", "#8b5cf6"];

export default function InsightsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch initial data
    useEffect(() => {
        if (status !== "authenticated") return;

        const fetchData = async () => {
            try {
                const [insightsRes, settingsRes] = await Promise.all([
                    fetch("/api/insights"),
                    fetch("/api/user/settings"),
                ]);

                const insightsData = await insightsRes.json();
                const settingsData = await settingsRes.json();

                if (insightsRes.ok) {
                    setMetrics(insightsData.metrics);
                    setAiInsights(insightsData.aiInsights);
                    setLastUpdated(insightsData.lastUpdated);
                }
                if (settingsRes.ok) {
                    setSettings(settingsData);
                }
            } catch {
                setError("Failed to load insights data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [status]);

    const handleGenerateInsights = async () => {
        setGenerating(true);
        setError(null);

        try {
            const res = await fetch("/api/insights?generate=true");
            const data = await res.json();

            if (res.ok) {
                setMetrics(data.metrics);
                setAiInsights(data.aiInsights);
                setLastUpdated(data.lastUpdated);
            } else {
                setError(data.error || "Failed to generate insights");
            }
        } catch {
            setError("Network error — failed to generate insights");
        } finally {
            setGenerating(false);
        }
    };

    const handleUpdateSettings = async (key: string, value: string) => {
        if (!settings) return;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        try {
            await fetch("/api/user/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [key]: value }),
            });
        } catch {
            // Silently fail — settings will be refreshed on next load
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen bg-yt-bg-page">
                <NavBar session={session} />
                <main className="max-w-6xl mx-auto px-4 py-6">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-yt-bg-skeleton rounded w-64" />
                        <div className="h-48 bg-yt-bg-skeleton rounded-lg" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-yt-bg-skeleton rounded-lg" />)}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="h-64 bg-yt-bg-skeleton rounded-lg" />
                            <div className="h-64 bg-yt-bg-skeleton rounded-lg" />
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (status === "unauthenticated") {
        router.push("/login");
        return null;
    }

    return (
        <div className="min-h-screen bg-yt-bg-page">
            <NavBar session={session} />

            <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-yt-text-primary">Channel Insights</h1>
                        {lastUpdated && (
                            <p className="text-xs text-yt-text-secondary mt-1">
                                Last AI analysis: {new Date(lastUpdated).toLocaleString()}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSettingsOpen(!settingsOpen)}
                            className="text-sm text-yt-text-secondary hover:text-yt-text-primary border border-yt-border px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                        >
                            ⚙ Settings
                        </button>
                        <button
                            onClick={handleGenerateInsights}
                            disabled={generating}
                            className="text-sm bg-yt-blue hover:bg-yt-blue-hover text-white font-medium px-4 py-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {generating ? "Analyzing..." : "🤖 Generate Insights"}
                        </button>
                    </div>
                </div>

                {/* Settings Panel */}
                {settingsOpen && settings && (
                    <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-4">
                        <h3 className="text-sm font-medium text-yt-text-primary mb-3">Creator Context Settings</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs text-yt-text-secondary block mb-1">Content Category</label>
                                <select
                                    value={settings.contentCategory}
                                    onChange={(e) => handleUpdateSettings("contentCategory", e.target.value)}
                                    className="w-full text-sm bg-yt-bg-elevated border border-yt-border rounded-md px-2 py-1.5 text-yt-text-primary"
                                >
                                    {CONTENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-yt-text-secondary block mb-1">Content Type</label>
                                <select
                                    value={settings.contentType}
                                    onChange={(e) => handleUpdateSettings("contentType", e.target.value)}
                                    className="w-full text-sm bg-yt-bg-elevated border border-yt-border rounded-md px-2 py-1.5 text-yt-text-primary"
                                >
                                    {CONTENT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-yt-text-secondary block mb-1">Audience Expectation</label>
                                <select
                                    value={settings.audienceExpectation}
                                    onChange={(e) => handleUpdateSettings("audienceExpectation", e.target.value)}
                                    className="w-full text-sm bg-yt-bg-elevated border border-yt-border rounded-md px-2 py-1.5 text-yt-text-primary"
                                >
                                    {AUDIENCE_EXPECTATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-yt-error-bg border border-yt-error-border text-yt-error-text text-sm rounded-lg p-4">
                        {error}
                    </div>
                )}

                {/* AI Insights Panel */}
                {generating && (
                    <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <svg className="w-5 h-5 animate-spin text-yt-blue" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span className="text-sm text-yt-text-secondary">Computing metrics & generating AI insights...</span>
                        </div>
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-yt-bg-skeleton rounded w-3/4" />
                            <div className="h-4 bg-yt-bg-skeleton rounded w-1/2" />
                            <div className="h-4 bg-yt-bg-skeleton rounded w-2/3" />
                        </div>
                    </div>
                )}

                {aiInsights && !generating && (
                    <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-6 space-y-4">
                        {/* Vibe Check */}
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{aiInsights.vibeCheck.split(" ")[0]}</span>
                            <div>
                                <h2 className="text-lg font-semibold text-yt-text-primary">AI Insights</h2>
                                <span className="text-sm text-yt-text-secondary">{aiInsights.vibeCheck}</span>
                            </div>
                        </div>

                        {/* Summary */}
                        <p className="text-sm text-yt-text-primary leading-relaxed">{aiInsights.summary}</p>

                        {/* Insights Grid */}
                        <div className="grid md:grid-cols-2 gap-4">
                            {aiInsights.keyInsights.length > 0 && (
                                <InsightSection title="💡 Key Insights" items={aiInsights.keyInsights} color="text-blue-400" />
                            )}
                            {aiInsights.risks.length > 0 && (
                                <InsightSection title="⚠️ Risks" items={aiInsights.risks} color="text-red-400" />
                            )}
                            {aiInsights.opportunities.length > 0 && (
                                <InsightSection title="🚀 Opportunities" items={aiInsights.opportunities} color="text-green-400" />
                            )}
                            {aiInsights.recommendations.length > 0 && (
                                <InsightSection title="📋 Recommendations" items={aiInsights.recommendations} color="text-yellow-400" />
                            )}
                        </div>

                        {/* Action Links */}
                        {aiInsights.actionLinks.length > 0 && (
                            <div className="border-t border-yt-border pt-3">
                                <p className="text-xs text-yt-text-secondary mb-2">Quick Actions</p>
                                <div className="flex flex-wrap gap-2">
                                    {aiInsights.actionLinks.map((link, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                // Parse "key:value" filter format into search params
                                                const params = new URLSearchParams();
                                                const parts = link.filter.split(":");
                                                if (parts.length === 2) {
                                                    const [key, value] = parts;
                                                    // Map LLM filter keys to search page param names
                                                    const paramMap: Record<string, string> = {
                                                        intent: "intent",
                                                        sentiment: "sentiment",
                                                        priority: "priority",
                                                        moderation: "moderation",
                                                        replied: "replied",
                                                        isSpam: "isSpam",
                                                        isToxic: "isToxic",
                                                    };
                                                    const paramKey = paramMap[key] || key;
                                                    // Handle special cases
                                                    if (key === "priority" && value === "high") {
                                                        // No direct priority filter, search for high priority
                                                    } else if (key === "moderation" && value === "flagged") {
                                                        params.set("isToxic", "true");
                                                    } else {
                                                        params.set(paramKey, value);
                                                    }
                                                }
                                                router.push(`/dashboard/search?${params.toString()}`);
                                            }}
                                            className="text-xs bg-yt-bg-elevated border border-yt-border px-3 py-1.5 rounded-full text-yt-blue hover:bg-yt-blue hover:text-white transition-colors cursor-pointer"
                                        >
                                            {link.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {metrics && (
                    <>
                        {/* KPI Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <KPICard label="Total Videos" value={metrics.totalVideos} />
                            <KPICard label="Total Comments" value={metrics.totalComments.toLocaleString()} />
                            <KPICard label="Reply Rate" value={`${metrics.replyRate}%`} />
                            <KPICard label="Health Score" value={`${metrics.healthScore}/100`} accent />
                            <KPICard label="Replies Posted" value={metrics.totalRepliesPosted.toLocaleString()} />
                            <KPICard label="Pending Replies" value={metrics.pendingReplies.toLocaleString()} />
                            <KPICard label="Avg Response Time" value={`${metrics.avgResponseTimeHours}h`} />
                            <KPICard label="Avg Likes/Comment" value={metrics.avgLikesPerComment} />
                        </div>

                        {/* Charts Row */}
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Engagement Trends */}
                            {metrics.activity.length > 0 && (
                                <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-4">
                                    <h3 className="text-sm font-medium text-yt-text-primary mb-3">Engagement Trends</h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <AreaChart data={metrics.activity}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                                            <YAxis tick={{ fill: "#888", fontSize: 11 }} />
                                            <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                                            <Area type="monotone" dataKey="comments" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Comments" />
                                            <Area type="monotone" dataKey="replies" stackId="2" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name="Replies" />
                                            <Legend wrapperStyle={{ fontSize: 12 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Sentiment Chart */}
                            {metrics.sentiment.distribution.length > 0 && (
                                <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-4">
                                    <h3 className="text-sm font-medium text-yt-text-primary mb-3">Sentiment Distribution</h3>
                                    <div className="flex items-center gap-6">
                                        <ResponsiveContainer width="50%" height={200}>
                                            <PieChart>
                                                <Pie data={metrics.sentiment.distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                                                    {metrics.sentiment.distribution.map((_: unknown, i: number) => (
                                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="space-y-2">
                                            <div className="text-sm"><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2" />Positive: {metrics.sentiment.positivePercent}%</div>
                                            <div className="text-sm"><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2" />Negative: {metrics.sentiment.negativePercent}%</div>
                                            <div className="text-sm"><span className="inline-block w-3 h-3 rounded-full bg-gray-500 mr-2" />Neutral: {metrics.sentiment.neutralPercent}%</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Intent & Moderation Row */}
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Intent */}
                            {metrics.intent.distribution.length > 0 && (
                                <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-4">
                                    <h3 className="text-sm font-medium text-yt-text-primary mb-3">Intent Breakdown</h3>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={metrics.intent.distribution} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis type="number" tick={{ fill: "#888", fontSize: 11 }} />
                                            <YAxis dataKey="name" type="category" tick={{ fill: "#888", fontSize: 11 }} width={90} />
                                            <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Moderation + Priority */}
                            <div className="space-y-4">
                                <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-4">
                                    <h3 className="text-sm font-medium text-yt-text-primary mb-3">Moderation Overview</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <MiniStat label="Allowed" value={metrics.moderation.allowed} color="text-green-400" />
                                        <MiniStat label="Blocked/Flagged" value={metrics.moderation.blocked} color="text-red-400" />
                                        <MiniStat label="Toxic" value={metrics.moderation.toxicCount} color="text-orange-400" />
                                        <MiniStat label="Spam" value={metrics.moderation.spamCount} color="text-yellow-400" />
                                    </div>
                                </div>

                                <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-4">
                                    <h3 className="text-sm font-medium text-yt-text-primary mb-3">Priority System</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        <MiniStat label="Avg Score" value={metrics.priority.avgScore} />
                                        <MiniStat label="High Priority" value={metrics.priority.highPriorityTotal} />
                                        <MiniStat label="HP Reply Rate" value={`${metrics.priority.highPriorityResponseRate}%`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Questions + Top Videos */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-4">
                                <h3 className="text-sm font-medium text-yt-text-primary mb-3">Questions</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <MiniStat label="Total Questions" value={metrics.questions.total} />
                                    <MiniStat label="Response Rate" value={`${metrics.questions.responseRate}%`} />
                                </div>
                            </div>

                            {metrics.topVideos.length > 0 && (
                                <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-4">
                                    <h3 className="text-sm font-medium text-yt-text-primary mb-3">Top Videos</h3>
                                    <div className="space-y-2">
                                        {metrics.topVideos.map((v: { videoId: string; title: string; commentCount: number; replyRate: number }, i: number) => (
                                            <div key={v.videoId} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 truncate flex-1 mr-3">
                                                    <span className="text-yt-text-secondary w-4">{i + 1}.</span>
                                                    <span className="truncate text-yt-text-primary">{v.title}</span>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-xs text-yt-text-secondary">{v.commentCount} comments</span>
                                                    <span className="text-xs text-yt-blue">{v.replyRate}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {!metrics && !loading && !generating && (
                    <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-12 text-center">
                        <p className="text-sm text-yt-text-secondary mb-3">No data available yet</p>
                        <button
                            onClick={handleGenerateInsights}
                            className="text-sm bg-yt-blue hover:bg-yt-blue-hover text-white font-medium px-4 py-2 rounded-md transition-colors cursor-pointer"
                        >
                            🤖 Generate Your First Insights
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}

// ── Sub-Components ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NavBar({ session }: { session: any }) {
    return (
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
                        <Link href="/dashboard/insights" className="text-sm font-medium text-yt-text-primary">Insights</Link>
                        <Link href="/dashboard/search" className="text-sm font-medium text-yt-text-secondary hover:text-yt-text-primary transition-colors">Search</Link>
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
    );
}

function InsightSection({ title, items, color }: { title: string; items: string[]; color: string }) {
    return (
        <div className="bg-yt-bg-elevated rounded-lg p-3 border border-yt-border">
            <h4 className={`text-sm font-medium ${color} mb-2`}>{title}</h4>
            <ul className="space-y-1.5">
                {items.map((item, i) => (
                    <li key={i} className="text-xs text-yt-text-secondary leading-relaxed flex gap-2">
                        <span className="shrink-0 mt-0.5">•</span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function KPICard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
    return (
        <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-4">
            <p className="text-xs text-yt-text-secondary mb-1">{label}</p>
            <p className={`text-xl font-bold ${accent ? "text-yt-blue" : "text-yt-text-primary"}`}>{value}</p>
        </div>
    );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
    return (
        <div>
            <p className="text-xs text-yt-text-secondary">{label}</p>
            <p className={`text-lg font-semibold ${color || "text-yt-text-primary"}`}>{value}</p>
        </div>
    );
}
