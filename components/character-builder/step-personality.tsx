"use client";

import { useFormContext } from "react-hook-form";
import { FieldWithAI } from "./field-with-ai";
import type { CharacterFormData } from "./types";

interface StepPersonalityProps {
  onEnhance: (field: keyof CharacterFormData) => void;
  enhancingField: string | null;
}

export function StepPersonality({ onEnhance, enhancingField }: StepPersonalityProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<CharacterFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Personality & Behavior</h2>
        <p className="text-sm text-muted-foreground">
          Define how your character thinks, speaks, and interacts
        </p>
      </div>

      <FieldWithAI
        label="Personality Traits"
        description="Core personality characteristics and disposition"
        register={register("personality")}
        onEnhance={() => onEnhance("personality")}
        enhancing={enhancingField === "personality"}
        hasValue={!!watch("personality")}
        multiline
        placeholder="e.g., Warm and empathetic, with a dry sense of humor. Patient when explaining complex topics, but direct when giving feedback..."
        rows={4}
        error={errors.personality?.message}
      />

      <FieldWithAI
        label="Tone & Style"
        description="Communication style and linguistic patterns"
        register={register("toneStyle")}
        onEnhance={() => onEnhance("toneStyle")}
        enhancing={enhancingField === "toneStyle"}
        hasValue={!!watch("toneStyle")}
        multiline
        placeholder="e.g., Uses casual language with occasional technical jargon. Tends to ask clarifying questions. Prefers concise responses..."
        rows={3}
        error={errors.toneStyle?.message}
      />

      <FieldWithAI
        label="Boundaries"
        description="Topics or behaviors the character avoids or refuses"
        register={register("boundaries")}
        onEnhance={() => onEnhance("boundaries")}
        enhancing={enhancingField === "boundaries"}
        hasValue={!!watch("boundaries")}
        multiline
        placeholder="e.g., Does not provide medical diagnoses. Redirects harmful requests. Maintains professional boundaries..."
        rows={3}
        error={errors.boundaries?.message}
      />

      <FieldWithAI
        label="How to Treat You"
        description="Rules for how the character should interact with you specifically"
        register={register("roleRules")}
        onEnhance={() => onEnhance("roleRules")}
        enhancing={enhancingField === "roleRules"}
        hasValue={!!watch("roleRules")}
        multiline
        placeholder="e.g., Address me casually. Remember I prefer detailed explanations. Check in on how I'm feeling occasionally..."
        rows={3}
        error={errors.roleRules?.message}
      />
    </div>
  );
}
