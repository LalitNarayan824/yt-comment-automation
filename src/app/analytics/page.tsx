"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { KPISection } from "@/components/analytics/KPISection";
import { SentimentChart } from "@/components/analytics/SentimentChart";
import { IntentChart } from "@/components/analytics/IntentChart";
import { ModerationChart } from "@/components/analytics/ModerationChart";
import { ActivityChart } from "@/components/analytics/ActivityChart";
import { InsightsPanel } from "@/components/analytics/InsightsPanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

// Types matching the API response
interface AnalyticsData {
    overview: {
        totalComments: number;
        totalRepliesPosted: number;
        pendingReplies: number;
        replyRate: number;
        avgResponseTimeHours: number;
    };
    sentiment: { name: string; value: number }[];
    intent: { name: string; value: number }[];
    moderation: { name: string; value: number }[];
    activity: { date: string; comments: number; replies: number }[];
    insights: {
        unansweredQuestions: number;
        highPriorityPending: number;
        ignoredNegative: number;
    };
}

function AnalyticsDashboardContent() {
    const searchParams = useSearchParams();
    const videoId = searchParams?.get("videoId");

    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!videoId) {
            setError("No videoId provided in URL. Please add ?videoId=YOUR_VIDEO_ID");
            setLoading(false);
            return;
        }

        async function fetchData() {
            try {
                setLoading(true);
                const res = await fetch(`/api/analytics?videoId=${videoId}`);
                if (!res.ok) {
                    throw new Error("Failed to fetch analytics data");
                }
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [videoId]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="container mx-auto p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error loading dashboard</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="dark flex-col md:flex min-h-screen bg-yt-bg-page text-yt-text-primary">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
                    <div className="flex text-sm text-muted-foreground">
                        Video ID: <span className="font-mono ml-2 text-foreground">{videoId}</span>
                    </div>
                </div>

                {/* 1. Overview KPIs */}
                <KPISection overview={data.overview} />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    {/* 4. Activity Trends (spanning 4 columns) */}
                    <div className="col-span-4">
                        <ActivityChart data={data.activity} />
                    </div>

                    {/* 5. Actionable Insights (spanning 3 columns) */}
                    <div className="col-span-3">
                        <InsightsPanel insights={data.insights} />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {/* 2 & 3. Breakdown Charts */}
                    <SentimentChart data={data.sentiment} />
                    <IntentChart data={data.intent} />
                    <ModerationChart data={data.moderation} />
                </div>
            </div>
        </div>
    );
}

export default function AnalyticsDashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
                </div>
            </div>
        }>
            <AnalyticsDashboardContent />
        </Suspense>
    );
}
