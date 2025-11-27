import { useEffect, useCallback } from "react";

type KeyHandler = (event: KeyboardEvent) => void;

interface ShortcutDefinition {
  /** Key to match (e.g., "C", "Enter", "Escape") */
  key: string;
  /** Require Ctrl key (Cmd on Mac) */
  ctrl?: boolean;
  /** Require Shift key */
  shift?: boolean;
  /** Require Alt key */
  alt?: boolean;
  /** Handler function */
  handler: () => void;
  /** Description for accessibility/docs */
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for managing global keyboard shortcuts.
 * Automatically cleans up event listeners on unmount.
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutDefinition[],
  options: UseKeyboardShortcutsOptions = {}
): void {
  const { enabled = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs (unless it's Escape)
      const target = event.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      for (const shortcut of shortcuts) {
        const keyMatches = event.key === shortcut.key || event.key.toUpperCase() === shortcut.key;
        const ctrlMatches = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        // Allow Escape in inputs, block other shortcuts
        if (isInput && shortcut.key !== "Escape") continue;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}

/**
 * Hook for input-specific keyboard handling.
 * Designed for textarea/input elements with configurable Enter behavior.
 */
export function useInputKeyboard(options: {
  enterSendsMessage: boolean;
  onSend: () => void;
  onBlur: () => void;
}): KeyHandler {
  const { enterSendsMessage, onSend, onBlur } = options;

  return useCallback(
    (event: KeyboardEvent) => {
      // Escape to blur
      if (event.key === "Escape") {
        onBlur();
        return;
      }

      // Enter handling
      if (event.key === "Enter") {
        const hasModifier = event.ctrlKey || event.metaKey;

        if (enterSendsMessage) {
          // Enter sends, Shift+Enter for newline
          if (!event.shiftKey && !hasModifier) {
            event.preventDefault();
            onSend();
          }
        } else {
          // Ctrl/Cmd+Enter sends
          if (hasModifier) {
            event.preventDefault();
            onSend();
          }
        }
      }
    },
    [enterSendsMessage, onSend, onBlur]
  );
}
