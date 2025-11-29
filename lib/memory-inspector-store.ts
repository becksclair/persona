import { create } from "zustand";

export interface MemorySnippet {
  id: string;
  content: string;
  sourceType: string;
  sourceId: string | null;
  sourceFileName?: string;
  similarity?: number;
  tags: string[] | null;
  visibilityPolicy: string;
  status: "active" | "excluded" | "low_priority";
}

export interface MessageMemoryRecord {
  messageId: string;
  role: "assistant";
  contentPreview: string;
  memoryItemIds: string[];
  snippets: MemorySnippet[];
  timestamp: Date;
}

interface MemoryInspectorState {
  isOpen: boolean;
  isLoading: boolean;
  records: MessageMemoryRecord[];

  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  addRecord: (record: Omit<MessageMemoryRecord, "snippets">) => void;
  loadSnippets: (messageId: string) => Promise<void>;
  submitFeedback: (
    memoryId: string,
    action: "exclude" | "lower_priority" | "restore",
  ) => Promise<void>;
  clearSession: () => void;
}

function mapSnippetStatus(item: Record<string, unknown>): MemorySnippet {
  const tags = item.tags as string[] | null;
  let status: "active" | "excluded" | "low_priority" = "active";
  if (item.visibility_policy === "exclude_from_rag") status = "excluded";
  else if (tags?.includes("__low_priority")) status = "low_priority";

  return {
    id: item.id as string,
    content: item.content as string,
    sourceType: item.source_type as string,
    sourceId: item.source_id as string | null,
    sourceFileName: item.source_file_name as string | undefined,
    tags,
    visibilityPolicy: item.visibility_policy as string,
    status,
  };
}

export const useMemoryInspectorStore = create<MemoryInspectorState>((set, get) => ({
  isOpen: false,
  isLoading: false,
  records: [],

  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  setOpen: (open) => set({ isOpen: open }),

  addRecord: (record) =>
    set((s) => ({
      records: [...s.records, { ...record, snippets: [] }],
    })),

  loadSnippets: async (messageId) => {
    const record = get().records.find((r) => r.messageId === messageId);
    if (!record || record.snippets.length > 0 || record.memoryItemIds.length === 0) return;

    set({ isLoading: true });
    try {
      const res = await fetch(`/api/memory-items?ids=${record.memoryItemIds.join(",")}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const snippets = (data as Record<string, unknown>[]).map(mapSnippetStatus);

      set((s) => ({
        records: s.records.map((r) => (r.messageId === messageId ? { ...r, snippets } : r)),
      }));
    } catch (err) {
      console.error("[MemoryInspector] Failed to load snippets:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  submitFeedback: async (memoryId, action) => {
    try {
      const res = await fetch(`/api/memory-items/${memoryId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Feedback failed");

      // Update local state
      const newStatus =
        action === "restore" ? "active" : action === "exclude" ? "excluded" : "low_priority";

      set((s) => ({
        records: s.records.map((r) => ({
          ...r,
          snippets: r.snippets.map((snip) =>
            snip.id === memoryId ? { ...snip, status: newStatus } : snip,
          ),
        })),
      }));
    } catch (err) {
      console.error("[MemoryInspector] Feedback failed:", err);
    }
  },

  clearSession: () => set({ records: [] }),
}));
