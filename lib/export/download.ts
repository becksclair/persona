/**
 * Browser file download utilities.
 */

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Slugify a string for safe use in filenames.
 * Removes special characters, replaces spaces with hyphens, lowercases.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters except hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // Trim hyphens from ends
}

/**
 * Generate a safe filename for chat exports.
 */
export function generateExportFilename(characterName: string, format: "json" | "md"): string {
  const slug = slugify(characterName) || "chat";
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${slug}-${timestamp}.${format}`;
}
