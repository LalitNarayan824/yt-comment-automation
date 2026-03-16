"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
    const { status } = useSession();
    const router = useRouter();

    // If already logged in, redirect to dashboard
    useEffect(() => {
        if (status === "authenticated") {
            router.push("/dashboard");
        }
    }, [status, router]);

    const handleSignIn = () => {
        signIn("google", { callbackUrl: "/dashboard" });
    };

    // Show loading while checking session
    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-yt-bg-page">
                <div className="text-sm text-yt-text-secondary">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-yt-bg-page">
            <div className="w-full max-w-md p-8">
                {/* Logo / Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center gap-2 mb-6">
                        {/* YouTube-style play icon */}
                        <div className="w-10 h-7 bg-yt-red rounded-lg flex items-center justify-center">
                            <svg
                                className="w-4 h-4 text-yt-text-inverse ml-0.5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                        <span className="text-xl font-semibold text-yt-text-primary">
                            CommentAI
                        </span>
                    </div>
                    <h1 className="text-2xl font-normal text-yt-text-primary mb-2">Sign in</h1>
                    <p className="text-sm text-yt-text-secondary">
                        to continue to YouTube Comment Automation
                    </p>
                </div>

                {/* Sign-in Card */}
                <div className="border border-yt-border rounded-lg p-8 bg-yt-bg-surface">
                    <p className="text-sm text-yt-text-secondary mb-6 text-center">
                        Sign in with your Google account to manage YouTube comments with AI-powered replies.
                    </p>

                    <button
                        onClick={handleSignIn}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-yt-border rounded-full hover:bg-yt-bg-surface-hover transition-colors cursor-pointer"
                    >
                        {/* Google "G" logo */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        <span className="text-sm font-medium text-yt-text-primary">
                            Sign in with Google
                        </span>
                    </button>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-yt-text-secondary">
                        By signing in, you agree to let this app manage your YouTube comments.
                    </p>
                </div>
            </div>
        </div>
    );
}
