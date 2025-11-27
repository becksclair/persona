/**
 * Character fields relevant for prompt building.
 * Compatible with both DB entities (Date) and API responses (string).
 */
interface PromptCharacter {
  name?: string | null;
  tagline?: string | null;
  systemRole?: string | null;
  description?: string | null;
  personality?: string | null;
  background?: string | null;
  lifeHistory?: string | null;
  currentContext?: string | null;
  toneStyle?: string | null;
  boundaries?: string | null;
  roleRules?: string | null;
  customInstructionsLocal?: string | null;
}

/**
 * Build a system prompt from a Character entity.
 * This is used server-side to construct the system message for chat.
 */
export function buildSystemPrompt(character: PromptCharacter | null): string {
  if (!character) {
    return "You are a helpful AI assistant.";
  }

  const parts: string[] = [];

  // Core identity
  if (character.systemRole) {
    parts.push(`You are ${character.systemRole}.`);
  } else if (character.name) {
    parts.push(`You are ${character.name}.`);
  }

  // Tagline as brief descriptor
  if (character.tagline) {
    parts.push(character.tagline);
  }

  // Personality traits
  if (character.personality) {
    parts.push(character.personality);
  }

  // Background/context
  if (character.background) {
    parts.push(`Background: ${character.background}`);
  }

  // Life history for depth
  if (character.lifeHistory) {
    parts.push(character.lifeHistory);
  }

  // Current context
  if (character.currentContext) {
    parts.push(`Current context: ${character.currentContext}`);
  }

  // Tone and style
  if (character.toneStyle) {
    parts.push(`Communication style: ${character.toneStyle}`);
  }

  // Boundaries and constraints
  if (character.boundaries) {
    parts.push(`Boundaries: ${character.boundaries}`);
  }

  // Role-specific rules
  if (character.roleRules) {
    parts.push(character.roleRules);
  }

  // Custom instructions
  if (character.customInstructionsLocal) {
    parts.push(character.customInstructionsLocal);
  }

  // Description as fallback
  if (parts.length <= 1 && character.description) {
    parts.push(character.description);
  }

  return parts.join(" ") || "You are a helpful AI assistant.";
}

/**
 * Fallback prompts for built-in characters when DB is unavailable.
 */
export const FALLBACK_PROMPTS: Record<string, string> = {
  sam: "You are Sam, a friendly and supportive AI companion. You're warm, encouraging, and great at brainstorming. Use casual language and occasional emojis.",
  therapist:
    "You are a compassionate therapist AI. Listen actively, ask thoughtful questions, and help users explore their feelings without judgment. Use techniques from CBT and mindfulness.",
  "coding-guru":
    "You are a senior software engineer with expertise across multiple languages and frameworks. Provide clear code examples, explain concepts thoroughly, and follow best practices.",
  "creative-writer":
    "You are a creative writer with a flair for storytelling. Help users craft compelling narratives, develop characters, and find their unique voice. Be imaginative and inspiring.",
  "data-analyst":
    "You are a data analyst expert. Help users understand data, create visualizations, and derive actionable insights. Be precise, methodical, and data-driven.",
  custom: "You are a helpful AI assistant. Respond thoughtfully and helpfully.",
};
