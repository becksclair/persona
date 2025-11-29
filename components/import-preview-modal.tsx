"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, Upload, FileJson, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortableCharacterV1 } from "@/lib/portable-character";

interface ImportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PortableCharacterV1 | PortableCharacterV1[] | null;
  onConfirm: (
    data: PortableCharacterV1 | PortableCharacterV1[],
    renamedNames?: Map<number, string>,
  ) => Promise<void>;
}

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

interface CharacterPreviewCardProps {
  character: PortableCharacterV1;
  index: number;
  editingName: string | null;
  onEditName: (name: string) => void;
  onSaveName: () => void;
  onStartEdit: () => void;
  currentName: string;
}

function CharacterPreviewCard({
  character,
  editingName,
  onEditName,
  onSaveName,
  onStartEdit,
  currentName,
}: CharacterPreviewCardProps) {
  const char = character.character;
  const isEditing = editingName !== null;

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
          <AvatarImage src={char.avatar ?? undefined} />
          <AvatarFallback className={cn(getAvatarColor(currentName), "text-white font-semibold")}>
            {currentName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={editingName}
                onChange={(e) => onEditName(e.target.value)}
                className="h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveName();
                  if (e.key === "Escape") onSaveName();
                }}
              />
              <Button size="sm" onClick={onSaveName}>
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h4 className="font-semibold truncate">{currentName}</h4>
              <button
                onClick={onStartEdit}
                className="p-1 rounded hover:bg-accent transition-colors"
                title="Edit name"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          )}
          {char.tagline && <p className="text-sm text-muted-foreground truncate">{char.tagline}</p>}
        </div>
      </div>

      {/* Description preview */}
      {char.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{char.description}</p>
      )}

      {/* Tags and flags */}
      <div className="flex flex-wrap gap-1.5">
        {char.nsfwEnabled && (
          <Badge variant="destructive" className="text-[10px]">
            NSFW
          </Badge>
        )}
        {char.archetype && char.archetype !== "custom" && (
          <Badge variant="secondary" className="text-[10px]">
            {char.archetype}
          </Badge>
        )}
        {char.tags?.map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px]">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Field summary */}
      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        {char.personality && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Personality
          </span>
        )}
        {char.background && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Background
          </span>
        )}
        {char.toneStyle && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Tone
          </span>
        )}
        {char.customInstructionsLocal && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Instructions
          </span>
        )}
      </div>
    </div>
  );
}

export function ImportPreviewModal({
  open,
  onOpenChange,
  data,
  onConfirm,
}: ImportPreviewModalProps) {
  const [importing, setImporting] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [renamedNames, setRenamedNames] = useState<Map<number, string>>(new Map());

  const characters = data ? (Array.isArray(data) ? data : [data]) : [];
  const isBatch = characters.length > 1;

  const handleStartEdit = useCallback((index: number, currentName: string) => {
    setEditingIndex(index);
    setEditingName(currentName);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingIndex !== null && editingName) {
      setRenamedNames((prev) => {
        const next = new Map(prev);
        next.set(editingIndex, editingName);
        return next;
      });
    }
    setEditingIndex(null);
    setEditingName(null);
  }, [editingIndex, editingName]);

  const getName = useCallback(
    (index: number, originalName: string) => {
      return renamedNames.get(index) ?? originalName;
    },
    [renamedNames],
  );

  const handleConfirm = async () => {
    if (!data) return;

    setImporting(true);
    try {
      // If names were edited, pass the map of renamed names
      const hasRenames = renamedNames.size > 0;
      await onConfirm(data, hasRenames ? renamedNames : undefined);
      onOpenChange(false);
      setRenamedNames(new Map());
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      onOpenChange(false);
      setRenamedNames(new Map());
      setEditingIndex(null);
      setEditingName(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            {isBatch ? `Import ${characters.length} Characters` : "Import Character"}
          </DialogTitle>
          <DialogDescription>
            Review the character{isBatch ? "s" : ""} before importing. You can edit names to avoid
            conflicts.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {characters.map((char, index) => (
              <CharacterPreviewCard
                key={index}
                character={char}
                index={index}
                editingName={editingIndex === index ? editingName : null}
                onEditName={setEditingName}
                onSaveName={handleSaveEdit}
                onStartEdit={() => handleStartEdit(index, getName(index, char.character.name))}
                currentName={getName(index, char.character.name)}
              />
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>If a character with the same name exists, it will be automatically renamed.</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={importing}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {isBatch ? `Import ${characters.length} Characters` : "Import"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
