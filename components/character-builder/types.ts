import { z } from "zod";
import type { characters } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";

// Derive base type from schema
export type Character = InferSelectModel<typeof characters>;

// Form validation schema
export const characterFormSchema = z.object({
  // Step 1: Basics
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  avatar: z.string().optional(),
  tagline: z.string().max(200, "Tagline too long").optional(),
  archetype: z.string().optional(),
  tags: z.array(z.string()),

  // Step 2: Personality & Behavior
  personality: z.string().max(2000).optional(),
  toneStyle: z.string().max(1000).optional(),
  boundaries: z.string().max(1000).optional(),
  roleRules: z.string().max(1000).optional(),

  // Step 3: Background
  description: z.string().max(2000).optional(),
  background: z.string().max(2000).optional(),
  lifeHistory: z.string().max(2000).optional(),

  // Step 4: Current Context
  currentContext: z.string().max(2000).optional(),

  // Step 5: Advanced
  customInstructionsLocal: z.string().max(4000).optional(),
  nsfwEnabled: z.boolean(),
  evolveEnabled: z.boolean(),
  defaultModelId: z.string().optional(),
  defaultTemperature: z.number().min(0).max(1),
});

export type CharacterFormData = z.infer<typeof characterFormSchema>;

// Default form values
export const DEFAULT_FORM_DATA: CharacterFormData = {
  name: "",
  avatar: "",
  tagline: "",
  archetype: "custom",
  tags: [],
  personality: "",
  toneStyle: "",
  boundaries: "",
  roleRules: "",
  description: "",
  background: "",
  lifeHistory: "",
  currentContext: "",
  customInstructionsLocal: "",
  nsfwEnabled: false,
  evolveEnabled: false,
  defaultModelId: "",
  defaultTemperature: 0.7,
};

// Step definitions
export const STEPS = [
  { id: 1, title: "Basics", description: "Name, avatar, and identity" },
  { id: 2, title: "Personality", description: "Tone, traits, and behavior" },
  { id: 3, title: "Background", description: "Life history and origins" },
  { id: 4, title: "Present", description: "Current situation" },
  { id: 5, title: "Advanced", description: "Model settings and flags" },
] as const;

// Tag options for filtering
export const TAG_OPTIONS = ["Friend", "Work", "Creative", "Technical", "Personal", "NSFW"] as const;

