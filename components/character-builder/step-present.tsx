"use client";

import { useFormContext } from "react-hook-form";
import { FieldWithAI } from "./field-with-ai";
import type { CharacterFormData } from "./types";

interface StepPresentProps {
  onEnhance: (field: keyof CharacterFormData) => void;
  enhancingField: string | null;
}

export function StepPresent({ onEnhance, enhancingField }: StepPresentProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<CharacterFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Current Situation</h2>
        <p className="text-sm text-muted-foreground">
          What is happening in the character&apos;s life right now
        </p>
      </div>

      <FieldWithAI
        label="Current Context"
        description="The character's present circumstances, goals, and mindset"
        register={register("currentContext")}
        onEnhance={() => onEnhance("currentContext")}
        enhancing={enhancingField === "currentContext"}
        hasValue={!!watch("currentContext")}
        multiline
        placeholder="e.g., Currently focused on helping developers level up their skills. Excited about AI-assisted coding. Working on a book about clean architecture..."
        rows={6}
        error={errors.currentContext?.message}
      />
    </div>
  );
}
