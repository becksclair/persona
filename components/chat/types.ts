import type { UIMessage } from "@ai-sdk/react";

/**
 * Shared types for chat components.
 */

export interface Character {
  id: string;
  name: string;
  avatar?: string | null;
  description?: string | null;
  tagline?: string | null;
}

export interface ChatError {
  message: string;
  retryable: boolean;
}

export interface ModelSettings {
  model: string;
  provider: string;
  temperature: number;
}

/**
 * Extract text content from a UIMessage's parts.
 */
export function getMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") || ""
  );
}
