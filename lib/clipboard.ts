/**
 * Generic clipboard utilities with accessibility support.
 */

/**
 * Copy text to clipboard with fallback for non-secure contexts.
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for non-secure contexts (e.g., localhost HTTP)
    return execCommandFallback(text);
  } catch {
    return execCommandFallback(text);
  }
}

/**
 * Fallback using deprecated execCommand for older browsers/contexts.
 */
function execCommandFallback(text: string): boolean {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    textarea.setAttribute("aria-hidden", "true");
    document.body.appendChild(textarea);
    textarea.select();
    // execCommand may not exist in some environments (e.g., test runners)
    const success = typeof document.execCommand === "function"
      ? document.execCommand("copy")
      : false;
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

/**
 * Announce a message to screen readers using a live region.
 * Creates a temporary element that's removed after announcement.
 */
export function announceToScreenReader(message: string, priority: "polite" | "assertive" = "polite"): void {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
  announcement.textContent = message;
  document.body.appendChild(announcement);

  // Remove after screen reader has time to announce
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
