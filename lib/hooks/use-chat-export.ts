import { useCallback } from "react";
import {
  buildExportData,
  exportToJSON,
  exportToMarkdown,
  downloadFile,
  generateExportFilename,
  type ExportOptions,
} from "@/lib/export";

interface UseChatExportOptions {
  conversationId: string | null;
  title: string | null;
  character: { id: string | null; name: string };
  model: { id: string; provider: string };
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt?: Date | string;
  }>;
}

interface UseChatExportReturn {
  /** Export chat as JSON file download */
  exportAsJSON: () => void;
  /** Export chat as Markdown file download */
  exportAsMarkdown: () => void;
  /** Export chat in specified format */
  exportAs: (format: "json" | "markdown") => void;
  /** Check if export is available (has messages) */
  canExport: boolean;
}

/**
 * Hook for exporting chat conversations to files.
 */
export function useChatExport(options: UseChatExportOptions): UseChatExportReturn {
  const { conversationId, title, character, model, messages } = options;

  const canExport = messages.length > 0;

  const getExportData = useCallback(() => {
    const exportOptions: ExportOptions = {
      conversationId,
      title,
      character,
      model,
      messages,
    };
    return buildExportData(exportOptions);
  }, [conversationId, title, character, model, messages]);

  const exportAsJSON = useCallback(() => {
    if (!canExport) return;
    const data = getExportData();
    const content = exportToJSON(data);
    const filename = generateExportFilename(character.name, "json");
    downloadFile(content, filename, "application/json");
  }, [canExport, getExportData, character.name]);

  const exportAsMarkdown = useCallback(() => {
    if (!canExport) return;
    const data = getExportData();
    const content = exportToMarkdown(data);
    const filename = generateExportFilename(character.name, "md");
    downloadFile(content, filename, "text/markdown");
  }, [canExport, getExportData, character.name]);

  const exportAs = useCallback(
    (format: "json" | "markdown") => {
      if (format === "json") {
        exportAsJSON();
      } else {
        exportAsMarkdown();
      }
    },
    [exportAsJSON, exportAsMarkdown]
  );

  return { exportAsJSON, exportAsMarkdown, exportAs, canExport };
}