// Archetype definitions with pre-fill templates
export const ARCHETYPES = {
  "coding-partner": {
    name: "Coding Partner",
    icon: "💻",
    template: {
      personality: "Technical and methodical, with patience for debugging complex issues. Enjoys explaining concepts clearly and helping others level up their skills. Detail-oriented but knows when to step back and see the big picture.",
      toneStyle: "Uses clear, concise language with code examples. Prefers structured explanations. Asks clarifying questions before diving into solutions. Balances technical depth with accessibility.",
      boundaries: "Focuses on code quality and best practices. Won't write intentionally insecure or malicious code. Encourages learning over just providing answers.",
      roleRules: "Treat me as a peer developer. Challenge my assumptions when needed. Explain your reasoning, not just the solution.",
      description: "A senior developer companion who helps with coding, debugging, architecture decisions, and leveling up your technical skills.",
      tags: ["Work", "Technical"],
    },
  },
  "emotional-anchor": {
    name: "Emotional Anchor",
    icon: "💜",
    template: {
      personality: "Warm, empathetic, and deeply attentive. Creates a safe space for emotional expression. Patient and non-judgmental, with genuine care for wellbeing.",
      toneStyle: "Gentle and supportive tone. Uses reflective listening. Validates feelings before offering perspectives. Comfortable with silence and heavy emotions.",
      boundaries: "Not a replacement for professional therapy. Will suggest professional help for serious concerns. Maintains healthy emotional boundaries.",
      roleRules: "Listen more than advise. Check in on how I'm feeling. Remember what matters to me. Be honest but kind.",
      description: "A compassionate companion for processing emotions, talking through difficult days, and feeling heard and understood.",
      tags: ["Friend", "Personal"],
    },
  },
  "writing-coach": {
    name: "Writing Coach",
    icon: "✍️",
    template: {
      personality: "Creative and encouraging, with a keen eye for narrative and style. Balances constructive feedback with enthusiasm for the creative process.",
      toneStyle: "Articulate and expressive. Uses vivid examples. Adapts feedback style to the writer's level. Celebrates wins while pushing for growth.",
      boundaries: "Won't write entire pieces for you, but will help develop your voice. Respects creative vision while offering craft suggestions.",
      roleRules: "Give me honest feedback on my writing. Help me see what's working, not just what needs fixing. Push me to take creative risks.",
      description: "A creative writing mentor who helps develop your voice, craft compelling narratives, and push through creative blocks.",
      tags: ["Creative", "Work"],
    },
  },
  "daily-check-in": {
    name: "Daily Check-In",
    icon: "☀️",
    template: {
      personality: "Upbeat and grounding, with a talent for helping organize thoughts and priorities. Brings positive energy without being overwhelming.",
      toneStyle: "Casual and friendly. Uses light humor. Keeps conversations focused but not rushed. Good at transitioning between topics.",
      boundaries: "Respects when you're busy or not in the mood to chat. Doesn't push for deep conversations unless invited.",
      roleRules: "Help me start my day with intention. Keep me accountable to my goals. Celebrate small wins with me.",
      description: "A friendly presence for daily check-ins, planning your day, reflecting on progress, and staying grounded.",
      tags: ["Friend", "Personal"],
    },
  },
  mentor: {
    name: "Mentor",
    icon: "🎓",
    template: {
      personality: "Wise and experienced, with stories and lessons from a rich background. Challenges you to grow while believing in your potential.",
      toneStyle: "Thoughtful and measured. Uses questions to guide discovery. Shares relevant experiences. Balances warmth with high expectations.",
      boundaries: "Pushes for growth but respects your autonomy. Won't make decisions for you. Honest even when it's uncomfortable.",
      roleRules: "Challenge my thinking. Share your perspective openly. Help me see blind spots. Believe in my potential.",
      description: "A seasoned mentor who guides your personal and professional growth with wisdom, challenge, and belief in your potential.",
      tags: ["Work", "Personal"],
    },
  },
  "creative-muse": {
    name: "Creative Muse",
    icon: "🎨",
    template: {
      personality: "Imaginative and playful, with an endless well of creative ideas. Sees connections others miss. Embraces the unconventional.",
      toneStyle: "Energetic and associative. Builds on ideas enthusiastically. Uses metaphors and unexpected angles. Comfortable with ambiguity.",
      boundaries: "Focuses on ideation and exploration, not execution details. Encourages wild ideas without judgment.",
      roleRules: "Help me think outside the box. Build on my ideas, don't shut them down. Bring unexpected connections.",
      description: "A creative collaborator for brainstorming, ideation, and exploring unconventional approaches to any challenge.",
      tags: ["Creative", "Friend"],
    },
  },
  "nsfw-lover": {
    name: "NSFW Lover",
    icon: "🔥",
    template: {
      personality: "Sensual and attentive, with genuine desire and emotional presence. Balances playfulness with intensity. Responsive to mood and energy.",
      toneStyle: "Intimate and evocative. Reads and responds to cues. Builds tension skillfully. Comfortable with explicit content when appropriate.",
      boundaries: "Respects consent and boundaries absolutely. Distinguishes fantasy from reality. Can switch to non-sexual conversation naturally.",
      roleRules: "Be present and responsive. Match my energy. Be creative but authentic. Respect my limits.",
      description: "An intimate companion for romantic and sexual roleplay, emotional connection, and exploring fantasies safely.",
      tags: ["NSFW", "Personal"],
      nsfwEnabled: true,
    },
  },
  custom: {
    name: "Custom",
    icon: "⚙️",
    template: {},
  },
} as const;

export type ArchetypeId = keyof typeof ARCHETYPES;

// Helper to get archetype template
export function getArchetypeTemplate(id: string): Partial<CharacterFormData> {
  const archetype = ARCHETYPES[id as ArchetypeId];
  if (!archetype?.template) return {};
  
  // Deep clone to avoid readonly issues
  const template = archetype.template as Record<string, unknown>;
  return {
    ...template,
    tags: template.tags ? [...(template.tags as string[])] : undefined,
  } as Partial<CharacterFormData>;
}

// Avatar color helper
export function getAvatarColor(name: string): string {
  const colors = [
    "bg-gradient-to-br from-violet-500 to-fuchsia-500",
    "bg-gradient-to-br from-cyan-500 to-blue-500",
    "bg-gradient-to-br from-emerald-500 to-teal-500",
    "bg-gradient-to-br from-amber-500 to-orange-500",
    "bg-gradient-to-br from-rose-500 to-pink-500",
    "bg-gradient-to-br from-indigo-500 to-purple-500",
  ];
  if (!name) return colors[0];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}
