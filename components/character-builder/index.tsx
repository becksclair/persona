"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
  History,
  Sparkle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCharacters, type Character } from "@/lib/hooks/use-characters";
import { useTemplates, type CharacterTemplate } from "@/lib/hooks/use-templates";
import { useSnapshots, type PersonaSnapshot } from "@/lib/hooks/use-snapshots";
import { type PortableCharacterData } from "@/lib/portable-character";
import { portableToCharacterUpdate } from "@/lib/character-adapter";
import { useToast } from "@/lib/hooks/use-toast";
import { TEMPLATE_ICONS } from "@/lib/templates";

import { StepBasics } from "./step-basics";
import { StepPersonality } from "./step-personality";
import { StepBackground } from "./step-background";
import { StepPresent } from "./step-present";
import { StepAdvanced } from "./step-advanced";
import { PreviewPanel } from "./preview-panel";
import { type CharacterFormData, characterFormSchema, DEFAULT_FORM_DATA, STEPS } from "./types";

const STEP_ICONS = [User, Brain, BookOpen, Clock, Settings];

interface CharacterBuilderProps {
  characterId?: string;
}

export function CharacterBuilder({ characterId }: CharacterBuilderProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [enhancingField, setEnhancingField] = useState<string | null>(null);
  const [snapshotSheetOpen, setSnapshotSheetOpen] = useState(false);
  const [newSnapshotLabel, setNewSnapshotLabel] = useState("");
  const [newSnapshotNotes, setNewSnapshotNotes] = useState("");
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  const [restoreLoadingId, setRestoreLoadingId] = useState<string | null>(null);
  const [duplicateLoadingId, setDuplicateLoadingId] = useState<string | null>(null);
  const { toast } = useToast();

  const { characters, createCharacter, updateCharacter } = useCharacters();
  const { templates, deleteTemplate, updateTemplate } = useTemplates();
  const isEditing = !!characterId;
  const {
    snapshots,
    loading: snapshotsLoading,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
  } = useSnapshots(characterId, { enabled: isEditing });

  // Template editing state
  const [editingTemplate, setEditingTemplate] = useState<CharacterTemplate | null>(null);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplateIcon, setEditTemplateIcon] = useState("📝");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const handleEditTemplate = (template: CharacterTemplate) => {
    setEditingTemplate(template);
    setEditTemplateName(template.name);
    setEditTemplateIcon(template.icon || "📝");
  };

  const handleSaveTemplateEdit = async () => {
    if (!editingTemplate || !editTemplateName.trim()) return;
    setSavingTemplate(true);
    try {
      await updateTemplate(editingTemplate.id, {
        name: editTemplateName.trim(),
        icon: editTemplateIcon,
      });
      setEditingTemplate(null);
    } catch (error) {
      console.error("Failed to update template:", error);
    } finally {
      setSavingTemplate(false);
    }
  };

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

  useEffect(() => {
    if (isEditing && name && !newSnapshotLabel) {
      setNewSnapshotLabel(`${name} checkpoint`);
    }
  }, [isEditing, name, newSnapshotLabel]);

  // Load existing character data when editing
  useEffect(() => {
    if (characterId) {
      const character = characters.find((c) => c.id === characterId);
      if (character) {
        reset(characterToFormData(character));
        setNewSnapshotLabel((prev) => prev || `${character.name} checkpoint`);
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
    [methods, setValue],
  );

  const handleCreateSnapshot = async () => {
    if (!isEditing) return;
    const label = newSnapshotLabel.trim() || `${name || "Character"} checkpoint`;
    try {
      await createSnapshot(label, newSnapshotNotes.trim() || undefined);
      toast({ title: "Checkpoint saved", description: label, variant: "success" });
      setNewSnapshotNotes("");
      setActiveSnapshotId(null);
    } catch (error) {
      console.error("Failed to create snapshot:", error);
      toast({ title: "Failed to save checkpoint", variant: "destructive" });
    }
  };

  const handleLoadSnapshot = (snapshot: PersonaSnapshot) => {
    reset(snapshotToFormData(snapshot.data));
    setCurrentStep(1);
    setActiveSnapshotId(snapshot.id);
  };

  const handleRestoreSnapshot = async (snapshot: PersonaSnapshot) => {
    setRestoreLoadingId(snapshot.id);
    try {
      const result = await restoreSnapshot(snapshot.id);
      if (result?.character) {
        reset(characterToFormData(result.character));
        setActiveSnapshotId(snapshot.id);
        toast({
          title: "Restored checkpoint",
          description: snapshot.label,
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Restore failed:", error);
      toast({ title: "Restore failed", variant: "destructive" });
    } finally {
      setRestoreLoadingId(null);
    }
  };

  const handleDuplicateSnapshot = async (snapshot: PersonaSnapshot) => {
    setDuplicateLoadingId(snapshot.id);
    try {
      const payload = snapshotToCharacterPayload(snapshot.data, snapshot.label);
      await createCharacter(payload);
      toast({
        title: "Duplicated as new character",
        description: snapshot.label,
        variant: "success",
      });
    } catch (error) {
      console.error("Duplicate failed:", error);
      toast({ title: "Duplicate failed", variant: "destructive" });
    } finally {
      setDuplicateLoadingId(null);
    }
  };

  const handleDeleteSnapshot = async (snapshot: PersonaSnapshot) => {
    if (!window.confirm(`Delete checkpoint "${snapshot.label}"? This cannot be undone.`)) return;
    try {
      await deleteSnapshot(snapshot.id);
      toast({
        title: "Checkpoint deleted",
        description: snapshot.label,
        variant: "success",
      });
      if (activeSnapshotId === snapshot.id) {
        setActiveSnapshotId(null);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

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

      if (isEditing && characterId && isDirty) {
        try {
          await createSnapshot(
            `${data.name.trim()} – before save`,
            "Auto checkpoint before saving changes",
            "auto",
          );
        } catch (error) {
          console.warn("Checkpoint capture failed:", error);
        }
      }

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
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full bg-background">
        {/* Main Builder Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" size="icon" onClick={handleCancel}>
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
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSnapshotSheetOpen(true)}
                  className="border-emerald-600/60 bg-linear-to-r from-emerald-900/70 via-slate-900/40 to-teal-800/60 text-emerald-100"
                >
                  <History className="h-4 w-4 mr-2" />
                  Checkpoints
                </Button>
              )}
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
                    !isActive && !isCompleted && "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
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
                  templates={templates}
                  onDeleteTemplate={(id) => void deleteTemplate(id)}
                  onEditTemplate={handleEditTemplate}
                />
              )}
              {currentStep === 2 && (
                <StepPersonality onEnhance={handleEnhance} enhancingField={enhancingField} />
              )}
              {currentStep === 3 && (
                <StepBackground onEnhance={handleEnhance} enhancingField={enhancingField} />
              )}
              {currentStep === 4 && (
                <StepPresent onEnhance={handleEnhance} enhancingField={enhancingField} />
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

      {/* Snapshot Sheet */}
      <Sheet open={snapshotSheetOpen} onOpenChange={setSnapshotSheetOpen}>
        <SheetContent
          side="right"
          className="w-[420px] sm:w-[470px] bg-linear-to-b from-slate-950 via-slate-900 to-emerald-950 text-slate-50"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-300" />
              Checkpoints & History
            </SheetTitle>
            <SheetDescription className="text-slate-300">
              Save labelled snapshots, load them into the form, or restore the character to a
              checkpoint.
            </SheetDescription>
          </SheetHeader>

          <div className="py-5 space-y-4">
            <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/30 p-4 shadow-inner shadow-emerald-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="snapshot-label" className="text-slate-100">
                    New checkpoint
                  </Label>
                  <p className="text-xs text-emerald-200/70">
                    Capture the current form as a restore point.
                  </p>
                </div>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-200">
                  {snapshots.length} saved
                </Badge>
              </div>
              <div className="mt-3 space-y-3">
                <Input
                  id="snapshot-label"
                  value={newSnapshotLabel}
                  onChange={(e) => setNewSnapshotLabel(e.target.value)}
                  placeholder="e.g., Sam v1.2 – tighter boundaries"
                  className="bg-slate-900/60 border-emerald-700/50 text-slate-50 placeholder:text-slate-500"
                />
                <Textarea
                  id="snapshot-notes"
                  value={newSnapshotNotes}
                  onChange={(e) => setNewSnapshotNotes(e.target.value)}
                  placeholder="Short note about what's changing"
                  rows={2}
                  className="bg-slate-900/60 border-emerald-700/50 text-slate-50 placeholder:text-slate-500"
                />
                <Button
                  type="button"
                  onClick={() => void handleCreateSnapshot()}
                  disabled={snapshotsLoading || !newSnapshotLabel.trim()}
                  className="w-full bg-emerald-600 text-emerald-50 hover:bg-emerald-500"
                >
                  {snapshotsLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkle className="h-4 w-4 mr-2" />
                  )}
                  Save checkpoint
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[60vh] pr-1">
              <div className="space-y-3">
                {snapshots.length === 0 && !snapshotsLoading && (
                  <div className="rounded-xl border border-dashed border-emerald-700/50 bg-slate-900/50 p-4 text-sm text-slate-300">
                    No checkpoints yet. Create one to start versioning this character.
                  </div>
                )}

                {snapshots.map((snapshot) => {
                  const isActive = activeSnapshotId === snapshot.id;
                  return (
                    <div
                      key={snapshot.id}
                      className={cn(
                        "rounded-xl border p-4 transition-all",
                        isActive
                          ? "border-emerald-400/70 bg-emerald-900/50 shadow-lg shadow-emerald-900/40"
                          : "border-slate-800 bg-slate-900/60 hover:border-emerald-700/60",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-50">{snapshot.label}</p>
                          <p className="text-[11px] text-slate-400">
                            {formatTimestamp(snapshot.createdAt)}
                          </p>
                          {snapshot.notes && (
                            <p className="text-xs text-slate-300/80 line-clamp-2">
                              {snapshot.notes}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "uppercase tracking-wide text-[10px]",
                            snapshot.kind === "auto"
                              ? "border-amber-400/60 text-amber-200"
                              : "border-emerald-400/60 text-emerald-200",
                          )}
                        >
                          {snapshot.kind}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLoadSnapshot(snapshot)}
                          className="border-emerald-600/60 text-emerald-100"
                        >
                          Load into form
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => void handleRestoreSnapshot(snapshot)}
                          disabled={restoreLoadingId === snapshot.id}
                          className="bg-emerald-600 text-emerald-50 hover:bg-emerald-500"
                        >
                          {restoreLoadingId === snapshot.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Clock className="h-4 w-4 mr-2" />
                          )}
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleDuplicateSnapshot(snapshot)}
                          disabled={duplicateLoadingId === snapshot.id}
                          className="text-slate-200 hover:text-emerald-100"
                        >
                          {duplicateLoadingId === snapshot.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Duplicate as new
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleDeleteSnapshot(snapshot)}
                          className="text-red-300 hover:text-red-200"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Template Edit Sheet */}
      <Sheet open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <SheetContent side="right" className="w-[400px] sm:w-[450px]">
          <SheetHeader>
            <SheetTitle>Edit Template</SheetTitle>
            <SheetDescription>Update the name and icon for this template.</SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-6">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-template-name">Template Name</Label>
              <Input
                id="edit-template-name"
                value={editTemplateName}
                onChange={(e) => setEditTemplateName(e.target.value)}
                placeholder="My Template"
              />
            </div>

            {/* Template Icon */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setEditTemplateIcon(icon)}
                    className={cn(
                      "w-10 h-10 rounded-lg border text-xl flex items-center justify-center transition-all",
                      editTemplateIcon === icon
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setEditingTemplate(null)}
              disabled={savingTemplate}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveTemplateEdit()}
              disabled={savingTemplate || !editTemplateName.trim()}
            >
              {savingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </FormProvider>
  );
}

// Helper to build AI enhancement prompts
function buildEnhancePrompt(field: keyof CharacterFormData, context: CharacterFormData): string {
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

function clampTemperature(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.7;
  return Math.max(0, Math.min(1, value));
}

function characterToFormData(character: Character): CharacterFormData {
  return {
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
    defaultTemperature: clampTemperature(character.defaultTemperature ?? 0.7),
  };
}

function snapshotToFormData(data: PortableCharacterData): CharacterFormData {
  return {
    name: data.name || "",
    avatar: data.avatar || "",
    tagline: data.tagline || "",
    archetype: data.archetype || "custom",
    tags: data.tags || [],
    personality: data.personality || "",
    toneStyle: data.toneStyle || "",
    boundaries: data.boundaries || "",
    roleRules: data.roleRules || "",
    description: data.description || "",
    background: data.background || "",
    lifeHistory: data.lifeHistory || "",
    currentContext: data.currentContext || "",
    customInstructionsLocal: data.customInstructionsLocal || "",
    nsfwEnabled: data.nsfwEnabled ?? false,
    evolveEnabled: data.evolveEnabled ?? false,
    defaultModelId: data.defaultModelId || "",
    defaultTemperature: clampTemperature(data.defaultTemperature ?? 0.7),
  };
}

function snapshotToCharacterPayload(
  data: PortableCharacterData,
  label?: string,
): Partial<Character> {
  const payload = portableToCharacterUpdate(data);
  const { ragMode: _ragMode, ...rest } = payload as Partial<Character> & { ragMode?: unknown };
  void _ragMode;
  const characterPayload: Partial<Character> = {
    ...rest,
    name: label ? `${rest.name} (${label})` : rest.name,
    createdAt: undefined,
    updatedAt: undefined,
  };
  return characterPayload;
}

function formatTimestamp(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
