"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { AVAILABLE_MODELS } from "@/lib/types";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCharacters } from "@/lib/hooks/use-characters";
import { useChatStore } from "@/lib/chat-store";

// Mock uploaded documents (to be replaced with real KB files later)
const UPLOADED_DOCS = [
  { id: "1", name: "Marketing_Strategy_Q3.pdf" },
  { id: "2", name: "Company_Guidelines.docx" },
];

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
  const { modelSettings, updateModelSettings, ragSettings, updateRAGSettings } = useAppStore();
  const { characters, loading, duplicateCharacter, archiveCharacter, deleteCharacter } =
    useCharacters();
  const { activeCharacterId, setActiveCharacter, startNewChat } = useChatStore();

  // Filter characters by search
  const filteredCharacters = useMemo(() => {
    if (!searchQuery) return characters;
    const q = searchQuery.toLowerCase();
    return characters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.tagline?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [characters, searchQuery]);

  // Get active character
  const activeCharacter = useMemo(
    () => characters.find((c) => c.id === activeCharacterId) ?? characters[0],
    [characters, activeCharacterId]
  );

  const handleSelectCharacter = (id: string) => {
    setActiveCharacter(id);
  };

  const handleNewChatWithCharacter = (characterId: string) => {
    startNewChat(characterId);
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

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-6 p-4">
          {/* Active Character Header */}
          {activeCharacter && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border">
              <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                <AvatarImage src={activeCharacter.avatar ?? undefined} />
                <AvatarFallback className={cn(getAvatarColor(activeCharacter.name), "text-white font-medium")}>
                  {activeCharacter.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{activeCharacter.name}</div>
                {activeCharacter.tagline && (
                  <div className="text-xs text-muted-foreground truncate">{activeCharacter.tagline}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {activeCharacter.description ?? activeCharacter.systemRole ?? "A helpful AI assistant."}
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
                  <DropdownMenuItem disabled>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Character
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
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={char.avatar ?? undefined} />
                      <AvatarFallback className={cn(getAvatarColor(char.name), "text-white text-xs")}>
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
            <div className="space-y-1 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-1">
              {AVAILABLE_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => updateModelSettings({ model: model.id })}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between",
                    modelSettings.model === model.id
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50",
                  )}
                >
                  <span>{model.name}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded",
                    model.provider === "lmstudio" 
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-blue-500/20 text-blue-400"
                  )}>
                    {model.provider === "lmstudio" ? "Local" : "Cloud"}
                  </span>
                </button>
              ))}
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
            <Label className="text-sm font-medium">Memory (RAG)</Label>

            {/* Knowledge Base Upload */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Knowledge Base</Label>
              <div className="border-2 border-dashed border-sidebar-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Upload documents (PDF, TXT, DOCX) to enhance context.
                </p>
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-2">
                {UPLOADED_DOCS.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-background text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
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
                  {ragSettings.contextRecall > 0.7 ? "High" : ragSettings.contextRecall > 0.3 ? "Medium" : "Low"}
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
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
