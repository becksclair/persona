/**
 * PortableCharacter - Export/Import format for character portability.
 * Includes all persona_fields, behavior_rules, operational_profile, and flags
 * but excludes user-specific data (id, userId, timestamps, isBuiltIn, isArchived).
 *
 * Version History:
 * - v1: Initial format (PortableCharacterV1)
 *
 * Migration Strategy:
 * - Newer versions can read older formats
 * - schemaVersion field enables forward-compatible parsing
 */

import matter from "gray-matter";
import { z } from "zod";

// Schema versioning
export const CURRENT_SCHEMA_VERSION = 1;
export const MIN_SUPPORTED_VERSION = 1;
export const PORTABLE_CHARACTER_VERSION = "PortableCharacterV1" as const;

// Character data schema (subset of full character, portable fields only)
export const PortableCharacterDataSchema = z.object({
  // Identity
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  avatar: z.string().nullable().optional(),
  tagline: z.string().max(200).nullable().optional(),
  archetype: z.string().nullable().optional(),
  systemRole: z.string().max(2000).nullable().optional(),

  // Persona fields
  description: z.string().max(2000).nullable().optional(),
  personality: z.string().max(2000).nullable().optional(),
  background: z.string().max(2000).nullable().optional(),
  lifeHistory: z.string().max(2000).nullable().optional(),
  currentContext: z.string().max(2000).nullable().optional(),

  // Behavior rules
  toneStyle: z.string().max(1000).nullable().optional(),
  boundaries: z.string().max(1000).nullable().optional(),
  roleRules: z.string().max(1000).nullable().optional(),

  // Custom instructions
  customInstructionsLocal: z.string().max(4000).nullable().optional(),

  // Tags
  tags: z.array(z.string()).nullable().optional(),

  // Operational profile
  defaultModelId: z.string().nullable().optional(),
  defaultTemperature: z.number().min(0).max(2).nullable().optional(),
  maxContextWindow: z.number().int().positive().nullable().optional(),

  // Flags
  nsfwEnabled: z.boolean().nullable().optional(),
  evolveEnabled: z.boolean().nullable().optional(),
});

export type PortableCharacterData = z.infer<typeof PortableCharacterDataSchema>;

// Full export wrapper schema with versioning
export const PortableCharacterV1Schema = z
  .object({
    // Support both string version and numeric schemaVersion
    version: z.literal(PORTABLE_CHARACTER_VERSION),
    schemaVersion: z.number().int().min(1).optional().default(1),
    exportedAt: z.string().datetime(),
    character: PortableCharacterDataSchema,
  })
  .refine((data) => isVersionSupported(data.schemaVersion ?? 1), {
    message: "Unsupported schemaVersion",
    path: ["schemaVersion"],
  });

export type PortableCharacterV1 = z.infer<typeof PortableCharacterV1Schema>;

// Type for frontmatter data in batch export format
interface PortableCharacterFrontmatter {
  characters?: unknown[];
  [key: string]: unknown;
}

// Batch export schema
export const PortableCharacterBatchSchema = z.array(PortableCharacterV1Schema);
export type PortableCharacterBatch = z.infer<typeof PortableCharacterBatchSchema>;

/**
 * Validate and parse a portable character export.
 * Returns the parsed data or throws ZodError.
 */
export function parsePortableCharacter(data: unknown): PortableCharacterV1 {
  return PortableCharacterV1Schema.parse(data);
}

/**
 * Safe validation that returns result object instead of throwing.
 */
