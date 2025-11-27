/**
 * Chat export format conversion utilities.
 */

export interface ExportMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string; // ISO UTC timestamp
}

export interface ChatExportData {
  version: 1;
  exportedAt: string; // ISO UTC
  conversation: {
    id: string | null;
    title: string | null;
    character: {
      id: string | null;
      name: string;
    };
    model: {
      id: string;
      provider: string;
    };
  };
  messages: ExportMessage[];
}

export interface ExportOptions {
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

/**
 * Build export data structure from current chat state.
 */
export function buildExportData(options: ExportOptions): ChatExportData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    conversation: {
      id: options.conversationId,
      title: options.title,
      character: options.character,
      model: options.model,
    },
    messages: options.messages.map((m) => ({
      id: m.id,
      role: m.role as ExportMessage["role"],
      content: m.content,
      createdAt: m.createdAt
        ? new Date(m.createdAt).toISOString()
        : new Date().toISOString(),
    })),
  };
}

/**
 * Export chat data to JSON format.
 */
export function exportToJSON(data: ChatExportData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Export chat data to Markdown format.
 */
export function exportToMarkdown(data: ChatExportData): string {
  const lines: string[] = [];

  // Header
  lines.push("# Chat Export");
  lines.push("");
  lines.push(`**Character:** ${data.conversation.character.name}`);
  lines.push(`**Model:** ${data.conversation.model.id} (${data.conversation.model.provider})`);
  lines.push(`**Exported:** ${data.exportedAt}`);
  if (data.conversation.title) {
    lines.push(`**Title:** ${data.conversation.title}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // Messages
  for (const msg of data.messages) {
    const roleLabel = getRoleLabel(msg.role);
    const timestamp = new Date(msg.createdAt).toLocaleString("en-US", {
      timeZone: "UTC",
      dateStyle: "short",
      timeStyle: "medium",
    });

    lines.push(`### ${roleLabel} <small>(${timestamp} UTC)</small>`);
    lines.push("");
    lines.push(msg.content);
    lines.push("");
  }

  return lines.join("\n");
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "user":
      return "👤 User";
    case "assistant":
      return "🤖 Assistant";
    case "system":
      return "⚙️ System";
    case "tool":
      return "🔧 Tool";
    default:
      return role;
  }
}
