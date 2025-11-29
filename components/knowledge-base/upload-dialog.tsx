"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, File, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagInput } from "./tag-input";
import { useTagManager } from "@/lib/hooks/use-tag-manager";
import { formatFileSize } from "@/lib/hooks/use-knowledge-base";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploading: boolean;
  onUpload: (file: File, tags: string[]) => Promise<void>;
}

export function UploadDialog({ open, onOpenChange, uploading, onUpload }: UploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tagManager = useTagManager();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await onUpload(selectedFile, tagManager.tags);
      // Reset and close only on success
      setSelectedFile(null);
      tagManager.reset();
      onOpenChange(false);
    } catch {
      // Keep dialog open on error for retry
    }
  };

  const resetAndClose = () => {
    if (uploading) return;
    setSelectedFile(null);
    tagManager.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
          <DialogDescription>
            Upload a file to the knowledge base. It will be indexed and available for RAG
            retrieval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
              dragOver && "border-primary bg-primary/10",
              selectedFile
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30",
            )}
          >
            <input ref={inputRef} type="file" onChange={handleFileSelect} className="hidden" />
            {selectedFile ? (
              <div className="space-y-2">
                <File className="h-8 w-8 mx-auto text-primary" />
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                >
                  Change file
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop a file here or click to browse</p>
                <p className="text-xs text-muted-foreground">Max 10MB</p>
              </div>
            )}
          </div>

          {/* Tags (only show after file selected) */}
          {selectedFile && (
            <TagInput
              tags={tagManager.tags}
              onTagsChange={tagManager.setTags}
              customTagInput={tagManager.customTagInput}
              onCustomTagInputChange={tagManager.setCustomTagInput}
              onAddCustomTag={tagManager.addCustomTag}
              onAddPreset={tagManager.addTag}
              onRemoveTag={tagManager.removeTag}
              hasTag={tagManager.hasTag}
              showLabel={false}
              compact
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
