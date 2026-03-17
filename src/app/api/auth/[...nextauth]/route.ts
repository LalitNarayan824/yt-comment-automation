import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { AuthOptions } from "next-auth";
import { saveOrUpdateUser } from "@/lib/services/user.service";

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
            // On initial sign-in, persist the Google access token
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.googleId = account.providerAccountId;
            }
            if (profile) {
                token.googleId = token.googleId || profile.sub;
            }
            return token;
        },
        async session({ session, token }) {
            // Make the access token available in the session
            session.accessToken = token.accessToken as string | undefined;
            session.googleId = token.googleId as string | undefined;
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
