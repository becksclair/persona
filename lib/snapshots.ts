import type { PortableCharacterData } from "./portable-character";
import { characterToPortable, portableToCharacterUpdate } from "./character-adapter";

export type SnapshotKind = "manual" | "auto";

export interface PersonaSnapshotData extends PortableCharacterData {}

/**
 * Extracts a portable snapshot payload from a character-like object.
 * Uses the same portable fields as exports/imports to stay forward compatible.
 */
export function characterToSnapshotData(character: Record<string, unknown>): PersonaSnapshotData {
  return characterToPortable(character as never);
}

/**
 * Convert snapshot data into a DB-friendly character update shape.
 */
export function snapshotDataToCharacterUpdate(data: PersonaSnapshotData) {
  return portableToCharacterUpdate(data);
}

export function isSnapshotKind(value: unknown): value is SnapshotKind {
  return value === "manual" || value === "auto";
}
