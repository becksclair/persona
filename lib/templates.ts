/**
 * Shared template utilities and types.
 * Centralizes template logic to avoid duplication and ensure consistency.
 */

import type { CharacterTemplate } from "@/lib/hooks/use-templates";
import type { CharacterFormData } from "@/components/character-builder/types";

/**
 * Fields that can be transferred from a template to a character.
 * This is the single source of truth for template-able fields.
 */
export const TEMPLATE_FIELDS = [
  "tagline",
  "personality",
  "toneStyle",
  "boundaries",
  "roleRules",
  "description",
  "background",
  "lifeHistory",
  "currentContext",
  "customInstructionsLocal",
  "defaultModelId",
] as const;

export const TEMPLATE_ARRAY_FIELDS = ["tags"] as const;

export const TEMPLATE_NUMBER_FIELDS = ["defaultTemperature"] as const;

export const TEMPLATE_BOOLEAN_FIELDS = ["nsfwEnabled", "evolveEnabled"] as const;

export type TemplateField = (typeof TEMPLATE_FIELDS)[number];
export type TemplateArrayField = (typeof TEMPLATE_ARRAY_FIELDS)[number];
export type TemplateNumberField = (typeof TEMPLATE_NUMBER_FIELDS)[number];
export type TemplateBooleanField = (typeof TEMPLATE_BOOLEAN_FIELDS)[number];

/**
 * Shared persona data structure used by both characters and templates.
 * Extract this to ensure type consistency across the codebase.
 */
export interface PersonaData {
  tagline: string | null;
  personality: string | null;
  toneStyle: string | null;
  boundaries: string | null;
  roleRules: string | null;
  description: string | null;
  background: string | null;
  lifeHistory: string | null;
  currentContext: string | null;
  customInstructionsLocal: string | null;
  tags: string[] | null;
  defaultModelId: string | null;
  defaultTemperature: number | null;
  nsfwEnabled: boolean;
  evolveEnabled: boolean;
}

/** setValue function type for applying templates */
type SetValueFn = (field: keyof CharacterFormData, value: CharacterFormData[keyof CharacterFormData]) => void;

/**
 * Apply a template's fields to a form using react-hook-form's setValue.
 * Uses the TEMPLATE_FIELDS constant to ensure all fields are handled.
 */
export function applyTemplateToForm(
  template: CharacterTemplate,
  setValue: SetValueFn
): void {
  // Apply string fields
  for (const field of TEMPLATE_FIELDS) {
    const value = template[field];
    if (value != null) {
      setValue(field, value);
    }
  }

  // Apply array fields (need to clone to avoid readonly issues)
  for (const field of TEMPLATE_ARRAY_FIELDS) {
    const value = template[field];
    if (value != null && Array.isArray(value)) {
      setValue(field, [...value]);
    }
  }

  // Apply number fields
  for (const field of TEMPLATE_NUMBER_FIELDS) {
    const value = template[field];
    if (value != null) {
      setValue(field, value);
    }
  }

  // Apply boolean fields (always set, even if false)
  for (const field of TEMPLATE_BOOLEAN_FIELDS) {
    setValue(field, template[field]);
  }
}

/**
 * Extract template-able fields from a character or template object.
 * Useful for creating templates from characters or comparing templates.
 */
export function extractPersonaData<T extends Partial<PersonaData>>(source: T): PersonaData {
  return {
    tagline: source.tagline ?? null,
    personality: source.personality ?? null,
    toneStyle: source.toneStyle ?? null,
    boundaries: source.boundaries ?? null,
    roleRules: source.roleRules ?? null,
    description: source.description ?? null,
    background: source.background ?? null,
    lifeHistory: source.lifeHistory ?? null,
    currentContext: source.currentContext ?? null,
    customInstructionsLocal: source.customInstructionsLocal ?? null,
    tags: source.tags ?? null,
    defaultModelId: source.defaultModelId ?? null,
    defaultTemperature: source.defaultTemperature ?? null,
    nsfwEnabled: source.nsfwEnabled ?? false,
    evolveEnabled: source.evolveEnabled ?? false,
  };
}

/**
 * Common emoji icons for templates.
 */
export const TEMPLATE_ICONS = [
  "📝", "💡", "⭐", "🎯", "🔥", "💎",
  "🌟", "✨", "🎨", "🧠", "💼", "❤️",
  "🚀", "🎭", "🌈", "🔮", "⚡", "🎪",
] as const;

/**
 * Get a preview summary of a template for tooltips.
 */
export function getTemplatePreview(template: CharacterTemplate): string {
  const parts: string[] = [];
  
  if (template.description) {
    parts.push(template.description.slice(0, 100) + (template.description.length > 100 ? "..." : ""));
  } else if (template.personality) {
    parts.push(template.personality.slice(0, 100) + (template.personality.length > 100 ? "..." : ""));
  }
  
  if (template.tags && template.tags.length > 0) {
    parts.push(`Tags: ${template.tags.join(", ")}`);
  }
  
  if (template.nsfwEnabled) {
    parts.push("🔞 NSFW enabled");
  }
  
  return parts.join("\n") || "No description";
}
