"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { KB_TAG_PRESETS, getTagColor } from "@/lib/config/kb-tags";
import { useTagManager } from "@/lib/hooks/use-tag-manager";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  customTagInput: string;
  onCustomTagInputChange: (value: string) => void;
  onAddCustomTag: () => void;
  onAddPreset: (id: string) => void;
  onRemoveTag: (tag: string) => void;
  hasTag: (tag: string) => boolean;
  showCurrentTags?: boolean;
  showLabel?: boolean;
  compact?: boolean;
}

export function TagInput({
  tags,
  customTagInput,
  onCustomTagInputChange,
  onAddCustomTag,
  onAddPreset,
  onRemoveTag,
  hasTag,
  showCurrentTags = true,
  showLabel = true,
  compact = false,
}: TagInputProps) {
  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {/* Current tags */}
      {showCurrentTags && (
        <div className="space-y-2">
          {showLabel && <Label>Current Tags</Label>}
          <div
            className={cn(
              "flex flex-wrap gap-1.5 min-h-8 p-2 rounded-lg border border-border bg-muted/30",
              compact && "min-h-6 p-1.5",
            )}
          >
            {tags.length === 0 ? (
              <span className="text-xs text-muted-foreground">No tags</span>
            ) : (
              tags.map((tag) => (
                <Badge key={tag} variant="secondary" className={cn("gap-1 pr-1", getTagColor(tag))}>
                  {tag}
                  <button
                    type="button"
                    onClick={() => onRemoveTag(tag)}
                    className="ml-0.5 rounded-full hover:bg-background/50 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>
      )}

      {/* Preset tags */}
      <div className="space-y-2">
        {showLabel && <Label>Quick Add</Label>}
        <div className="flex flex-wrap gap-1.5">
          {KB_TAG_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isActive = hasTag(preset.id);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onAddPreset(preset.id)}
                disabled={isActive}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                  isActive
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : cn(preset.color, "hover:opacity-80"),
                )}
              >
                <Icon className="h-3 w-3" />
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom tag input */}
      <div className="space-y-2">
        {showLabel && <Label>Custom Tag</Label>}
        <div className="flex gap-2">
          <Input
            value={customTagInput}
            onChange={(e) => onCustomTagInputChange(e.target.value)}
            placeholder="Enter custom tag..."
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAddCustomTag())}
            className={cn(compact && "h-8")}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onAddCustomTag}
            disabled={!customTagInput.trim()}
            className={cn(compact && "h-8 w-8")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Convenience wrapper that manages its own state
interface TagInputWithStateProps {
  initialTags?: string[];
  onChange?: (tags: string[]) => void;
  showCurrentTags?: boolean;
  showLabel?: boolean;
  compact?: boolean;
}

export function TagInputWithState({
  initialTags = [],
  onChange,
  ...props
}: TagInputWithStateProps) {
  const tagManager = useTagManager({ initialTags, onChange });

  return (
    <TagInput
      tags={tagManager.tags}
      onTagsChange={tagManager.setTags}
      customTagInput={tagManager.customTagInput}
      onCustomTagInputChange={tagManager.setCustomTagInput}
      onAddCustomTag={tagManager.addCustomTag}
      onAddPreset={tagManager.addTag}
      onRemoveTag={tagManager.removeTag}
      hasTag={tagManager.hasTag}
      {...props}
    />
  );
}
