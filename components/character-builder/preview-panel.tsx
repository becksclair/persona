"use client";

import { useFormContext } from "react-hook-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { type CharacterFormData, getAvatarColor, ARCHETYPES } from "./types";

export function PreviewPanel() {
  const { watch } = useFormContext<CharacterFormData>();

  const name = watch("name");
  const avatar = watch("avatar");
  const tagline = watch("tagline");
  const description = watch("description");
  const tags = watch("tags");
  const archetype = watch("archetype");
  const defaultTemperature = watch("defaultTemperature");
  const nsfwEnabled = watch("nsfwEnabled");

  const archetypeName = archetype && archetype !== "custom"
    ? ARCHETYPES[archetype as keyof typeof ARCHETYPES]?.name
    : "Custom";

  return (
    <div className="w-80 border-l border-border bg-muted/30 flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold">Preview</h2>
        <p className="text-xs text-muted-foreground">How your character will appear</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Card Preview */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <Avatar className="h-12 w-12 ring-2 ring-background">
                <AvatarImage src={avatar || undefined} />
                <AvatarFallback
                  className={cn(
                    getAvatarColor(name || ""),
                    "text-white text-lg font-semibold"
                  )}
                >
                  {name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{name || "Unnamed"}</h3>
                {tagline && (
                  <p className="text-sm text-muted-foreground truncate">{tagline}</p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {description || "No description yet"}
            </p>
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="text-xs text-muted-foreground space-y-2">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span>Archetype</span>
              <span className="font-medium text-foreground">{archetypeName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span>Temperature</span>
              <span className="font-medium text-foreground font-mono">
                {(defaultTemperature ?? 0.7).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span>NSFW</span>
              <span className={cn(
                "font-medium",
                nsfwEnabled ? "text-purple-400" : "text-muted-foreground"
              )}>
                {nsfwEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          {/* Field Completion */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Completion</h4>
            <FieldStatus label="Name" filled={!!name} required />
            <FieldStatus label="Tagline" filled={!!tagline} />
            <FieldStatus label="Description" filled={!!description} />
            <FieldStatus label="Personality" filled={!!watch("personality")} />
            <FieldStatus label="Background" filled={!!watch("background")} />
            <FieldStatus label="Current Context" filled={!!watch("currentContext")} />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function FieldStatus({ label, filled, required }: { label: string; filled: boolean; required?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      <span className={filled ? "text-emerald-400" : "text-muted-foreground/50"}>
        {filled ? "✓" : "○"}
      </span>
    </div>
  );
}
