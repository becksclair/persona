import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Personality,
  ModelSettings,
  RAGSettings,
  PersonalitySchema,
  ModelSettingsSchema,
  RAGSettingsSchema,
} from "./types";

interface AppStore {
  personalities: Personality[];
  activePersonalityId: string;
  modelSettings: ModelSettings;
  ragSettings: RAGSettings;

  // Actions
  setActivePersonality: (id: string) => void;
  updateModelSettings: (settings: Partial<ModelSettings>) => void;
  updateRAGSettings: (settings: Partial<RAGSettings>) => void;
  addPersonality: (personality: Personality) => void;
  updatePersonality: (id: string, personality: Partial<Personality>) => void;
}

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
  model: "gpt-4",
  temperature: 0.7,
  maxOutputTokens: 4096,
  streamResponse: true,
};

const DEFAULT_RAG_SETTINGS: RAGSettings = {
  enabled: false,
  contextRecall: 0.5,
  knowledgeBase: [],
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      personalities: DEFAULT_PERSONALITIES,
      activePersonalityId: "sam",
      modelSettings: DEFAULT_MODEL_SETTINGS,
      ragSettings: DEFAULT_RAG_SETTINGS,

      setActivePersonality: (id) => set({ activePersonalityId: id }),

      updateModelSettings: (settings) =>
        set((state) => {
          const newSettings = { ...state.modelSettings, ...settings };
          // Validate with Zod (optional, but good practice)
          const result = ModelSettingsSchema.safeParse(newSettings);
          if (result.success) {
            return { modelSettings: result.data };
          }
          return {};
        }),

      updateRAGSettings: (settings) =>
        set((state) => {
          const newSettings = { ...state.ragSettings, ...settings };
          const result = RAGSettingsSchema.safeParse(newSettings);
          if (result.success) {
            return { ragSettings: result.data };
          }
          return {};
        }),

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
          personalities: state.personalities.map((p) =>
            p.id === id ? { ...p, ...personality } : p,
          ),
        })),
    }),
    {
      name: "persona-storage",
    },
  ),
);
