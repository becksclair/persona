"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ModelService, type ModelDefinition } from "@/lib/model-service";
import type { CharacterFormData } from "./types";

export function StepAdvanced() {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<CharacterFormData>();

  const availableModels = ModelService.getAvailableModels();
  const temperature = watch("defaultTemperature");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Advanced Settings</h2>
        <p className="text-sm text-muted-foreground">
          Fine-tune model settings and special behaviors
        </p>
      </div>

      {/* Custom Instructions */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Custom Instructions</Label>
        <p className="text-xs text-muted-foreground">
          Additional instructions included in the system prompt
        </p>
        <Textarea
          {...register("customInstructionsLocal")}
          placeholder="e.g., Always format code with proper indentation. Use markdown for structured responses. Include examples when explaining concepts..."
          rows={4}
          className="resize-none font-mono text-sm"
        />
        {errors.customInstructionsLocal && (
          <p className="text-xs text-destructive">{errors.customInstructionsLocal.message}</p>
        )}
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Default Model</Label>
        <p className="text-xs text-muted-foreground">
          Preferred model for this character (can be overridden per chat)
        </p>
        <Controller
          name="defaultModelId"
          control={control}
          render={({ field }) => (
            <Select value={field.value || ""} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Use global default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Use global default</SelectItem>
                {availableModels.map((model: ModelDefinition) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span>{model.name}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          model.isLocal
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-blue-500/20 text-blue-400"
                        )}
                      >
                        {model.isLocal ? "Local" : "Cloud"}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Temperature */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Default Temperature</Label>
            <p className="text-xs text-muted-foreground">
              Controls response randomness (0 = deterministic, 1 = creative)
            </p>
          </div>
          <span className="text-sm font-mono bg-accent px-2 py-0.5 rounded">
            {temperature?.toFixed(1) ?? "0.7"}
          </span>
        </div>
        <Controller
          name="defaultTemperature"
          control={control}
          render={({ field }) => (
            <Slider
              value={[field.value ?? 0.7]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={([val]) => field.onChange(val)}
            />
          )}
        />
      </div>

      {/* Toggles */}
      <div className="space-y-4 pt-2">
        <Controller
          name="nsfwEnabled"
          control={control}
          render={({ field }) => (
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">NSFW Content</Label>
                <p className="text-xs text-muted-foreground">
                  Enable adult content generation
                </p>
              </div>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </div>
          )}
        />

        <Controller
          name="evolveEnabled"
          control={control}
          render={({ field }) => (
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Evolve Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Allow character to develop over time (future feature)
                </p>
              </div>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </div>
          )}
        />
      </div>
    </div>
  );
}
