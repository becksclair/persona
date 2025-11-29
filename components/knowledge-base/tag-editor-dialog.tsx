"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { TagInput } from "./tag-input";
import { useTagManager } from "@/lib/hooks/use-tag-manager";
import type { KnowledgeBaseFile } from "@/lib/hooks/use-knowledge-base";

interface TagEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: KnowledgeBaseFile | null;
  saving: boolean;
  onSave: (tags: string[]) => Promise<void>;
}

export function TagEditorDialog({
  open,
  onOpenChange,
  file,
  saving,
  onSave,
}: TagEditorDialogProps) {
  const tagManager = useTagManager();

  // Reset tags when file changes
  useEffect(() => {
    if (file) {
      tagManager.reset(file.tags ?? []);
    }
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    await onSave(tagManager.tags);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Tags</DialogTitle>
          <DialogDescription>
            Add tags to organize {file?.fileName}. Tags help filter files during RAG retrieval.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <TagInput
            tags={tagManager.tags}
            onTagsChange={tagManager.setTags}
            customTagInput={tagManager.customTagInput}
            onCustomTagInputChange={tagManager.setCustomTagInput}
            onAddCustomTag={tagManager.addCustomTag}
            onAddPreset={tagManager.addTag}
            onRemoveTag={tagManager.removeTag}
            hasTag={tagManager.hasTag}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Tags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
