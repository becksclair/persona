import { useState, useCallback } from "react";
import { copyToClipboard, announceToScreenReader } from "@/lib/clipboard";

interface UseCopyOptions {
  /** Duration in ms to show "copied" state (default: 2000) */
  resetDelay?: number;
  /** Message to announce to screen readers on success */
  successMessage?: string;
}

interface UseCopyReturn {
  /** Currently copied item ID, or null if none */
  copiedId: string | null;
  /** Whether a specific ID is currently in "copied" state */
  isCopied: (id: string) => boolean;
  /** Copy text and track the ID */
  copy: (id: string, text: string) => Promise<boolean>;
  /** Reset copied state */
  reset: () => void;
}

/**
 * Hook for managing clipboard copy state with accessibility support.
 */
export function useCopy(options: UseCopyOptions = {}): UseCopyReturn {
  const { resetDelay = 2000, successMessage = "Copied to clipboard" } = options;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = useCallback(
    async (id: string, text: string): Promise<boolean> => {
      const success = await copyToClipboard(text);
      if (success) {
        setCopiedId(id);
        announceToScreenReader(successMessage);
        setTimeout(() => setCopiedId(null), resetDelay);
      }
      return success;
    },
    [resetDelay, successMessage]
  );

  const isCopied = useCallback((id: string) => copiedId === id, [copiedId]);

  const reset = useCallback(() => setCopiedId(null), []);

  return { copiedId, isCopied, copy, reset };
}
