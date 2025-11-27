"use client";

import { useFormContext } from "react-hook-form";
import { FieldWithAI } from "./field-with-ai";
import type { CharacterFormData } from "./types";

interface StepBackgroundProps {
  onEnhance: (field: keyof CharacterFormData) => void;
  enhancingField: string | null;
}

export function StepBackground({ onEnhance, enhancingField }: StepBackgroundProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<CharacterFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Background & History</h2>
        <p className="text-sm text-muted-foreground">
          Give your character depth with a backstory
        </p>
      </div>

      <FieldWithAI
        label="Description"
        description="A brief overview of who this character is"
        register={register("description")}
        onEnhance={() => onEnhance("description")}
        enhancing={enhancingField === "description"}
        hasValue={!!watch("description")}
        multiline
        placeholder="e.g., A seasoned software architect with 15 years of experience across startups and enterprise companies..."
        rows={4}
        error={errors.description?.message}
      />

      <FieldWithAI
        label="Background"
        description="The character's professional or personal background"
        register={register("background")}
        onEnhance={() => onEnhance("background")}
        enhancing={enhancingField === "background"}
        hasValue={!!watch("background")}
        multiline
        placeholder="e.g., Started coding at 12, studied computer science at MIT, worked at Google before starting own consultancy..."
        rows={4}
        error={errors.background?.message}
      />

      <FieldWithAI
        label="Life History"
        description="Key events and experiences that shaped the character"
        register={register("lifeHistory")}
        onEnhance={() => onEnhance("lifeHistory")}
        enhancing={enhancingField === "lifeHistory"}
        hasValue={!!watch("lifeHistory")}
        multiline
        placeholder="e.g., Overcame imposter syndrome early in career. Mentored dozens of junior developers. Learned the value of work-life balance after burnout..."
        rows={4}
        error={errors.lifeHistory?.message}
      />
    </div>
  );
}
