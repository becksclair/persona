"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  Pencil,
  Download,
  Upload,
  ArrowLeft,
  Users,
  Briefcase,
  Heart,
  Sparkles,
  Filter,
  FileText,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useTemplates } from "@/lib/hooks/use-templates";
import { cn } from "@/lib/utils";
import { useCharacters, type Character } from "@/lib/hooks/use-characters";
import { useToast } from "@/lib/hooks/use-toast";
import {
  extractPortableFields,
  validatePortableCharacter,
  validatePortableCharacterBatch,
  type PortableCharacterV1,
  createPortableExport,
  portableToMarkdown,
  portableBatchToMarkdown,
  parsePortableMarkdownBatch,
} from "@/lib/portable-character";
import { eventBus, Events } from "@/lib/events";
import { ImportPreviewModal } from "@/components/import-preview-modal";

// Tag definitions with icons and colors
const TAG_FILTERS = [
  { id: "all", label: "All", icon: Users, color: "bg-primary/20 text-primary" },
  { id: "friend", label: "Friend", icon: Heart, color: "bg-rose-500/20 text-rose-400" },
  { id: "work", label: "Work", icon: Briefcase, color: "bg-blue-500/20 text-blue-400" },
  { id: "nsfw", label: "NSFW", icon: Sparkles, color: "bg-purple-500/20 text-purple-400" },
] as const;

