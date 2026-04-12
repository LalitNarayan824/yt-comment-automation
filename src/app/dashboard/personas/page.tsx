"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useYouTubeStore } from "@/store/useYouTubeStore";
import type { Persona } from "@/types";

export default function PersonasPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const { personas, isPersonasFetched, setPersonas } = useYouTubeStore();
    const [loading, setLoading] = useState<boolean>(!isPersonasFetched);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        tone: "friendly",
        emojiStyle: "minimal",
        vocabularyRules: "",
        catchphrases: "",
        forbiddenWords: "",
        isDefault: false
    });

    const fetchPersonas = async (forceRefetch = false) => {
        if (!forceRefetch && isPersonasFetched) {
            setLoading(false);
            return;
        }
        if (personas.length === 0) {
            setLoading(true);
        }
        try {
            const res = await fetch("/api/personas");
            const data = await res.json();
            if (res.ok) {
                setPersonas(data.personas || []);
            } else {
                setError(data.error || "Failed to load personas");
            }
        } catch {
            setError("Network error loading personas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === "authenticated") {
            fetchPersonas();
        }
    }, [status]);

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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/personas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to create persona");
            } else {
                // Reset form and refetch
                setFormData({
                    name: "", tone: "friendly", emojiStyle: "minimal",
                    vocabularyRules: "", catchphrases: "", forbiddenWords: "", isDefault: false
                });
                setShowForm(false);
                fetchPersonas(true);
            }
        } catch {
            setError("Network error creating persona");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            const res = await fetch(`/api/personas/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "set_default" })
            });
            if (res.ok) {
                fetchPersonas(true);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to set default");
            }
        } catch {
            setError("Network error setting default");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this persona?")) return;
        try {
            const res = await fetch(`/api/personas/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchPersonas(true);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to delete persona");
            }
        } catch {
            setError("Network error deleting persona");
        }
    };

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
                            <Link href="/dashboard/personas" className="text-sm font-medium text-yt-text-primary">Personas</Link>
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
                        <button onClick={handleSignOut} className="text-sm text-yt-text-secondary hover:text-yt-text-primary transition-colors cursor-pointer">Sign out</button>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 py-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-yt-text-primary mb-1">AI Personas</h1>
                        <p className="text-sm text-yt-text-secondary">Create custom personas to guide how AI generates comment replies.</p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-yt-blue hover:bg-yt-blue-hover text-yt-text-inverse px-4 py-2 rounded-full text-sm font-medium transition-colors"
                    >
                        {showForm ? "Cancel" : "+ Create Persona"}
                    </button>
                </div>

                {error && (
                    <div className="bg-yt-error-bg border border-yt-error-border text-yt-error-text text-sm rounded-lg p-4 mb-6">
                        {error}
                    </div>
                )}

                {/* Create Form */}
                {showForm && (
                    <div className="bg-yt-bg-surface border border-yt-border rounded-lg p-6 mb-8 shadow-sm">
                        <h2 className="text-lg font-semibold text-yt-text-primary mb-4">New Persona</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-yt-text-primary mb-1">Name *</label>
                                    <input required placeholder="e.g. Sarcastic Gamer" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-yt-bg-elevated border border-yt-border rounded-md text-yt-text-primary focus:outline-none focus:ring-1 focus:ring-yt-blue" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-yt-text-primary mb-1">Base Tone</label>
                                    <select value={formData.tone} onChange={e => setFormData({ ...formData, tone: e.target.value })} className="w-full px-3 py-2 bg-yt-bg-elevated border border-yt-border rounded-md text-yt-text-primary focus:outline-none focus:ring-1 focus:ring-yt-blue">
                                        <option value="friendly">Friendly</option>
                                        <option value="professional">Professional</option>
                                        <option value="humorous">Humorous</option>
                                        <option value="sarcastic">Sarcastic</option>
                                        <option value="enthusiastic">Enthusiastic</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-yt-text-primary mb-1">Emoji Style</label>
                                    <select value={formData.emojiStyle} onChange={e => setFormData({ ...formData, emojiStyle: e.target.value })} className="w-full px-3 py-2 bg-yt-bg-elevated border border-yt-border rounded-md text-yt-text-primary focus:outline-none focus:ring-1 focus:ring-yt-blue">
                                        <option value="none">None (Strict text only)</option>
                                        <option value="minimal">Minimal (1-2 max)</option>
                                        <option value="expressive">Expressive (Use freely)</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-yt-text-primary mb-1">Custom Rules & Vocabulary</label>
                                    <textarea placeholder="e.g. Always address them by their first name. Speak like a pirate." rows={2} value={formData.vocabularyRules} onChange={e => setFormData({ ...formData, vocabularyRules: e.target.value })} className="w-full px-3 py-2 bg-yt-bg-elevated border border-yt-border rounded-md text-yt-text-primary focus:outline-none focus:ring-1 focus:ring-yt-blue" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-yt-text-primary mb-1">Catchphrases</label>
                                    <textarea placeholder="e.g. 'Stay frosty!', 'See you in the next one!'" rows={2} value={formData.catchphrases} onChange={e => setFormData({ ...formData, catchphrases: e.target.value })} className="w-full px-3 py-2 bg-yt-bg-elevated border border-yt-border rounded-md text-yt-text-primary focus:outline-none focus:ring-1 focus:ring-yt-blue" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-yt-text-primary mb-1">Forbidden Words</label>
                                    <textarea placeholder="e.g. 'sorry', 'apologies', 'unfortunately'" rows={2} value={formData.forbiddenWords} onChange={e => setFormData({ ...formData, forbiddenWords: e.target.value })} className="w-full px-3 py-2 bg-yt-bg-elevated border border-yt-border rounded-md text-yt-text-primary focus:outline-none focus:ring-1 focus:ring-yt-blue" />
                                </div>
                                <div className="md:col-span-2 flex items-center gap-2 mt-2">
                                    <input type="checkbox" id="isDefault" checked={formData.isDefault} onChange={e => setFormData({ ...formData, isDefault: e.target.checked })} className="w-4 h-4 rounded border-yt-border text-yt-blue focus:ring-yt-blue" />
                                    <label htmlFor="isDefault" className="text-sm font-medium text-yt-text-primary cursor-pointer">Set as default persona immediately</label>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-yt-border mt-4">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-yt-text-secondary hover:bg-yt-bg-elevated rounded-md transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-yt-blue hover:bg-yt-blue-hover text-yt-text-inverse rounded-md transition-colors disabled:opacity-50">
                                    {isSubmitting ? "Creating..." : "Save Persona"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* List */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                        {[1, 2].map(i => <div key={i} className="h-48 bg-yt-bg-surface rounded-lg border border-yt-border"></div>)}
                    </div>
                ) : personas.length === 0 ? (
                    <div className="bg-yt-bg-surface rounded-lg border border-yt-border p-12 text-center mt-8">
                        <svg className="w-16 h-16 mx-auto text-yt-icon-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-yt-text-primary font-medium mb-1">No personas found</p>
                        <p className="text-sm text-yt-text-secondary">Create a persona to customize your AI replies.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {personas.map(persona => (
                            <div key={persona.id} className={`bg-yt-bg-surface rounded-lg border flex flex-col ${persona.isDefault ? 'border-yt-blue shadow-sm' : 'border-yt-border'}`}>
                                <div className="p-5 flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-lg font-semibold text-yt-text-primary">{persona.name}</h3>
                                        {persona.isDefault && <span className="text-xs font-bold bg-yt-blue/10 text-yt-blue px-2 py-1 rounded-full">DEFAULT</span>}
                                    </div>
                                    <div className="space-y-2 text-sm text-yt-text-secondary mb-4">
                                        {persona.tone && <p><span className="font-medium text-yt-text-primary">Tone:</span> <span className="capitalize">{persona.tone}</span></p>}
                                        {persona.emojiStyle && <p><span className="font-medium text-yt-text-primary">Emojis:</span> <span className="capitalize">{persona.emojiStyle}</span></p>}
                                        {persona.vocabularyRules && <p className="line-clamp-2"><span className="font-medium text-yt-text-primary">Rules:</span> {persona.vocabularyRules}</p>}
                                    </div>
                                </div>
                                <div className="border-t border-yt-border px-5 py-3 flex items-center justify-between bg-yt-bg-elevated rounded-b-lg">
                                    {!persona.isDefault ? (
                                        <button onClick={() => handleSetDefault(persona.id)} className="text-sm font-medium text-yt-blue hover:text-yt-blue-hover transition-colors">Set Active</button>
                                    ) : (
                                        <span className="text-sm font-medium text-yt-text-secondary">Currently Active</span>
                                    )}
                                    <button onClick={() => handleDelete(persona.id)} className="text-sm font-medium text-yt-error-text hover:text-red-400 transition-colors">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
