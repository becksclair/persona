/**
 * Character loader for built-in character definitions.
 * Supports both JSON and markdown (YAML frontmatter) formats.
 * Markdown is preferred (matches export format and human-editability).
 */

import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

// Section headers we look for in the markdown body
const SECTION_HEADERS = {
  personality: ["## Personality", "## personality"],
  description: ["## Description", "## description"],
  background: ["## Background", "## background"],
  lifeHistory: ["## Life History", "## lifeHistory", "## Life history"],
  currentContext: ["## Current Context", "## currentContext", "## Current context"],
} as const;

/**
 * Character data structure parsed from config files.
 */
export interface BuiltInCharacterData {
  // Required
  id: string;
  name: string;

  // From config
  tagline?: string | null;
  systemRole?: string | null;
  archetype?: string | null;
  toneStyle?: string | null;
  boundaries?: string | null;
  roleRules?: string | null;
  customInstructionsLocal?: string | null;
  tags?: string[] | null;
  defaultModelId?: string | null;
  defaultTemperature?: number | null;
  nsfwEnabled?: boolean;
  evolveEnabled?: boolean;

  // Text fields
  personality?: string | null;
  description?: string | null;
  background?: string | null;
  lifeHistory?: string | null;
  currentContext?: string | null;
}

/**
 * Extract a section's content from markdown body.
 * Returns the text between the header and the next ## header.
 */
