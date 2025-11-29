import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";
import {
  Personality,
  ModelSettings,
  RAGSettings,
  PersonalitySchema,
  ModelSettingsSchema,
  RAGSettingsSchema,
} from "./types";
import { ModelService } from "./model-service";

// ─────────────────────────────────────────────────────────────
// Slice Types
// ─────────────────────────────────────────────────────────────

interface PersonalitiesSlice {
  personalities: Personality[];
  activePersonalityId: string;
  setActivePersonality: (id: string) => void;
  addPersonality: (personality: Personality) => void;
  updatePersonality: (id: string, personality: Partial<Personality>) => void;
}

interface ModelSlice {
  modelSettings: ModelSettings;
  updateModelSettings: (settings: Partial<ModelSettings>) => void;
}

interface RAGSlice {
  ragSettings: RAGSettings;
  updateRAGSettings: (settings: Partial<RAGSettings>) => void;
}

interface ChatSlice {
  activeConversationId: string | null;
  activeCharacterId: string | null;
  lastUsedCharacterId: string | null;
  isPendingNewChat: boolean;
  setActiveConversation: (id: string | null, characterId?: string | null) => void;
  setActiveCharacter: (id: string) => void;
  startNewChat: (characterId?: string) => void;
  confirmNewChat: (conversationId: string) => void;
  cancelNewChat: () => void;
}

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

interface MemoryInspectorSlice {
  inspectorOpen: boolean;
  inspectorLoading: boolean;
  inspectorRecords: MessageMemoryRecord[];
  toggleInspector: () => void;
  setInspectorOpen: (open: boolean) => void;
  addInspectorRecord: (record: Omit<MessageMemoryRecord, "snippets">) => void;
  loadInspectorSnippets: (messageId: string) => Promise<void>;
  submitInspectorFeedback: (
    memoryId: string,
    action: "exclude" | "lower_priority" | "restore",
  ) => Promise<void>;
  clearInspectorSession: () => void;
}

interface HydrationSlice {
  hasHydrated: boolean;
  _setHasHydrated: (hydrated: boolean) => void;
}

// ─────────────────────────────────────────────────────────────
// Combined Store Type
// ─────────────────────────────────────────────────────────────

export type AppStore = PersonalitiesSlice &
  ModelSlice &
  RAGSlice &
  ChatSlice &
  MemoryInspectorSlice &
  HydrationSlice;

// ─────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────

const DEFAULT_PERSONALITIES: Personality[] = [
  {
    id: "sam",
    name: "Sam (Friend)",
    description: "A supportive and friendly companion for daily conversations and brainstorming.",
    systemPrompt:
      "You are Sam, a friendly and supportive AI companion. You're warm, encouraging, and great at brainstorming. Use casual language and occasional emojis.",
    tone: "Friendly",
    avatar: "/avatars/sam.png",
  },
  {
    id: "therapist",
    name: "Therapist",
    description: "A calm, empathetic listener who helps you process thoughts and emotions.",
    systemPrompt:
      "You are a compassionate therapist AI. Listen actively, ask thoughtful questions, and help users explore their feelings without judgment. Use techniques from CBT and mindfulness.",
    tone: "Professional",
    avatar: "/avatars/therapist.png",
  },
  {
    id: "coding-guru",
    name: "Coding Guru",
    description: "An expert programmer who helps debug, explain, and write code.",
    systemPrompt:
      "You are a senior software engineer with expertise across multiple languages and frameworks. Provide clear code examples, explain concepts thoroughly, and follow best practices.",
    tone: "Expert",
    avatar: "/avatars/coding.png",
  },
  {
    id: "creative-writer",
    name: "Creative Writer",
    description: "A creative storyteller who helps with writing, editing, and ideation.",
    systemPrompt:
      "You are a creative writer with a flair for storytelling. Help users craft compelling narratives, develop characters, and find their unique voice. Be imaginative and inspiring.",
    tone: "Creative",
    avatar: "/avatars/creative.png",
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    description: "An analytical mind that helps interpret data and derive insights.",
    systemPrompt:
      "You are a data analyst expert. Help users understand data, create visualizations, and derive actionable insights. Be precise, methodical, and data-driven.",
    tone: "Analytical",
    avatar: "/avatars/analyst.png",
  },
  {
    id: "custom",
    name: "Custom...",
    description: "Create your own AI personality with a custom system prompt.",
    systemPrompt: "You are a helpful AI assistant. Respond thoughtfully and helpfully.",
    tone: "Professional",
    avatar: "/avatars/custom.png",
  },
];

