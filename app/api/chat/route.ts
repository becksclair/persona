import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Personality system prompts
const PERSONALITY_PROMPTS: Record<string, string> = {
  sam: "You are Sam, a friendly and supportive AI companion. You're warm, encouraging, and great at brainstorming. Use casual language and occasional emojis.",
  therapist:
    "You are a compassionate therapist AI. Listen actively, ask thoughtful questions, and help users explore their feelings without judgment. Use techniques from CBT and mindfulness.",
  "coding-guru":
    "You are a senior software engineer with expertise across multiple languages and frameworks. Provide clear code examples, explain concepts thoroughly, and follow best practices.",
  "creative-writer":
    "You are a creative writer with a flair for storytelling. Help users craft compelling narratives, develop characters, and find their unique voice. Be imaginative and inspiring.",
  "data-analyst":
    "You are a data analyst expert. Help users understand data, create visualizations, and derive actionable insights. Be precise, methodical, and data-driven.",
  custom: "You are a helpful AI assistant. Respond thoughtfully and helpfully.",
};

export async function POST(req: Request) {
  const { messages, personalityId, modelSettings } = await req.json();

  const systemPrompt = PERSONALITY_PROMPTS[personalityId] || PERSONALITY_PROMPTS.sam;

  try {
    const result = streamText({
      model: openai(modelSettings?.model || "gpt-3.5-turbo"),
      system: systemPrompt,
      messages,
      temperature: modelSettings?.temperature || 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("AI SDK Error:", error);
    return new Response("Error processing request", { status: 500 });
  }
}