function extractSection(content: string, headers: readonly string[]): string | null {
  for (const header of headers) {
    const headerIndex = content.indexOf(header);
    if (headerIndex === -1) continue;

    // Find start of content (after header line)
    const startIndex = content.indexOf("\n", headerIndex);
    if (startIndex === -1) continue;

    // Find end (next ## header or end of content)
    const remaining = content.slice(startIndex + 1);
    const nextHeaderMatch = remaining.match(/^## /m);
    const endIndex = nextHeaderMatch ? nextHeaderMatch.index! : remaining.length;

    const sectionContent = remaining.slice(0, endIndex).trim();
    if (sectionContent) return sectionContent;
  }
  return null;
}

/**
 * Parse a markdown character file (YAML frontmatter + sections).
 */
export function parseCharacterMarkdown(content: string): BuiltInCharacterData {
  const { data: frontmatter, content: body } = matter(content);

  // Required fields
  if (!frontmatter.id || typeof frontmatter.id !== "string") {
    throw new Error("Character file missing required 'id' in frontmatter");
  }
  if (!frontmatter.name || typeof frontmatter.name !== "string") {
    throw new Error("Character file missing required 'name' in frontmatter");
  }

  // Extract sections from markdown body
  const personality = extractSection(body, SECTION_HEADERS.personality);
  const description = extractSection(body, SECTION_HEADERS.description);
  const background = extractSection(body, SECTION_HEADERS.background);
  const lifeHistory = extractSection(body, SECTION_HEADERS.lifeHistory);
  const currentContext = extractSection(body, SECTION_HEADERS.currentContext);

  return {
    id: frontmatter.id,
    name: frontmatter.name,
    tagline: frontmatter.tagline ?? null,
    systemRole: frontmatter.systemRole ?? null,
    archetype: frontmatter.archetype ?? null,
    toneStyle: frontmatter.toneStyle ?? null,
    boundaries: frontmatter.boundaries ?? null,
    roleRules: frontmatter.roleRules ?? null,
    customInstructionsLocal: frontmatter.customInstructionsLocal ?? null,
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : null,
    defaultModelId: frontmatter.defaultModelId ?? null,
    defaultTemperature:
      typeof frontmatter.defaultTemperature === "number" ? frontmatter.defaultTemperature : null,
    nsfwEnabled: frontmatter.nsfwEnabled === true,
    evolveEnabled: frontmatter.evolveEnabled === true,
    // Prefer markdown body sections over frontmatter
    personality: personality ?? frontmatter.personality ?? null,
    description: description ?? frontmatter.description ?? null,
    background: background ?? frontmatter.background ?? null,
    lifeHistory: lifeHistory ?? frontmatter.lifeHistory ?? null,
    currentContext: currentContext ?? frontmatter.currentContext ?? null,
  };
}

/**
 * Parse a JSON character file.
 */
export function parseCharacterJson(content: string): BuiltInCharacterData {
  const data = JSON.parse(content);

  if (!data.id || typeof data.id !== "string") {
    throw new Error("Character file missing required 'id'");
  }
  if (!data.name || typeof data.name !== "string") {
    throw new Error("Character file missing required 'name'");
  }

  return {
    id: data.id,
    name: data.name,
    tagline: data.tagline ?? null,
    systemRole: data.systemRole ?? null,
    archetype: data.archetype ?? null,
    toneStyle: data.toneStyle ?? null,
    boundaries: data.boundaries ?? null,
    roleRules: data.roleRules ?? null,
    customInstructionsLocal: data.customInstructionsLocal ?? null,
    tags: Array.isArray(data.tags) ? data.tags : null,
    defaultModelId: data.defaultModelId ?? null,
    defaultTemperature: typeof data.defaultTemperature === "number" ? data.defaultTemperature : null,
    nsfwEnabled: data.nsfwEnabled === true,
    evolveEnabled: data.evolveEnabled === true,
    personality: data.personality ?? null,
    description: data.description ?? null,
    background: data.background ?? null,
    lifeHistory: data.lifeHistory ?? null,
    currentContext: data.currentContext ?? null,
  };
}

/**
 * Load a single character from a file (JSON or markdown).
 */
export async function loadCharacterFromFile(filePath: string): Promise<BuiltInCharacterData> {
  const content = await fs.readFile(filePath, "utf-8");

  if (filePath.endsWith(".json")) {
    return parseCharacterJson(content);
  } else if (filePath.endsWith(".md")) {
    return parseCharacterMarkdown(content);
  } else {
    throw new Error(`Unsupported file type: ${filePath}`);
  }
}

/**
 * Load a single character from a markdown file.
 * @deprecated Use loadCharacterFromFile which supports both JSON and markdown
 */
export async function loadCharacterFromMarkdown(filePath: string): Promise<BuiltInCharacterData> {
  const content = await fs.readFile(filePath, "utf-8");
  return parseCharacterMarkdown(content);
}

/**
 * Load all built-in characters from the config/characters directory.
 * Supports both .json and .md files, prefers .json if both exist.
 * Skips files starting with underscore (like _schema.md).
 */
export async function loadAllBuiltInCharacters(): Promise<BuiltInCharacterData[]> {
  const charactersDir = path.join(process.cwd(), "config", "characters");

  // Check if directory exists
  try {
    await fs.access(charactersDir);
  } catch {
    console.warn(`Characters directory not found: ${charactersDir}`);
    return [];
  }

  const files = await fs.readdir(charactersDir);

  // Prefer JSON files, fall back to markdown
  const mdFiles = files.filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  // Prefer markdown; only use JSON when no markdown sibling exists
  const mdBaseNames = new Set(mdFiles.map((f) => f.replace(".md", "")));
  const selectedFiles = [
    ...mdFiles,
    ...jsonFiles.filter((f) => !mdBaseNames.has(f.replace(".json", ""))),
  ];

  const characters: BuiltInCharacterData[] = [];
  for (const file of selectedFiles) {
    try {
      const filePath = path.join(charactersDir, file);
      const character = await loadCharacterFromFile(filePath);
      characters.push(character);
    } catch (error) {
      console.error(`Failed to load character from ${file}:`, error);
    }
  }

  return characters;
}

/**
 * Get the path to the characters config directory.
 */
export function getCharactersConfigDir(): string {
  return path.join(process.cwd(), "config", "characters");
}
