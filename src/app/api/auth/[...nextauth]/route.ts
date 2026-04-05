import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { AuthOptions } from "next-auth";
import { saveOrUpdateUser } from "@/lib/services/user.service";

/**
 * Helper to refresh the access token with Google
 */
async function refreshAccessToken(token: any) {
    try {
        const url = "https://oauth2.googleapis.com/token";
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken,
            }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) throw refreshedTokens;

        // Optional: Sync the refreshed token back to your database here 
        // so your background ML worker always has the newest token.
        await saveOrUpdateUser({
            googleId: token.googleId,
            email: token.email || token.user?.email || "",
            name: token.name || token.user?.name || "",
            accessToken: refreshedTokens.access_token,
            // Google might not return a new refresh token; keep the old one
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        });

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        };
    } catch (error) {
        console.error("RefreshAccessTokenError:", error);
        return { ...token, error: "RefreshAccessTokenError" };
    }
}

export const authOptions: AuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope:
                        "openid email profile https://www.googleapis.com/auth/youtube.force-ssl",
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account, profile }) {
            // Initial sign-in
            if (account && profile) {
                return {
                    accessToken: account.access_token,
                    accessTokenExpires: (account.expires_at ?? 0) * 1000,
                    refreshToken: account.refresh_token,
                    googleId: account.providerAccountId,
                    user: {
                        name: profile.name,
                        email: profile.email,
                    }
                };
            }

            // Return previous token if the access token has not expired yet
            if (Date.now() < (token.accessTokenExpires as number)) {
                return token;
            }

            // Access token has expired, try to update it
            return refreshAccessToken(token);
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken as string | undefined;
            session.googleId = token.googleId as string | undefined;
            (session as any).error = token.error; // Pass error to client to handle re-login
            return session;
        },
    },
    events: {
        async signIn({ user, account }) {
            if (account && user) {
                try {
                    // Fetch channel ID from YouTube API
                    let channelId: string | undefined;
                    if (account.access_token) {
                        try {
                            const ytRes = await fetch(
                                "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
                                {
                                    headers: {
                                        Authorization: `Bearer ${account.access_token}`,
                                    },
                                }
                            );
                            if (ytRes.ok) {
                                const ytData = await ytRes.json();
                                channelId = ytData.items?.[0]?.id;
                            }
                        } catch {
                            // Silently fail — channel ID is optional
                        }
                    }

                    // Persist user to database with encrypted tokens
                    await saveOrUpdateUser({
                        googleId: account.providerAccountId,
                        email: user.email || "",
                        name: user.name || "",
                        channelId,
                        accessToken: account.access_token || undefined,
                        refreshToken: account.refresh_token || undefined,
                    });
                } catch (error) {
                    console.error("Failed to persist user:", error);
                }
            }
        },
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
