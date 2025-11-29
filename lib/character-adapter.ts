import type { InferSelectModel } from "drizzle-orm";
import { characters } from "@/lib/db/schema";
import {
  extractPortableFields,
  type PortableCharacterData,
} from "@/lib/portable-character";

export type DbCharacter = InferSelectModel<typeof characters>;

const clampTemp = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(1, value));
};

/**
 * Narrow a full DB character row to the portable persona payload.
 * Removes user-specific/internal fields.
 */
export function characterToPortable(character: DbCharacter): PortableCharacterData {
  return extractPortableFields(character);
}

/**
 * Convert portable persona data into a Character update payload suitable for DB writes.
 */
export function portableToCharacterUpdate(
  data: PortableCharacterData
): Partial<DbCharacter> {
  return {
    name: data.name,
    avatar: data.avatar ?? null,
    tagline: data.tagline ?? null,
    archetype: data.archetype ?? null,
    systemRole: data.systemRole ?? null,
    description: data.description ?? null,
    personality: data.personality ?? null,
    background: data.background ?? null,
    lifeHistory: data.lifeHistory ?? null,
    currentContext: data.currentContext ?? null,
    toneStyle: data.toneStyle ?? null,
    boundaries: data.boundaries ?? null,
    roleRules: data.roleRules ?? null,
    customInstructionsLocal: data.customInstructionsLocal ?? null,
    tags: data.tags ?? null,
    defaultModelId: data.defaultModelId ?? null,
    defaultTemperature: clampTemp(data.defaultTemperature),
    maxContextWindow: data.maxContextWindow ?? null,
    nsfwEnabled: data.nsfwEnabled ?? false,
    evolveEnabled: data.evolveEnabled ?? false,
  };
}
