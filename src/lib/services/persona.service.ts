import { prisma } from "@/lib/db";

export interface CreatePersonaInput {
    name: string;
    tone?: string;
    emojiStyle?: string;
    vocabularyRules?: string;
    catchphrases?: string;
    forbiddenWords?: string;
    isDefault?: boolean;
}

export interface UpdatePersonaInput extends Partial<CreatePersonaInput> { }

/**
 * Creates a new Persona
 */
export async function createPersona(userId: string, data: CreatePersonaInput) {
    if (data.isDefault) {
        // Unset any existing default
        await prisma.persona.updateMany({
            where: { userId },
            data: { isDefault: false },
        });
    }

    return prisma.persona.create({
        data: {
            userId,
            ...data,
        },
    });
}

/**
 * Gets all Personas for a user
 */
export async function getPersonas(userId: string) {
    return prisma.persona.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });
}

/**
 * Gets the default Persona for a user
 */
export async function getDefaultPersona(userId: string) {
    return prisma.persona.findFirst({
        where: {
            userId,
            isDefault: true,
        },
    });
}

/**
 * Sets a specific Persona as the default
 */
export async function setDefaultPersona(userId: string, personaId: string) {
    // 1. Unset all defaults
    await prisma.persona.updateMany({
        where: { userId },
        data: { isDefault: false },
    });

    // 2. Set the target as default
    return prisma.persona.update({
        where: { id: personaId, userId },
        data: { isDefault: true },
    });
}

/**
 * Updates a Persona
 */
export async function updatePersona(userId: string, personaId: string, data: UpdatePersonaInput) {
    if (data.isDefault) {
        await prisma.persona.updateMany({
            where: { userId },
            data: { isDefault: false },
        });
    }

    return prisma.persona.update({
        where: { id: personaId, userId },
        data,
    });
}

/**
 * Deletes a Persona
 */
export async function deletePersona(userId: string, personaId: string) {
    return prisma.persona.delete({
        where: { id: personaId, userId },
    });
}
