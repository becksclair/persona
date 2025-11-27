/**
 * LM Studio API utilities
 *
 * LM Studio provides an OpenAI-compatible API at localhost:1234.
 * Model IDs vary by user installation (e.g., "qwen/qwen3-8b", "mistral/mistral-7b").
 */

export const LM_STUDIO_BASE_URL = "http://localhost:1234/v1";

export interface LmStudioModel {
  id: string;
  object: string;
  owned_by: string;
}

export interface LmStudioModelsResponse {
  data: LmStudioModel[];
  object: string;
}

/**
 * Check if LM Studio is running
 */
export async function isLmStudioAvailable(baseUrl = LM_STUDIO_BASE_URL): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${baseUrl}/models`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch available models from LM Studio
 * Returns empty array if LM Studio is not running
 */
export async function fetchLmStudioModels(
  baseUrl = LM_STUDIO_BASE_URL
): Promise<LmStudioModel[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${baseUrl}/models`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const data: LmStudioModelsResponse = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

/**
 * Get model IDs from LM Studio
 */
export async function getLmStudioModelIds(baseUrl = LM_STUDIO_BASE_URL): Promise<string[]> {
  const models = await fetchLmStudioModels(baseUrl);
  return models.map((m) => m.id);
}

/**
 * Default LM Studio model (used when LM Studio isn't available for querying)
 * Update this to match your local LM Studio installation
 */
export const DEFAULT_LM_STUDIO_MODEL = "qwen/qwen3-8b";
