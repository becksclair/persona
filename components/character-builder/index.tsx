"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  User,
  Brain,
  BookOpen,
  Clock,
  Settings,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCharacters, type Character } from "@/lib/hooks/use-characters";

import { StepBasics } from "./step-basics";
import { StepPersonality } from "./step-personality";
import { StepBackground } from "./step-background";
import { StepPresent } from "./step-present";
import { StepAdvanced } from "./step-advanced";
import { PreviewPanel } from "./preview-panel";
import {
  type CharacterFormData,
  characterFormSchema,
  DEFAULT_FORM_DATA,
  STEPS,
} from "./types";

const STEP_ICONS = [User, Brain, BookOpen, Clock, Settings];

interface CharacterBuilderProps {
  characterId?: string;
}

export function CharacterBuilder({ characterId }: CharacterBuilderProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [enhancingField, setEnhancingField] = useState<string | null>(null);

  const { characters, createCharacter, updateCharacter } = useCharacters();
  const isEditing = !!characterId;

  // Initialize form with react-hook-form
  const methods = useForm<CharacterFormData>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: DEFAULT_FORM_DATA,
    mode: "onChange",
  });

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty, isValid },
  } = methods;

  const name = watch("name");

  // Load existing character data when editing
  useEffect(() => {
    if (characterId) {
      const character = characters.find((c) => c.id === characterId);
      if (character) {
        reset({
          name: character.name || "",
          avatar: character.avatar || "",
          tagline: character.tagline || "",
          archetype: character.archetype || "custom",
          tags: character.tags || [],
          personality: character.personality || "",
          toneStyle: character.toneStyle || "",
          boundaries: character.boundaries || "",
          roleRules: character.roleRules || "",
          description: character.description || "",
          background: character.background || "",
          lifeHistory: character.lifeHistory || "",
          currentContext: character.currentContext || "",
          customInstructionsLocal: character.customInstructionsLocal || "",
          nsfwEnabled: character.nsfwEnabled || false,
          evolveEnabled: character.evolveEnabled || false,
          defaultModelId: character.defaultModelId || "",
          defaultTemperature: character.defaultTemperature ?? 0.7,
        });
      }
    }
  }, [characterId, characters, reset]);

  // AI enhancement handler
  const handleEnhance = useCallback(
    async (field: keyof CharacterFormData) => {
      setEnhancingField(field);
      try {
        const formData = methods.getValues();
        const prompt = buildEnhancePrompt(field, formData);
        const currentValue = formData[field];

        const response = await fetch("/api/characters/enhance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, prompt, currentValue }),
        });

        if (response.ok) {
          const { enhanced } = await response.json();
          setValue(field, enhanced, { shouldDirty: true });
        }
      } catch (error) {
        console.error("Enhancement failed:", error);
      } finally {
        setEnhancingField(null);
      }
    },
    [methods, setValue]
  );

  // Form submission
  const onSubmit = async (data: CharacterFormData) => {
    setSaving(true);
    try {
      const characterData: Partial<Character> = {
        name: data.name.trim(),
        avatar: data.avatar || null,
        tagline: data.tagline || null,
        archetype: data.archetype || null,
        tags: data.tags.length > 0 ? data.tags : null,
        personality: data.personality || null,
        toneStyle: data.toneStyle || null,
        boundaries: data.boundaries || null,
        roleRules: data.roleRules || null,
        description: data.description || null,
        background: data.background || null,
        lifeHistory: data.lifeHistory || null,
        currentContext: data.currentContext || null,
        customInstructionsLocal: data.customInstructionsLocal || null,
        nsfwEnabled: data.nsfwEnabled,
        evolveEnabled: data.evolveEnabled,
        defaultModelId: data.defaultModelId || null,
        defaultTemperature: data.defaultTemperature,
      };

      if (isEditing && characterId) {
        await updateCharacter(characterId, characterData);
      } else {
        await createCharacter(characterData);
      }

      router.push("/characters");
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/characters");
  };

  const canProceed = currentStep === 1 ? !!name?.trim() : true;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex h-full bg-background"
      >
        {/* Main Builder Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCancel}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">
                  {isEditing ? `Edit ${name || "Character"}` : "Create Character"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !isValid}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEditing ? "Save Changes" : "Create Character"}
              </Button>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 p-4 border-b border-border bg-muted/30">
            {STEPS.map((step, index) => {
              const Icon = STEP_ICONS[index];
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    isActive && "bg-primary text-primary-foreground shadow-md",
                    isCompleted && !isActive && "bg-primary/20 text-primary",
                    !isActive && !isCompleted && "text-muted-foreground hover:bg-accent"
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline text-sm font-medium">
                    {step.title}
                  </span>
                  {index < STEPS.length - 1 && (
                    <div className="hidden sm:block w-8 h-px bg-border mx-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Step Content */}
          <ScrollArea className="flex-1">
            <div className="max-w-2xl mx-auto p-6 space-y-6">
              {currentStep === 1 && (
                <StepBasics
                  onEnhance={handleEnhance}
                  enhancingField={enhancingField}
                />
              )}
              {currentStep === 2 && (
                <StepPersonality
                  onEnhance={handleEnhance}
                  enhancingField={enhancingField}
                />
              )}
              {currentStep === 3 && (
                <StepBackground
                  onEnhance={handleEnhance}
                  enhancingField={enhancingField}
                />
              )}
              {currentStep === 4 && (
                <StepPresent
                  onEnhance={handleEnhance}
                  enhancingField={enhancingField}
                />
              )}
              {currentStep === 5 && <StepAdvanced />}
            </div>
          </ScrollArea>

          {/* Navigation */}
          <div className="flex items-center justify-between p-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              {currentStep} / {STEPS.length}
              {isDirty && <span className="ml-2 text-primary">• Unsaved</span>}
            </div>
            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={() => setCurrentStep((s) => Math.min(STEPS.length, s + 1))}
                disabled={!canProceed}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={saving || !isValid}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {isEditing ? "Save" : "Create"}
              </Button>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <PreviewPanel />
      </form>
    </FormProvider>
  );
}

// Helper to build AI enhancement prompts
function buildEnhancePrompt(
  field: keyof CharacterFormData,
  context: CharacterFormData
): string {
  const base = `Character: ${context.name || "unnamed"}\nArchetype: ${context.archetype || "custom"}\nTagline: ${context.tagline || "none"}`;

  const prompts: Partial<Record<keyof CharacterFormData, string>> = {
    tagline: `${base}\n\nGenerate a catchy, memorable tagline for this character in 5-10 words.`,
    personality: `${base}\n\nDescribe this character's personality traits in 2-3 sentences. Be specific about their disposition, quirks, and emotional tendencies.`,
    toneStyle: `${base}\n\nDescribe how this character communicates: their tone, word choice, and conversational style in 2-3 sentences.`,
    boundaries: `${base}\n\nList 2-3 topics or behaviors this character would avoid or refuse, based on their role and personality.`,
    roleRules: `${base}\n\nDescribe 2-3 specific ways this character should interact with the user, based on their relationship dynamic.`,
    description: `${base}\n\nWrite a brief 2-3 sentence description of who this character is and what they do.`,
    background: `${base}\n\nCreate a professional or personal background for this character in 2-3 sentences.`,
    lifeHistory: `${base}\n\nDescribe 2-3 key life events that shaped this character's personality and worldview.`,
    currentContext: `${base}\n\nDescribe this character's current situation, focus, and mindset in 2-3 sentences.`,
  };

  return prompts[field] ?? base;
}
