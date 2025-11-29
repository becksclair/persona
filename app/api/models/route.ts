import { NextResponse } from "next/server";
import { ModelService } from "@/lib/model-service";

/**
 * GET /api/models - List all available models with their status
 *
 * Query params:
 * - checkStatus=true: Also check provider availability (slower)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const checkStatus = url.searchParams.get("checkStatus") === "true";

  try {
    if (checkStatus) {
      // Return models with availability status
      const modelsWithStatus = await ModelService.getAvailableModelsWithStatus();
      const providers = await ModelService.checkAllProviders();

      return NextResponse.json({
        models: modelsWithStatus,
        providers,
        defaultModelId: ModelService.getDefaultModelId(),
        defaultTemperature: ModelService.getDefaultTemperature(),
      });
    }

    // Fast path: just return model definitions
    return NextResponse.json({
      models: ModelService.getAvailableModels(),
      profiles: ModelService.getModelProfiles(),
      defaultModelId: ModelService.getDefaultModelId(),
      defaultTemperature: ModelService.getDefaultTemperature(),
    });
  } catch (error) {
    console.error("[models] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
