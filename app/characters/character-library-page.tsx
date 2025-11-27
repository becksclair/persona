"use client";

import { useState, useMemo } from "react";
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
  ArrowLeft,
  Users,
  Briefcase,
  Heart,
  Sparkles,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCharacters, type Character } from "@/lib/hooks/use-characters";

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
}

function CharacterCard({
  character,
  onDuplicate,
  onArchive,
  onDelete,
  onExport,
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

export function CharacterLibraryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const { characters, loading, duplicateCharacter, archiveCharacter, deleteCharacter } =
    useCharacters({ includeArchived: false });

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
    router.push(`/characters/${duplicate.id}`);
  };

  const handleExport = (character: Character) => {
    const exportData = {
      version: "PortableCharacterV1",
      exportedAt: new Date().toISOString(),
      character: {
        name: character.name,
        avatar: character.avatar,
        tagline: character.tagline,
        description: character.description,
        personality: character.personality,
        background: character.background,
        lifeHistory: character.lifeHistory,
        currentContext: character.currentContext,
        toneStyle: character.toneStyle,
        boundaries: character.boundaries,
        roleRules: character.roleRules,
        customInstructionsLocal: character.customInstructionsLocal,
        tags: character.tags,
        archetype: character.archetype,
        defaultModelId: character.defaultModelId,
        defaultTemperature: character.defaultTemperature,
        nsfwEnabled: character.nsfwEnabled,
        evolveEnabled: character.evolveEnabled,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${character.name.toLowerCase().replace(/\s+/g, "-")}-character.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        <Button asChild>
          <Link href="/characters/new" className="gap-2">
            <Plus className="h-4 w-4" />
            New Character
          </Link>
        </Button>
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
                <Button asChild variant="outline">
                  <Link href="/characters/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Character
                  </Link>
                </Button>
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
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