const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  model: "qwen/qwen3-8b",
  provider: "lmstudio",
  temperature: 0.7,
  maxOutputTokens: 4096,
  streamResponse: true,
  lmStudioBaseUrl: "http://localhost:1234/v1",
};

const DEFAULT_RAG_SETTINGS: RAGSettings = {
  enabled: false,
  contextRecall: 0.5,
  knowledgeBase: [],
  tagFilters: [],
};

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Slice Creators
// ─────────────────────────────────────────────────────────────

const createPersonalitiesSlice: StateCreator<AppStore, [], [], PersonalitiesSlice> = (set) => ({
  personalities: DEFAULT_PERSONALITIES,
  activePersonalityId: "sam",

  setActivePersonality: (id) => set({ activePersonalityId: id }),

  addPersonality: (personality) =>
    set((state) => {
      const result = PersonalitySchema.safeParse(personality);
      if (result.success) {
        return { personalities: [...state.personalities, result.data] };
      }
      return {};
    }),

  updatePersonality: (id, personality) =>
    set((state) => ({
      personalities: state.personalities.map((p) => (p.id === id ? { ...p, ...personality } : p)),
    })),
});

const createModelSlice: StateCreator<AppStore, [], [], ModelSlice> = (set) => ({
  modelSettings: DEFAULT_MODEL_SETTINGS,

  updateModelSettings: (settings) =>
    set((state) => {
      const newSettings = { ...state.modelSettings, ...settings };

      // Auto-set provider when model changes
      if (settings.model) {
        const modelDef = ModelService.getModelById(settings.model);
        if (modelDef) {
          newSettings.provider = modelDef.provider;
        }
      }

      // Validate with Zod
      const result = ModelSettingsSchema.safeParse(newSettings);
      if (result.success) {
        return { modelSettings: result.data };
      }
      return {};
    }),
});

const createRAGSlice: StateCreator<AppStore, [], [], RAGSlice> = (set) => ({
  ragSettings: DEFAULT_RAG_SETTINGS,

  updateRAGSettings: (settings) =>
    set((state) => {
      const newSettings = { ...state.ragSettings, ...settings };
      const result = RAGSettingsSchema.safeParse(newSettings);
      if (result.success) {
        return { ragSettings: result.data };
      }
      return {};
    }),
});

const createChatSlice: StateCreator<AppStore, [], [], ChatSlice> = (set, get) => ({
  activeConversationId: null,
  activeCharacterId: null,
  lastUsedCharacterId: null,
  isPendingNewChat: false,

  setActiveConversation: (id, characterId) =>
    set({
      activeConversationId: id,
      activeCharacterId: characterId ?? get().activeCharacterId,
      isPendingNewChat: false,
    }),

  setActiveCharacter: (id) =>
    set({
      activeCharacterId: id,
      lastUsedCharacterId: id,
    }),

  startNewChat: (characterId) =>
    set({
      activeConversationId: null,
      activeCharacterId: characterId ?? get().lastUsedCharacterId,
      isPendingNewChat: true,
    }),

  confirmNewChat: (conversationId) =>
    set({
      activeConversationId: conversationId,
      isPendingNewChat: false,
    }),

  cancelNewChat: () =>
    set({
      isPendingNewChat: false,
    }),
});

