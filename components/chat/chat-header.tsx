"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Download, FileJson, FileText, Settings, Loader2, Brain, Sparkles } from "lucide-react";
import type { ConversationRagOverrides, RAGMode } from "@/lib/types";
import type { Character } from "./types";
import { useMemoryInspectorStore } from "@/lib/memory-inspector-store";

interface ChatHeaderProps {
  character: Character | undefined;
  isLoading: boolean;
  canExport: boolean;
  hasActiveConversation: boolean;
  overrides: ConversationRagOverrides | null;
  effectiveRagEnabled: boolean;
  effectiveRagMode: RAGMode;
  tagFilters: string[];
  availableTags: string[];
  onUpdateOverrides: (overrides: ConversationRagOverrides | null) => void;
  onExportJSON: () => void;
  onExportMarkdown: () => void;
  onOpenSettings: () => void;
}

export function ChatHeader({
  character,
  isLoading,
  canExport,
  hasActiveConversation,
  overrides,
  effectiveRagEnabled,
  effectiveRagMode,
  tagFilters,
  availableTags,
  onUpdateOverrides,
  onExportJSON,
  onExportMarkdown,
  onOpenSettings,
}: ChatHeaderProps) {
  const toggleInspector = useMemoryInspectorStore((s) => s.toggleOpen);
  const inspectorOpen = useMemoryInspectorStore((s) => s.isOpen);
  const inspectorRecords = useMemoryInspectorStore((s) => s.records);
  const recordsWithContext = inspectorRecords.filter((r) => r.memoryItemIds.length > 0);

  const hasCustomOverrides = Boolean(
    overrides &&
    (overrides.enabled !== undefined ||
      overrides.mode !== undefined ||
      (overrides.tagFilters && overrides.tagFilters.length > 0)),
  );

  return (
    <div className="flex items-center justify-between border-b p-4 shadow-sm bg-background/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
          <AvatarImage src={character?.avatar ?? undefined} />
          <AvatarFallback>{character?.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold flex items-center gap-2">
            {character?.name ?? "Assistant"}
            {isLoading ? (
              <Loader2
                className="h-3 w-3 animate-spin text-muted-foreground"
                aria-label="Loading"
              />
            ) : (
              <span
                className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"
                aria-label="Online"
              />
            )}
          </div>
          <div className="text-xs text-muted-foreground">{character?.description}</div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {hasActiveConversation && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("relative h-8 w-8", hasCustomOverrides && "text-emerald-400")}
                aria-label="Memory overrides"
              >
                <Brain className="h-4 w-4" />
                {hasCustomOverrides && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_1px_rgba(15,23,42,1)]" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <div className="space-y-3 px-1 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Memory Overrides</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px]",
                      effectiveRagEnabled
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {effectiveRagEnabled ? "On" : "Off"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Use memory for this chat</span>
                  <Switch
                    checked={effectiveRagEnabled}
                    onCheckedChange={(checked) => {
                      const next: ConversationRagOverrides = overrides
                        ? { ...overrides, enabled: checked }
                        : { enabled: checked };
                      onUpdateOverrides(next);
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Mode</span>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-muted/40 p-0.5">
                    {[
                      { key: "heavy" as RAGMode, label: "Heavy" },
                      { key: "light" as RAGMode, label: "Light" },
                      { key: "ignore" as RAGMode, label: "Ignore" },
                    ].map((option) => {
                      const isActive = effectiveRagMode === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                          onClick={() => {
                            const next: ConversationRagOverrides = overrides
                              ? { ...overrides, mode: option.key }
                              : { mode: option.key };
                            onUpdateOverrides(next);
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Ignore turns off memory for this chat and only uses the live conversation.
                  </p>
                </div>

                {availableTags.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Tag filters</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {availableTags.map((tag) => {
                        const isActive = tagFilters.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            className={cn(
                              "h-6 rounded-full border px-2 text-[10px] transition-colors",
                              isActive
                                ? "border-primary bg-primary/10 text-primary-foreground"
                                : "border-muted bg-background text-muted-foreground hover:bg-muted/60",
                            )}
                            onClick={() => {
                              const nextTags = isActive
                                ? tagFilters.filter((t) => t !== tag)
                                : [...tagFilters, tag];
                              const next: ConversationRagOverrides = overrides
                                ? { ...overrides, tagFilters: nextTags }
                                : { tagFilters: nextTags };
                              onUpdateOverrides(next);
                            }}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant="ghost"
          size="icon"
          className={cn("relative h-8 w-8", inspectorOpen && "text-primary bg-primary/10")}
          onClick={toggleInspector}
          aria-label="Toggle memory inspector"
        >
          <Sparkles className="h-4 w-4" />
          {recordsWithContext.length > 0 && !inspectorOpen && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-medium text-primary-foreground shadow-[0_0_0_1px_rgba(15,23,42,1)]">
              {recordsWithContext.length > 9 ? "9+" : recordsWithContext.length}
            </span>
          )}
        </Button>

        {canExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Export chat">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onExportMarkdown}>
                <FileText className="h-4 w-4 mr-2" />
                Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportJSON}>
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Open settings"
          onClick={onOpenSettings}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
