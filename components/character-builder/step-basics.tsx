"use client";

import { useState, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Pencil, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldWithAI } from "./field-with-ai";
import type { CharacterTemplate } from "@/lib/hooks/use-templates";
import { applyTemplateToForm, getTemplatePreview } from "@/lib/templates";
import {
  type CharacterFormData,
  ARCHETYPES,
  TAG_OPTIONS,
  getAvatarColor,
  getArchetypeTemplate,
} from "./types";

interface StepBasicsProps {
  onEnhance: (field: keyof CharacterFormData) => void;
  enhancingField: string | null;
  templates?: CharacterTemplate[];
  onDeleteTemplate?: (id: string) => void;
  onEditTemplate?: (template: CharacterTemplate) => void;
}

export function StepBasics({ onEnhance, enhancingField, templates = [], onDeleteTemplate, onEditTemplate }: StepBasicsProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CharacterFormData>();

  const name = watch("name");
  const avatar = watch("avatar");
  const archetype = watch("archetype");
  const tags = watch("tags");
  const tagline = watch("tagline");

  // Template search state (only show search when > 6 templates)
  const [templateSearch, setTemplateSearch] = useState("");
  const showTemplateSearch = templates.length > 6;

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [templates, templateSearch]);

  const handleArchetypeChange = (id: string) => {
    setValue("archetype", id);

    // Apply template if not custom
    if (id !== "custom") {
      const template = getArchetypeTemplate(id);
      Object.entries(template).forEach(([key, value]) => {
        if (value !== undefined) {
          setValue(key as keyof CharacterFormData, value as string | string[] | boolean);
        }
      });
    }
  };

  const handleTemplateSelect = (template: CharacterTemplate) => {
    // Mark as custom archetype since we're using a user template
    setValue("archetype", "custom");
    // Use centralized utility for applying template fields
    applyTemplateToForm(template, setValue);
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = tags || [];
    if (currentTags.includes(tag)) {
      setValue("tags", currentTags.filter((t) => t !== tag));
    } else {
      setValue("tags", [...currentTags, tag]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Basic Information</h2>
        <p className="text-sm text-muted-foreground">
          Define the core identity of your character
        </p>
      </div>

      {/* Avatar Preview */}
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20 ring-2 ring-border">
          <AvatarImage src={avatar || undefined} />
          <AvatarFallback
            className={cn(getAvatarColor(name || ""), "text-white text-2xl font-bold")}
          >
            {name?.[0] || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Label className="text-sm font-medium">Avatar URL</Label>
          <Input
            {...register("avatar")}
            placeholder="https://example.com/avatar.png"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Leave empty to use generated avatar
          </p>
          {errors.avatar && (
            <p className="text-xs text-destructive">{errors.avatar.message}</p>
          )}
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          The character&apos;s name as it will appear in conversations
        </p>
        <Input
          {...register("name")}
          placeholder="e.g., Luna, Max, Dr. Smith"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Tagline */}
      <FieldWithAI
        label="Tagline"
        description="A short phrase that captures the character's essence"
        register={register("tagline")}
        onEnhance={() => onEnhance("tagline")}
        enhancing={enhancingField === "tagline"}
        hasValue={!!tagline}
        placeholder="e.g., Your friendly coding companion"
        error={errors.tagline?.message}
      />

      {/* Archetype Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Archetype</Label>
        <p className="text-xs text-muted-foreground">
          Choose a template to pre-fill fields, or start from scratch
        </p>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(ARCHETYPES).map(([id, arch]) => (
            <button
              key={id}
              type="button"
              onClick={() => handleArchetypeChange(id)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                archetype === id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-xl">{arch.icon}</span>
              <span className="text-xs font-medium text-center">{arch.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* User Templates */}
      {templates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Your Templates</Label>
              <p className="text-xs text-muted-foreground">
                Saved templates from your existing characters
              </p>
            </div>
            {showTemplateSearch && (
              <div className="relative w-40">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="h-8 pl-7 text-xs"
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {filteredTemplates.map((tmpl) => (
              <div key={tmpl.id} className="relative group">
                <button
                  type="button"
                  onClick={() => handleTemplateSelect(tmpl)}
                  title={getTemplatePreview(tmpl)}
                  className="w-full flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:border-primary/50 transition-all"
                >
                  <span className="text-xl">{tmpl.icon || "📝"}</span>
                  <span className="text-xs font-medium text-center truncate w-full">{tmpl.name}</span>
                </button>
                {/* Action buttons on hover */}
                <div className="absolute -top-1.5 -right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onEditTemplate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTemplate(tmpl);
                      }}
                      className="p-1 rounded-full bg-primary text-primary-foreground"
                      title="Edit template"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  {onDeleteTemplate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTemplate(tmpl.id);
                      }}
                      className="p-1 rounded-full bg-destructive text-destructive-foreground"
                      title="Delete template"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filteredTemplates.length === 0 && templateSearch && (
              <p className="col-span-4 text-center text-xs text-muted-foreground py-4">
                No templates match &ldquo;{templateSearch}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tags</Label>
        <p className="text-xs text-muted-foreground">
          Categorize your character for easy filtering
        </p>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((tag) => {
            const isSelected = tags?.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagToggle(tag)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground hover:bg-accent/80"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