export function validatePortableCharacter(data: unknown): {
  success: boolean;
  data?: PortableCharacterV1;
  error?: z.ZodError;
} {
  const result = PortableCharacterV1Schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate a batch of portable characters.
 */
export function validatePortableCharacterBatch(data: unknown): {
  success: boolean;
  data?: PortableCharacterV1[];
  error?: z.ZodError;
} {
  const result = PortableCharacterBatchSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Check if a schema version is supported.
 */
export function isVersionSupported(version: number): boolean {
  return version >= MIN_SUPPORTED_VERSION && version <= CURRENT_SCHEMA_VERSION;
}

/**
 * Migrate character data from older schema versions to current.
 * Currently a no-op since we only have v1, but provides the structure
 * for future migrations.
 */
export function migrateToCurrentVersion(data: PortableCharacterV1): PortableCharacterV1 {
  const version = data.schemaVersion ?? 1;

  if (!isVersionSupported(version)) {
    throw new Error(`Unsupported schemaVersion ${version}`);
  }

  if (version === CURRENT_SCHEMA_VERSION) {
    return data;
  }

  // Future migrations would be handled here:
  // if (version === 1) { data = migrateV1toV2(data); }
  // if (version === 2) { data = migrateV2toV3(data); }

  return {
    ...data,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

/**
 * Create a portable export object from character data.
 */
export function createPortableExport(character: PortableCharacterData): PortableCharacterV1 {
  return {
    version: PORTABLE_CHARACTER_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    character,
  };
}

/**
 * Create a batch export from multiple characters.
 */
export function createPortableBatchExport(
  characters: PortableCharacterData[],
): PortableCharacterBatch {
  return characters.map((character) => createPortableExport(character));
}

// Input type for extractPortableFields - accepts any object with character-like fields
interface CharacterLike {
  name: string;
  avatar?: string | null;
  tagline?: string | null;
  archetype?: string | null;
  description?: string | null;
  personality?: string | null;
  background?: string | null;
  lifeHistory?: string | null;
  currentContext?: string | null;
  toneStyle?: string | null;
  boundaries?: string | null;
  roleRules?: string | null;
  customInstructionsLocal?: string | null;
  tags?: string[] | null;
  defaultModelId?: string | null;
  defaultTemperature?: number | null;
  maxContextWindow?: number | null;
  systemRole?: string | null;
  nsfwEnabled?: boolean | null;
  evolveEnabled?: boolean | null;
}

/**
 * Extract portable fields from a full character object.
 * Strips out non-portable fields like id, userId, timestamps, etc.
 */
export function extractPortableFields(character: CharacterLike): PortableCharacterData {
  return {
    name: character.name,
    avatar: character.avatar || null,
    tagline: character.tagline || null,
    archetype: character.archetype || null,
    description: character.description || null,
    personality: character.personality || null,
    background: character.background || null,
    lifeHistory: character.lifeHistory || null,
    currentContext: character.currentContext || null,
    toneStyle: character.toneStyle || null,
    boundaries: character.boundaries || null,
    roleRules: character.roleRules || null,
    customInstructionsLocal: character.customInstructionsLocal || null,
    tags: character.tags || null,
    defaultModelId: character.defaultModelId || null,
    defaultTemperature: character.defaultTemperature ?? null,
    maxContextWindow: character.maxContextWindow ?? null,
    systemRole: character.systemRole || null,
    nsfwEnabled: character.nsfwEnabled ?? null,
    evolveEnabled: character.evolveEnabled ?? null,
  };
}

// Fields included in portable format (for documentation/reference)
export const PORTABLE_FIELDS = [
  "name",
  "avatar",
  "tagline",
  "archetype",
  "systemRole",
  "description",
  "personality",
  "background",
  "lifeHistory",
  "currentContext",
  "toneStyle",
  "boundaries",
  "roleRules",
  "customInstructionsLocal",
  "tags",
  "defaultModelId",
  "defaultTemperature",
  "maxContextWindow",
  "nsfwEnabled",
  "evolveEnabled",
] as const;

// Fields excluded from portable format
export const EXCLUDED_FIELDS = [
  "id",
  "userId",
  "isBuiltIn",
  "isArchived",
  "createdAt",
  "updatedAt",
] as const;

// Markdown helpers
const SECTION_HEADERS = {
  personality: ["## Personality", "## personality"],
  description: ["## Description", "## description"],
  background: ["## Background", "## background"],
  lifeHistory: ["## Life History", "## lifeHistory", "## Life history"],
  currentContext: ["## Current Context", "## currentContext", "## Current context"],
} as const;

function extractSection(content: string, headers: readonly string[]): string | null {
  for (const header of headers) {
    const headerIndex = content.indexOf(header);
    if (headerIndex === -1) continue;

    const startIndex = content.indexOf("\n", headerIndex);
    if (startIndex === -1) continue;

    const remaining = content.slice(startIndex + 1);
    const nextHeaderMatch = remaining.match(/^## /m);
    const endIndex = nextHeaderMatch ? nextHeaderMatch.index! : remaining.length;

    const sectionContent = remaining.slice(0, endIndex).trim();
    if (sectionContent) return sectionContent;
  }
  return null;
}

function buildMarkdownBody(character: PortableCharacterData): string {
  const sections: string[] = [];
  if (character.personality) sections.push(`## Personality\n\n${character.personality}`);
  if (character.description) sections.push(`## Description\n\n${character.description}`);
  if (character.background) sections.push(`## Background\n\n${character.background}`);
  if (character.lifeHistory) sections.push(`## Life History\n\n${character.lifeHistory}`);
  if (character.currentContext) sections.push(`## Current Context\n\n${character.currentContext}`);
  return sections.join("\n\n");
}

function splitMarkdownDocuments(md: string): string[] {
  const trimmed = md.trim();
  if (!trimmed.startsWith("---")) return [md];
  const parts = trimmed
    .split(/\r?\n(?=---)/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [md];
}

function buildPortableFromFrontmatter(
  frontmatter: Record<string, unknown>,
  body: string,
): PortableCharacterV1 {
  const sectionPersonality = extractSection(body, SECTION_HEADERS.personality);
  const sectionDescription = extractSection(body, SECTION_HEADERS.description);
  const sectionBackground = extractSection(body, SECTION_HEADERS.background);
  const sectionLifeHistory = extractSection(body, SECTION_HEADERS.lifeHistory);
  const sectionCurrentContext = extractSection(body, SECTION_HEADERS.currentContext);

  const character: PortableCharacterData = {
    name: (frontmatter.name as string) ?? (frontmatter.character as CharacterLike)?.name,
    avatar:
      (frontmatter.avatar as string) ?? (frontmatter.character as CharacterLike)?.avatar ?? null,
    tagline:
      (frontmatter.tagline as string) ?? (frontmatter.character as CharacterLike)?.tagline ?? null,
    archetype:
      (frontmatter.archetype as string) ??
      (frontmatter.character as CharacterLike)?.archetype ??
      null,
    systemRole:
      (frontmatter.systemRole as string) ??
      (frontmatter.character as CharacterLike)?.systemRole ??
      null,
    description:
      sectionDescription ??
      (frontmatter.description as string) ??
      (frontmatter.character as CharacterLike)?.description ??
      null,
    personality:
      sectionPersonality ??
      (frontmatter.personality as string) ??
      (frontmatter.character as CharacterLike)?.personality ??
      null,
    background:
      sectionBackground ??
      (frontmatter.background as string) ??
      (frontmatter.character as CharacterLike)?.background ??
      null,
    lifeHistory:
      sectionLifeHistory ??
      (frontmatter.lifeHistory as string) ??
      (frontmatter.character as CharacterLike)?.lifeHistory ??
      null,
    currentContext:
      sectionCurrentContext ??
      (frontmatter.currentContext as string) ??
      (frontmatter.character as CharacterLike)?.currentContext ??
      null,
    toneStyle:
      (frontmatter.toneStyle as string) ??
      (frontmatter.character as CharacterLike)?.toneStyle ??
      null,
    boundaries:
      (frontmatter.boundaries as string) ??
      (frontmatter.character as CharacterLike)?.boundaries ??
      null,
    roleRules:
      (frontmatter.roleRules as string) ??
      (frontmatter.character as CharacterLike)?.roleRules ??
      null,
    customInstructionsLocal:
      (frontmatter.customInstructionsLocal as string) ??
      (frontmatter.character as CharacterLike)?.customInstructionsLocal ??
      null,
    tags:
      (Array.isArray(frontmatter.tags) ? (frontmatter.tags as string[]) : null) ??
      ((frontmatter.character as CharacterLike)?.tags as string[] | null) ??
      null,
    defaultModelId:
      (frontmatter.defaultModelId as string) ??
      (frontmatter.character as CharacterLike)?.defaultModelId ??
      null,
    defaultTemperature:
      (typeof frontmatter.defaultTemperature === "number"
        ? (frontmatter.defaultTemperature as number)
        : undefined) ??
      (frontmatter.character as CharacterLike)?.defaultTemperature ??
      null,
    maxContextWindow:
      (typeof frontmatter.maxContextWindow === "number"
        ? (frontmatter.maxContextWindow as number)
        : undefined) ??
      (frontmatter.character as CharacterLike)?.maxContextWindow ??
      null,
    nsfwEnabled:
      frontmatter.nsfwEnabled === true ||
      (frontmatter.character as CharacterLike)?.nsfwEnabled === true
        ? true
        : frontmatter.nsfwEnabled === false ||
            (frontmatter.character as CharacterLike)?.nsfwEnabled === false
          ? false
          : null,
    evolveEnabled:
      frontmatter.evolveEnabled === true ||
      (frontmatter.character as CharacterLike)?.evolveEnabled === true
        ? true
        : frontmatter.evolveEnabled === false ||
            (frontmatter.character as CharacterLike)?.evolveEnabled === false
          ? false
          : null,
  } as PortableCharacterData;

  return PortableCharacterV1Schema.parse({
    version: (frontmatter.version as string) ?? PORTABLE_CHARACTER_VERSION,
    schemaVersion: (frontmatter.schemaVersion as number) ?? 1,
    exportedAt: (frontmatter.exportedAt as string) ?? new Date().toISOString(),
    character,
  });
}

/**
 * Convert a PortableCharacter export to markdown (YAML frontmatter + sections).
 */
export function portableToMarkdown(portable: PortableCharacterV1): string {
  const { character, ...meta } = portable;
  const frontmatter = { ...meta, ...character };
  const body = buildMarkdownBody(character);
  return matter.stringify(body, frontmatter);
}

/**
 * Convert multiple PortableCharacter exports to a concatenated markdown document.
 */
export function portableBatchToMarkdown(portables: PortableCharacterV1[]): string {
  const frontmatter = {
    version: "PortableCharacterBatch",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    characters: portables,
  };
  return matter.stringify("", frontmatter);
}

/**
 * Parse markdown (single document) into a PortableCharacterV1 instance.
 */
export function parsePortableMarkdown(md: string): PortableCharacterV1 {
  const { data, content } = matter(md);
  return buildPortableFromFrontmatter(data ?? {}, content ?? "");
}

/**
 * Parse concatenated markdown documents into a batch of PortableCharacterV1 instances.
 */
export function parsePortableMarkdownBatch(md: string): PortableCharacterV1[] {
  const { data } = matter(md);
  const candidates = (data as PortableCharacterFrontmatter)?.characters;
  if (Array.isArray(candidates) && candidates.length > 0) {
    return candidates.map((item) => PortableCharacterV1Schema.parse(item));
  }

  const docs = splitMarkdownDocuments(md);
  return docs.map((doc) => parsePortableMarkdown(doc));
}
