"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppStore, useChatStore } from "@/lib/store";
import { ModelService, type ModelDefinition, type ProviderStatus } from "@/lib/model-service";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  Trash2,
  FileText,
  HelpCircle,
  Search,
  MoreHorizontal,
  Copy,
  Archive,
  Pencil,
  MessageSquarePlus,
  Loader2,
  RefreshCw,
  Pause,
  Play,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCharacters } from "@/lib/hooks/use-characters";
import { useKnowledgeBase, formatFileSize, getStatusStyle } from "@/lib/hooks/use-knowledge-base";

// Avatar color mapping
function getAvatarColor(name: string): string {
  const colors = [
    "bg-linear-to-br from-violet-500 to-fuchsia-500",
    "bg-linear-to-br from-cyan-500 to-blue-500",
    "bg-linear-to-br from-emerald-500 to-teal-500",
    "bg-linear-to-br from-amber-500 to-orange-500",
    "bg-linear-to-br from-rose-500 to-pink-500",
    "bg-linear-to-br from-indigo-500 to-purple-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function SidebarRight() {
  const [searchQuery, setSearchQuery] = useState("");
  const [providerStatus, setProviderStatus] = useState<ProviderStatus[]>([]);
  const { modelSettings, updateModelSettings, ragSettings, updateRAGSettings } = useAppStore();
  const {
    characters,
    loading,
    duplicateCharacter,
    archiveCharacter,
    deleteCharacter,
    updateCharacter,
  } = useCharacters();
  const { activeCharacterId, setActiveCharacter, startNewChat } = useChatStore();
  const {
    files: kbFiles,
    stats: kbStats,
    loading: kbLoading,
    uploading: kbUploading,
    error: kbError,
    uploadFile,
    updateFile,
    deleteFile,
  } = useKnowledgeBase(activeCharacterId);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Memoize available models list
  const availableModels = useMemo(() => ModelService.getAvailableModels(), []);

  // Check provider availability on mount
  useEffect(() => {
    const checkProviders = async () => {
      try {
        const res = await fetch("/api/models?checkStatus=true");
        if (res.ok) {
          const data = await res.json();
          setProviderStatus(data.providers ?? []);
        }
      } catch {
        // Silently fail - status check is optional
      }
    };
    void checkProviders();
  }, []);

  // Get provider availability map
  const providerAvailability = useMemo(() => {
    const map = new Map<string, boolean>();
    providerStatus.forEach((p) => map.set(p.provider, p.available));
    return map;
  }, [providerStatus]);

  // Filter characters by search
  const filteredCharacters = useMemo(() => {
    if (!searchQuery) return characters;
    const q = searchQuery.toLowerCase();
    return characters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.tagline?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    );
  }, [characters, searchQuery]);

  // Get active character
  const activeCharacter = useMemo(
    () => characters.find((c) => c.id === activeCharacterId) ?? characters[0],
    [characters, activeCharacterId],
  );

  const currentRagMode: "heavy" | "light" | "ignore" =
    activeCharacter &&
    activeCharacter.ragMode &&
    ["heavy", "light", "ignore"].includes(activeCharacter.ragMode)
      ? (activeCharacter.ragMode as "heavy" | "light" | "ignore")
      : "heavy";

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    kbFiles.forEach((file) => {
      file.tags?.forEach((tag) => {
        if (tag.trim()) tagSet.add(tag.trim());
      });
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [kbFiles]);

  const handleSelectCharacter = (id: string) => {
    setActiveCharacter(id);
  };

  const handleNewChatWithCharacter = (characterId: string) => {
    startNewChat(characterId);
  };

  const handleChangeRagMode = async (mode: "heavy" | "light" | "ignore") => {
    if (!activeCharacter) return;
    try {
      await updateCharacter(activeCharacter.id, { ragMode: mode });
    } catch (error) {
      console.error("Failed to update ragMode", error);
    }
  };

  const handleDuplicate = async (id: string) => {
    await duplicateCharacter(id);
  };

  const handleArchive = async (id: string) => {
    await archiveCharacter(id);
  };

  const handleDelete = async (id: string) => {
    if (activeCharacterId === id) {
      const other = characters.find((c) => c.id !== id);
      if (other) setActiveCharacter(other.id);
    }
    await deleteCharacter(id);
  };

  return (
    <div className="flex h-full w-80 flex-col overflow-hidden border-l border-sidebar-border bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border p-4">
        <h2 className="text-base font-semibold">Character & Memory</h2>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">RAG Intensity</Label>
        <div className="inline-flex items-center rounded-full bg-sidebar-accent/60 p-0.5 text-[10px]">
          {[
            { key: "heavy" as const, label: "Heavy" },
            { key: "light" as const, label: "Light" },
            { key: "ignore" as const, label: "Ignore" },
          ].map((option) => {
            const isActive = currentRagMode === option.key;
            return (
              <button
                key={option.key}
                onClick={() => void handleChangeRagMode(option.key)}
                className={cn(
                  "px-2 py-0.5 rounded-full transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-6 p-4">
          {/* Active Character Header */}
          {activeCharacter && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border">
              <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                <AvatarImage src={activeCharacter.avatar ?? undefined} />
                <AvatarFallback
                  className={cn(getAvatarColor(activeCharacter.name), "text-white font-medium")}
                >
                  {activeCharacter.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{activeCharacter.name}</div>
                {activeCharacter.tagline && (
                  <div className="text-xs text-muted-foreground truncate">
                    {activeCharacter.tagline}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {activeCharacter.description ??
                    activeCharacter.systemRole ??
                    "A helpful AI assistant."}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-all">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleNewChatWithCharacter(activeCharacter.id)}>
                    <MessageSquarePlus className="h-4 w-4 mr-2" />
                    New Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href={`/characters/${activeCharacter.id}`}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Character
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleDuplicate(activeCharacter.id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  {!activeCharacter.isBuiltIn && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => void handleArchive(activeCharacter.id)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void handleDelete(activeCharacter.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Character Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Switch Character</Label>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search characters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-sidebar-accent/50 border-sidebar-border"
              />
            </div>
            {/* Character List */}
            <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-1">
              {loading ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </div>
              ) : filteredCharacters.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No characters found
                </div>
              ) : (
                filteredCharacters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => handleSelectCharacter(char.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
                      activeCharacterId === char.id
                        ? "bg-sidebar-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50",
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={char.avatar ?? undefined} />
                      <AvatarFallback
                        className={cn(getAvatarColor(char.name), "text-white text-xs")}
                      >
                        {char.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate flex-1">{char.name}</span>
                    {char.isBuiltIn && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary shrink-0">
                        Built-in
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <Separator className="bg-sidebar-border" />

          {/* Model Settings Section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Model Settings</Label>

            {/* Model Selection as radio-like list */}
            <div className="space-y-1 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-1 max-h-64 overflow-y-auto">
              {availableModels.map((model: ModelDefinition) => {
                const isAvailable = providerAvailability.get(model.provider) ?? true;
                return (
                  <button
                    key={model.id}
                    onClick={() => updateModelSettings({ model: model.id })}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      modelSettings.model === model.id
                        ? "bg-sidebar-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50",
                      !isAvailable && "opacity-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Availability indicator */}
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            isAvailable ? "bg-emerald-500" : "bg-red-500",
                          )}
                          title={isAvailable ? "Available" : "Unavailable"}
                        />
                        <span className="truncate font-medium">{model.name}</span>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded shrink-0",
                          model.isLocal
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-blue-500/20 text-blue-400",
                        )}
                      >
                        {model.isLocal ? "Local" : "Cloud"}
                      </span>
                    </div>
                    {/* Model metadata row */}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground ml-4">
                      <span title="Context window">
                        {ModelService.formatContextWindow(model.contextWindow)}
                      </span>
                      <span className="opacity-40">•</span>
                      <span title="Speed">{ModelService.getSpeedIndicator(model.speed)}</span>
                      <span className="opacity-40">•</span>
                      <span title="Cost">{ModelService.getCostIndicator(model.cost)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Temperature Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Temperature</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium bg-sidebar-accent px-2 py-0.5 rounded">
                    {modelSettings.temperature.toFixed(1)}
                  </span>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
              <Slider
                value={[modelSettings.temperature]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={([val]) => updateModelSettings({ temperature: val })}
                className="**:[[role=slider]]:bg-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0.0</span>
                <span>Balanced</span>
                <span>1.0</span>
              </div>
            </div>
          </div>

          <Separator className="bg-sidebar-border" />

          {/* Memory (RAG) Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Memory (RAG)</Label>
              {kbStats && (
                <span className="text-[10px] text-muted-foreground">
                  {kbStats.totalChunks} chunks
                </span>
              )}
            </div>

            {/* Knowledge Base Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Knowledge Base</Label>
                {kbStats && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1",
                      kbStats.embeddingService.available
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400",
                    )}
                  >
                    {kbStats.embeddingService.available ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Embeddings Ready
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3" /> No Embedding Service
                      </>
                    )}
                  </span>
                )}
              </div>
              <label className="border-2 border-dashed border-sidebar-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer block">
                <input
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.json,.pdf,.doc,.docx,.html,.csv,.xml"
                  disabled={kbUploading || !activeCharacterId}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadError(null);
                      try {
                        await uploadFile(file);
                      } catch (err) {
                        setUploadError(err instanceof Error ? err.message : "Upload failed");
                        // Auto-clear error after 5 seconds
                        setTimeout(() => setUploadError(null), 5000);
                      }
                      e.target.value = "";
                    }
                  }}
                />
                {kbUploading ? (
                  <>
                    <Loader2 className="h-6 w-6 mx-auto mb-2 text-primary animate-spin" />
                    <p className="text-xs text-muted-foreground">Uploading & indexing...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Upload documents (PDF, TXT, DOCX) to enhance context.
                    </p>
                    {kbStats && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Max {formatFileSize(kbStats.config.maxFileSizeBytes)} per file
                      </p>
                    )}
                  </>
                )}
              </label>

              {/* Upload Error Display */}
              {(uploadError || kbError) && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">{uploadError || kbError}</span>
                </div>
              )}

              {/* Knowledge Base Files List */}
              <div className="space-y-2">
                {kbLoading ? (
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : kbFiles.length === 0 ? (
                  <div className="text-center py-3 text-[10px] text-muted-foreground">
                    No files uploaded yet
                  </div>
                ) : (
                  kbFiles.map((file) => {
                    const statusStyle = getStatusStyle(file.status);
                    return (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-background text-xs group"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {file.status === "indexing" ? (
                            <Loader2 className="h-4 w-4 text-blue-400 animate-spin shrink-0" />
                          ) : file.status === "failed" ? (
                            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                          ) : file.status === "paused" ? (
                            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{file.fileName}</div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <span>{formatFileSize(file.fileSizeBytes)}</span>
                              {file.chunkCount !== undefined && (
                                <>
                                  <span className="opacity-40">•</span>
                                  <span>{file.chunkCount} chunks</span>
                                </>
                              )}
                            </div>
                            {file.tags && file.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {file.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-1.5 py-0.5 rounded-full bg-sidebar-accent/60 text-[9px] text-muted-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={cn("text-[9px] px-1 py-0.5 rounded", statusStyle.className)}
                          >
                            {statusStyle.label}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              {file.status === "paused" ? (
                                <DropdownMenuItem
                                  onClick={() => void updateFile(file.id, "resume")}
                                >
                                  <Play className="h-3.5 w-3.5 mr-2" />
                                  Resume
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => void updateFile(file.id, "pause")}>
                                  <Pause className="h-3.5 w-3.5 mr-2" />
                                  Pause
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => void updateFile(file.id, "reindex")}>
                                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                Re-index
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => void deleteFile(file.id, true)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Long-term Memory Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Long-term Memory</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Enable persistent memory across sessions.
                </p>
              </div>
              <Switch
                checked={ragSettings.enabled}
                onCheckedChange={(checked) => updateRAGSettings({ enabled: checked })}
              />
            </div>

            {/* Context Recall Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Context Recall</Label>
                <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-0.5 rounded">
                  {ragSettings.contextRecall > 0.7
                    ? "High"
                    : ragSettings.contextRecall > 0.3
                      ? "Medium"
                      : "Low"}
                </span>
              </div>
              <Slider
                value={[ragSettings.contextRecall]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={([val]) => updateRAGSettings({ contextRecall: val })}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Determines how much past conversation history is considered.
              </p>
            </div>

            {availableTags.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Use tags for this chat</Label>
                </div>
                <div className="flex flex-wrap gap-1">
                  {availableTags.map((tag) => {
                    const isActive = ragSettings.tagFilters.includes(tag);
                    return (
                      <Button
                        key={tag}
                        variant={isActive ? "secondary" : "outline"}
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => {
                          const next = isActive
                            ? ragSettings.tagFilters.filter((t) => t !== tag)
                            : [...ragSettings.tagFilters, tag];
                          updateRAGSettings({ tagFilters: next });
                        }}
                      >
                        {tag}
                      </Button>
                    );
                  })}
                </div>
                {ragSettings.tagFilters.length > 0 && (
                  <div className="text-[10px] text-muted-foreground/80">
                    Filtering KB to tags: {ragSettings.tagFilters.join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
