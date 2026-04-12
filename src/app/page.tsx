"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Shield, Zap, Youtube, ArrowRight } from "lucide-react";

export default function LandingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            router.push("/dashboard");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-yt-bg-page flex items-center justify-center">
                <p className="text-yt-text-secondary text-sm">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-yt-bg-page font-sans text-yt-text-primary flex flex-col">
            {/* Navbar */}
            <nav className="h-16 flex items-center justify-between px-6 border-b border-yt-border bg-yt-bg-page sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-5.5 bg-yt-red rounded flex items-center justify-center shadow-sm">
                        <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-yt-text-primary">CommentAI</span>
                </div>
                <div>
                    {session ? (
                        <Link href="/dashboard" className="px-4 py-2 bg-yt-bg-surface hover:bg-yt-bg-surface-hover border border-yt-border rounded-full text-sm font-medium text-yt-text-primary transition-colors">
                            Go to Dashboard
                        </Link>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link href="/login" className="px-4 py-2 text-sm font-medium text-yt-blue hover:text-yt-blue-hover transition-colors">
                                Sign In
                            </Link>
                            <Link href="/login" className="px-4 py-2 bg-yt-text-primary text-yt-bg-page hover:opacity-90 rounded-full text-sm font-semibold transition-opacity">
                                Get Started
                            </Link>
                        </div>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center px-4 py-24 text-center max-w-5xl mx-auto w-full">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yt-bg-surface border border-yt-border mb-8 shadow-sm">
                    <Youtube className="w-4 h-4 text-yt-red" />
                    <span className="text-xs font-bold uppercase tracking-wider text-yt-text-secondary">AI-Powered Comment Management</span>
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-yt-text-primary leading-tight">
                    Manage your community with <br className="hidden md:block" />
                    <span className="text-yt-red">YouTube precision.</span>
                </h1>

                <p className="text-lg md:text-xl text-yt-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                    Filter spam, analyze sentiment, and generate context-aware replies using intelligent personas. Take full control of your YouTube comments section automatically.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                    {session ? (
                        <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-3.5 bg-yt-text-primary text-yt-bg-page hover:opacity-90 rounded-full font-bold text-lg transition-opacity w-full sm:w-auto justify-center">
                            Open Dashboard
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    ) : (
                        <Link href="/login" className="inline-flex items-center gap-2 px-8 py-3.5 bg-yt-red hover:bg-yt-red-hover text-white rounded-full font-bold text-lg transition-colors w-full sm:w-auto justify-center shadow-md">
                            Get Started Free
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    )}
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-24 text-left">
                    <div className="bg-yt-bg-surface border border-yt-border p-8 rounded-2xl flex flex-col gap-5 hover:border-yt-text-secondary transition-colors group shadow-sm">
                        <div className="w-12 h-12 bg-yt-bg-page rounded-xl flex items-center justify-center border border-yt-border group-hover:border-yt-text-secondary transition-colors">
                            <Shield className="w-6 h-6 text-yt-text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-yt-text-primary mb-2">Smart Moderation</h3>
                            <p className="text-sm text-yt-text-secondary leading-relaxed">Automatically flag toxic comments, filter spam, and prioritize the users who matter most to your channel.</p>
                        </div>
                    </div>

                    <div className="bg-yt-bg-surface border border-yt-border p-8 rounded-2xl flex flex-col gap-5 hover:border-yt-red transition-colors group shadow-sm">
                        <div className="w-12 h-12 bg-yt-bg-page rounded-xl flex items-center justify-center border border-yt-border group-hover:border-yt-red transition-colors">
                            <MessageSquare className="w-6 h-6 text-yt-red" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-yt-text-primary mb-2">Persona Replies</h3>
                            <p className="text-sm text-yt-text-secondary leading-relaxed">Generate context-aware, personalized replies. Train AI personas to sound exactly like you or your brand.</p>
                        </div>
                    </div>

                    <div className="bg-yt-bg-surface border border-yt-border p-8 rounded-2xl flex flex-col gap-5 hover:border-yt-blue transition-colors group shadow-sm">
                        <div className="w-12 h-12 bg-yt-bg-page rounded-xl flex items-center justify-center border border-yt-border group-hover:border-yt-blue transition-colors">
                            <Zap className="w-6 h-6 text-yt-blue" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-yt-text-primary mb-2">Sentiment Analytics</h3>
                            <p className="text-sm text-yt-text-secondary leading-relaxed">Get a bird's-eye view of your audience's mood. Track positive, neutral, and negative sentiment over time.</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-yt-border mt-auto py-8 text-center text-sm text-yt-text-secondary bg-yt-bg-page">
                <p>&copy; {new Date().getFullYear()} CommentAI. All rights reserved.</p>
            </footer>
        </div>
    );
}