// Avatar color mapping
function getAvatarColor(name: string): string {
  const colors = [
    "bg-gradient-to-br from-violet-500 to-fuchsia-500",
    "bg-gradient-to-br from-cyan-500 to-blue-500",
    "bg-gradient-to-br from-emerald-500 to-teal-500",
    "bg-gradient-to-br from-amber-500 to-orange-500",
    "bg-gradient-to-br from-rose-500 to-pink-500",
    "bg-gradient-to-br from-indigo-500 to-purple-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

interface CharacterCardProps {
  character: Character;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onExport: () => void;
  onSaveAsTemplate: () => void;
}

function CharacterCard({
  character,
  onDuplicate,
  onArchive,
  onDelete,
  onExport,
  onSaveAsTemplate,
}: CharacterCardProps) {
  const tags = character.tags ?? [];

  return (
    <div className="group relative bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200">
      {/* Header with avatar and menu */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-14 w-14 ring-2 ring-background shadow-md">
          <AvatarImage src={character.avatar ?? undefined} />
          <AvatarFallback
            className={cn(getAvatarColor(character.name), "text-white text-lg font-semibold")}
          >
            {character.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{character.name}</h3>
          {character.tagline && (
            <p className="text-sm text-muted-foreground truncate">{character.tagline}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-accent transition-all relative z-10"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem asChild>
              <Link href={`/characters/${character.id}`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSaveAsTemplate}>
              <FileText className="h-4 w-4 mr-2" />
              Save as Template
            </DropdownMenuItem>
            {!character.isBuiltIn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-10">
        {character.description ?? character.systemRole ?? "No description"}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {character.isBuiltIn && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
            Built-in
          </span>
        )}
        {character.nsfwEnabled && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">
            NSFW
          </span>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium capitalize"
          >
            {tag}
          </span>
        ))}
        {character.archetype && character.archetype !== "custom" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
            {character.archetype}
          </span>
        )}
      </div>

      {/* Click overlay for edit */}
      <Link
        href={`/characters/${character.id}`}
        className="absolute inset-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        aria-label={`Edit ${character.name}`}
      />
    </div>
  );
}

// Common emoji icons for templates
const TEMPLATE_ICONS = ["📝", "💡", "⭐", "🎯", "🔥", "💎", "🌟", "✨", "🎨", "🧠", "💼", "❤️"] as const;

export function CharacterLibraryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const { characters, loading, duplicateCharacter, archiveCharacter, deleteCharacter, refetch } =
    useCharacters({ includeArchived: false });

  // Import state
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<
    PortableCharacterV1 | PortableCharacterV1[] | null
  >(null);

  // Template dialog state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateCharacter, setTemplateCharacter] = useState<Character | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateIcon, setTemplateIcon] = useState("📝");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const { createTemplateFromCharacter } = useTemplates();

  // Filter characters by search and tag
  const filteredCharacters = useMemo(() => {
    let filtered = characters;

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.tagline?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      );
    }

    // Filter by tag
    if (activeFilter !== "all") {
      filtered = filtered.filter((c) => {
        const tags = c.tags ?? [];
        if (activeFilter === "nsfw") return c.nsfwEnabled;
        return tags.some((t) => t.toLowerCase() === activeFilter);
      });
    }

    return filtered;
  }, [characters, searchQuery, activeFilter]);

  const handleDuplicate = async (id: string) => {
    const duplicate = await duplicateCharacter(id);
    toast({
      title: "Character duplicated",
      description: `Created "${duplicate.name}"`,
      variant: "success",
    });
    router.push(`/characters/${duplicate.id}`);
  };

  const handleSaveAsTemplate = (character: Character) => {
    setTemplateCharacter(character);
    setTemplateName(`${character.name} Template`);
    setTemplateIcon("📝");
    setTemplateDialogOpen(true);
  };

  const handleConfirmSaveTemplate = async () => {
    if (!templateCharacter || !templateName.trim()) return;
    setSavingTemplate(true);
    try {
      await createTemplateFromCharacter(templateCharacter.id, templateName.trim(), templateIcon);
      setTemplateDialogOpen(false);
      setTemplateCharacter(null);
      toast({
        title: "Template saved",
        description: `"${templateName}" is now available for creating new characters.`,
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to save template:", error);
      toast({
        title: "Failed to save template",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleExport = (character: Character) => {
    const portableData = extractPortableFields(character);
    const exportData = createPortableExport(portableData);
    const markdown = portableToMarkdown(exportData);

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${character.name.toLowerCase().replace(/\s+/g, "-")}-character.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Character exported",
      description: `${character.name} saved to markdown.`,
      variant: "success",
    });
  };

  const handleExportAll = () => {
    const portableData = characters.map((c) => createPortableExport(extractPortableFields(c)));
    const markdown = portableBatchToMarkdown(portableData);

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `persona-characters-export-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "All characters exported",
      description: `Exported ${characters.length} characters to markdown.`,
      variant: "success",
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    event.target.value = "";

    try {
      const text = await file.text();
      let data: unknown;

      try {
        data = JSON.parse(text);
      } catch {
        try {
          const docs = parsePortableMarkdownBatch(text);
          data = docs.length === 1 ? docs[0] : docs;
        } catch (mdErr) {
          console.error("Markdown parse error:", mdErr);
          toast({
            title: "Invalid file",
            description: "The file is not valid JSON or markdown export.",
            variant: "destructive",
          });
          return;
        }
      }

      // Try single character first
      const singleValidation = validatePortableCharacter(data);
      if (singleValidation.success) {
        setImportPreviewData(singleValidation.data!);
        setImportPreviewOpen(true);
        return;
      }

      // Try batch import
      const batchValidation = validatePortableCharacterBatch(
        Array.isArray(data) ? data : (data as { characters?: unknown }).characters
      );
      if (batchValidation.success && batchValidation.data!.length > 0) {
        setImportPreviewData(batchValidation.data!);
        setImportPreviewOpen(true);
        return;
      }

      const firstError = singleValidation.error?.issues[0];
      toast({
        title: "Invalid character format",
        description: firstError
          ? `${firstError.path.join(".")}: ${firstError.message}`
          : "The file does not match the expected format.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("File read error:", error);
      toast({
        title: "Failed to read file",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmImport = useCallback(
    async (
      data: PortableCharacterV1 | PortableCharacterV1[],
      renamedNames?: Map<number, string>
    ) => {
      // Prepare the data with any renamed names
      let importPayload: unknown;
      const isBatch = Array.isArray(data);

      if (isBatch) {
        // Apply renamed names to batch
        const updatedData = data.map((item, index) => {
          const newName = renamedNames?.get(index);
          if (newName) {
            return {
              ...item,
              character: { ...item.character, name: newName },
            };
          }
          return item;
        });
        importPayload = updatedData;
      } else {
        // Apply renamed name to single
        const newName = renamedNames?.get(0);
        importPayload = newName
          ? { ...data, character: { ...data.character, name: newName } }
          : data;
      }

      // Send to import API
      const response = await fetch("/api/characters/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importPayload),
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: "Import failed",
          description: error.error || "Failed to import character.",
          variant: "destructive",
        });
        throw new Error(error.error);
      }

      const result = await response.json();

      // Emit events and refresh
      eventBus.emit(Events.CHARACTER_IMPORTED, result);
      eventBus.emit(Events.CHARACTERS_CHANGED);
      await refetch();

      // Show success toast
      if (result.batch) {
        toast({
          title: "Characters imported",
          description: `Successfully imported ${result.imported} of ${result.total} characters.`,
          variant: "success",
        });
      } else {
        const description = result.renamed
          ? `Imported as "${result.character.name}" (renamed from "${result.originalName}")`
          : `${result.character.name} has been imported.`;

        toast({
          title: "Character imported",
          description,
          variant: "success",
          action: {
            label: "View",
            onClick: () => router.push(`/characters/${result.character.id}`),
          },
        });
      }
    },
    [refetch, router, toast]
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Character Library</h1>
            <p className="text-sm text-muted-foreground">
              {filteredCharacters.length} character{filteredCharacters.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Hidden file input for import */}
          <input
            type="file"
            id="import-character-input"
            accept=".md,.markdown,.json"
            onChange={(e) => void handleFileSelect(e)}
            className="hidden"
          />
          {characters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleExportAll} className="gap-2">
              <Download className="h-4 w-4" />
              Export All
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => document.getElementById("import-character-input")?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button asChild>
            <Link href="/characters/new" className="gap-2">
              <Plus className="h-4 w-4" />
              New Character
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search characters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            {TAG_FILTERS.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    isActive ? filter.color : "bg-accent/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Character Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredCharacters.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium mb-1">No characters found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || activeFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first character to get started"}
              </p>
              {!searchQuery && activeFilter === "all" && (
                <div className="flex items-center justify-center gap-2">
                  <Button asChild variant="outline">
                    <Link href="/characters/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Character
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => document.getElementById("import-character-input")?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCharacters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  onDuplicate={() => void handleDuplicate(character.id)}
                  onArchive={() => void archiveCharacter(character.id)}
                  onDelete={() => void deleteCharacter(character.id)}
                  onExport={() => handleExport(character)}
                  onSaveAsTemplate={() => handleSaveAsTemplate(character)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Import Preview Modal */}
      <ImportPreviewModal
        open={importPreviewOpen}
        onOpenChange={setImportPreviewOpen}
        data={importPreviewData}
        onConfirm={handleConfirmImport}
      />

      {/* Save as Template Dialog */}
      <Sheet open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[450px]">
          <SheetHeader>
            <SheetTitle>Save as Template</SheetTitle>
            <SheetDescription>
              Create a reusable template from {templateCharacter?.name}. You can use this template to
              quickly create new characters with the same settings.
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-6">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
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
                    onClick={() => setTemplateIcon(icon)}
                    className={cn(
                      "w-10 h-10 rounded-lg border text-xl flex items-center justify-center transition-all",
                      templateIcon === icon
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
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
              onClick={() => setTemplateDialogOpen(false)}
              disabled={savingTemplate}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleConfirmSaveTemplate()}
              disabled={savingTemplate || !templateName.trim()}
            >
              {savingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Template"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
