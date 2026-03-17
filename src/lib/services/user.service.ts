import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

interface SaveOrUpdateUserParams {
    googleId: string;
    email: string;
    name: string;
    channelId?: string;
    accessToken?: string;
    refreshToken?: string;
}

/**
 * Creates or updates a user in the database.
 * Encrypts OAuth tokens before storage.
 */
export async function saveOrUpdateUser(params: SaveOrUpdateUserParams) {
    const { googleId, email, name, channelId, accessToken, refreshToken } = params;

    const encryptedAccessToken = accessToken ? encrypt(accessToken) : undefined;
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : undefined;

    return prisma.user.upsert({
        where: { googleId },
        update: {
            email,
            name,
            channelId: channelId ?? undefined,
            accessToken: encryptedAccessToken ?? undefined,
            refreshToken: encryptedRefreshToken ?? undefined,
        },
        create: {
            googleId,
            email,
            name,
            channelId,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
        },
    });
}

/**
 * Get a user by their Google ID.
 */
export async function getUserByGoogleId(googleId: string) {
    return prisma.user.findUnique({ where: { googleId } });
}

/**
 * Get a user by their database ID.
 */
export async function getUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
}
