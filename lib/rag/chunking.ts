import { RAGConfigSvc } from "./config";
import { FileStorage } from "./storage";

/**
 * Text chunking utilities for RAG indexing.
 * Supports text extraction from various file formats.
 */

export interface TextChunk {
  content: string;
  index: number;
  metadata?: {
    startChar?: number;
    endChar?: number;
  };
}

/**
 * Extract text content from a file based on its type
 */
export async function extractTextFromFile(
  storagePath: string,
  fileType: string | null,
): Promise<string> {
  const buffer = await FileStorage.read(storagePath);
  const mimeType = fileType || "text/plain";

  // Text-based files
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  ) {
    return buffer.toString("utf-8");
  }

  // PDF - basic extraction (requires pdf-parse in production, for now treat as text)
  if (mimeType === "application/pdf") {
    // MVP: Return a placeholder, proper PDF parsing needs pdf-parse library
    // For now, try to extract any text-like content
    const text = buffer.toString("utf-8");
    // Filter out binary garbage, keep printable ASCII and common unicode
    return text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{2,}/g, " ");
  }

  // DOCX - basic extraction (simplified, needs mammoth in production)
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    // MVP: Try to extract plain text from the XML content
    const text = buffer.toString("utf-8");
    // Extract text between XML tags, very basic
    const matches = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    return matches
      .map((m) => m.replace(/<[^>]+>/g, ""))
      .join(" ")
      .replace(/\s{2,}/g, " ");
  }

  // Default: try as text
  return buffer.toString("utf-8");
}

/**
 * Split text into overlapping chunks for embedding
 */
export function chunkText(
  text: string,
  options?: { chunkSize?: number; overlap?: number },
): TextChunk[] {
  const chunkSize = options?.chunkSize ?? RAGConfigSvc.getChunkSize();
  const overlap = options?.overlap ?? RAGConfigSvc.getChunkOverlap();

  // Clean and normalize text
  const cleanText = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();

  // Return empty array for empty/whitespace-only text
  if (cleanText.length === 0) {
    return [];
  }

  if (cleanText.length <= chunkSize) {
    return [
      { content: cleanText, index: 0, metadata: { startChar: 0, endChar: cleanText.length } },
    ];
  }

  const chunks: TextChunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = Math.min(startIndex + chunkSize, cleanText.length);

    // Try to end at a sentence or paragraph boundary
    if (endIndex < cleanText.length) {
      const lastParagraph = cleanText.lastIndexOf("\n\n", endIndex);
      const lastSentence = cleanText.lastIndexOf(". ", endIndex);
      const lastNewline = cleanText.lastIndexOf("\n", endIndex);

      // Prefer paragraph break, then sentence, then newline
      const breakPoints = [lastParagraph, lastSentence + 1, lastNewline].filter(
        (bp) => bp > startIndex + chunkSize / 2 && bp <= endIndex,
      );

      if (breakPoints.length > 0) {
        endIndex = Math.max(...breakPoints);
      }
    }

    const content = cleanText.slice(startIndex, endIndex).trim();
    if (content.length > 0) {
      chunks.push({
        content,
        index: chunkIndex,
        metadata: { startChar: startIndex, endChar: endIndex },
      });
      chunkIndex++;
    }

    // Move forward by chunkSize - overlap
    startIndex = endIndex - overlap;
    if (startIndex >= cleanText.length - overlap) break;
  }

  return chunks;
}

/**
 * Process a file: extract text and split into chunks
 */
export async function processFileForIndexing(
  storagePath: string,
  fileType: string | null,
): Promise<TextChunk[]> {
  const text = await extractTextFromFile(storagePath, fileType);
  return chunkText(text);
}