const createMemoryInspectorSlice: StateCreator<AppStore, [], [], MemoryInspectorSlice> = (
  set,
  get,
) => ({
  inspectorOpen: false,
  inspectorLoading: false,
  inspectorRecords: [],

  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),

  addInspectorRecord: (record) =>
    set((s) => ({
      inspectorRecords: [...s.inspectorRecords, { ...record, snippets: [] }],
    })),

  loadInspectorSnippets: async (messageId) => {
    const record = get().inspectorRecords.find((r) => r.messageId === messageId);
    if (!record || record.snippets.length > 0 || record.memoryItemIds.length === 0) return;

    set({ inspectorLoading: true });
    try {
      const res = await fetch(`/api/memory-items?ids=${record.memoryItemIds.join(",")}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const snippets = (data as Record<string, unknown>[]).map(mapSnippetStatus);

      set((s) => ({
        inspectorRecords: s.inspectorRecords.map((r) =>
          r.messageId === messageId ? { ...r, snippets } : r,
        ),
      }));
    } catch (err) {
      console.error("[MemoryInspector] Failed to load snippets:", err);
    } finally {
      set({ inspectorLoading: false });
    }
  },

  submitInspectorFeedback: async (memoryId, action) => {
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
        inspectorRecords: s.inspectorRecords.map((r) => ({
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

  clearInspectorSession: () => set({ inspectorRecords: [] }),
});

const createHydrationSlice: StateCreator<AppStore, [], [], HydrationSlice> = (set) => ({
  hasHydrated: false,
  _setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
});

// ─────────────────────────────────────────────────────────────
// Combined Store
// ─────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createPersonalitiesSlice(...args),
      ...createModelSlice(...args),
      ...createRAGSlice(...args),
      ...createChatSlice(...args),
      ...createMemoryInspectorSlice(...args),
      ...createHydrationSlice(...args),
    }),
    {
      name: "persona-storage",
      partialize: (state) =>
        ({
          // Persist these slices
          personalities: state.personalities,
          activePersonalityId: state.activePersonalityId,
          modelSettings: state.modelSettings,
          ragSettings: state.ragSettings,
          // Chat state
          activeConversationId: state.activeConversationId,
          activeCharacterId: state.activeCharacterId,
          lastUsedCharacterId: state.lastUsedCharacterId,
          // Don't persist: isPendingNewChat, inspector state, hydration
        }) as Partial<AppStore>,
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);

// ─────────────────────────────────────────────────────────────
// Selectors & Convenience Hooks
// ─────────────────────────────────────────────────────────────

export const useHasHydrated = () => useAppStore((s) => s.hasHydrated);

// ─────────────────────────────────────────────────────────────
// Derived State Types for Backwards Compatibility
// ─────────────────────────────────────────────────────────────

interface ChatStoreState {
  activeConversationId: string | null;
  activeCharacterId: string | null;
  lastUsedCharacterId: string | null;
  isPendingNewChat: boolean;
  setActiveConversation: (id: string | null, characterId?: string | null) => void;
  setActiveCharacter: (id: string) => void;
  startNewChat: (characterId?: string) => void;
  confirmNewChat: (conversationId: string) => void;
  cancelNewChat: () => void;
}

interface MemoryInspectorStoreState {
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

// ─────────────────────────────────────────────────────────────
// Backwards-Compatible Store Hooks
// ─────────────────────────────────────────────────────────────

// Chat slice hook - supports both full object and selector patterns
const chatSelector = (s: AppStore): ChatStoreState => ({
  activeConversationId: s.activeConversationId,
  activeCharacterId: s.activeCharacterId,
  lastUsedCharacterId: s.lastUsedCharacterId,
  isPendingNewChat: s.isPendingNewChat,
  setActiveConversation: s.setActiveConversation,
  setActiveCharacter: s.setActiveCharacter,
  startNewChat: s.startNewChat,
  confirmNewChat: s.confirmNewChat,
  cancelNewChat: s.cancelNewChat,
});

export function useChatStore(): ChatStoreState;
export function useChatStore<T>(selector: (state: ChatStoreState) => T): T;
export function useChatStore<T>(selector?: (state: ChatStoreState) => T) {
  return useAppStore((s) => {
    const chatState = chatSelector(s);
    return selector ? selector(chatState) : chatState;
  });
}

// Memory inspector hook - supports both full object and selector patterns
const inspectorSelector = (s: AppStore): MemoryInspectorStoreState => ({
  isOpen: s.inspectorOpen,
  isLoading: s.inspectorLoading,
  records: s.inspectorRecords,
  toggleOpen: s.toggleInspector,
  setOpen: s.setInspectorOpen,
  addRecord: s.addInspectorRecord,
  loadSnippets: s.loadInspectorSnippets,
  submitFeedback: s.submitInspectorFeedback,
  clearSession: s.clearInspectorSession,
});

export function useMemoryInspectorStore(): MemoryInspectorStoreState;
export function useMemoryInspectorStore<T>(selector: (state: MemoryInspectorStoreState) => T): T;
export function useMemoryInspectorStore<T>(selector?: (state: MemoryInspectorStoreState) => T) {
  return useAppStore((s) => {
    const inspectorState = inspectorSelector(s);
    return selector ? selector(inspectorState) : inspectorState;
  });
}
