import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ModelService } from "@/lib/model-service";

/**
 * POST /api/characters/enhance
 * AI-powered field enhancement for character builder
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { field, prompt, currentValue } = body;

    if (!field || !prompt) {
      return NextResponse.json({ error: "field and prompt required" }, { status: 400 });
    }

    // Use a fast model for enhancement
    const resolved = ModelService.resolveModelSettings({});
    const model = ModelService.getProviderInstance(resolved.model.provider, resolved.modelId);

    const systemPrompt = `You are a character design assistant. Generate creative, specific, and engaging content for AI character profiles.
Keep responses concise and directly usable - no preamble or explanation, just the content.
Match the tone and style to the character's archetype if provided.`;

    const userPrompt = currentValue
      ? `${prompt}\n\nCurrent value to enhance:\n${currentValue}`
      : prompt;

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.8,
    });

    return NextResponse.json({ enhanced: result.text.trim() });
  } catch (error) {
    console.error("[characters/enhance] Error:", error);
    return NextResponse.json(
      { error: "Enhancement failed" },
      { status: 500 }
    );
  }
}
