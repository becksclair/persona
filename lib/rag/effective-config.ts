import type { ConversationRagOverrides, RAGMode } from "@/lib/types";

interface GlobalRagSource {
  enabled: boolean;
  tagFilters: string[];
}

interface RequestRagSource {
  ragMode?: RAGMode | null;
  tagFilters?: string[] | null;
}

interface CharacterRagSource {
  ragMode?: string | null;
}

export interface RagConfigSources {
  request?: RequestRagSource | null;
  conversation?: ConversationRagOverrides | null;
  character?: CharacterRagSource | null;
  global?: GlobalRagSource | null;
}

export interface EffectiveRagConfig {
  ragMode: RAGMode;
  tagFilters?: string[];
}

const VALID_RAG_MODES: readonly RAGMode[] = ["heavy", "light", "ignore"] as const;

function isValidRagMode(mode: unknown): mode is RAGMode {
  return typeof mode === "string" && (VALID_RAG_MODES as readonly string[]).includes(mode);
}

function normalizeTags(source?: string[] | null): string[] | undefined {
  if (!Array.isArray(source)) return undefined;
  const cleaned = source.map((t) => t.trim()).filter((t) => t.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function computeEffectiveRagConfig(sources: RagConfigSources): EffectiveRagConfig {
  const { request, conversation, character, global } = sources;

  const requestMode = request?.ragMode;
  const convMode = conversation?.mode;
  const charMode = character?.ragMode;

  let ragMode: RAGMode = "heavy";
  if (requestMode && isValidRagMode(requestMode)) {
    ragMode = requestMode;
  } else if (convMode && isValidRagMode(convMode)) {
    ragMode = convMode;
  } else if (charMode && isValidRagMode(charMode)) {
    ragMode = charMode;
  }

  const requestTags = normalizeTags(request?.tagFilters ?? undefined);
  const convTags = normalizeTags(conversation?.tagFilters ?? undefined);
  const globalTags = normalizeTags(global?.tagFilters ?? undefined);

  const tagFilters = requestTags ?? convTags ?? globalTags;

  return { ragMode, tagFilters };
}
