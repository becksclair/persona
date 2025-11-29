"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Trash2,
  File,
  Pause,
  Play,
  RefreshCw,
  Tag,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type KnowledgeBaseFile,
  formatFileSize,
  getStatusStyle,
} from "@/lib/hooks/use-knowledge-base";
import { getTagColor } from "@/lib/config/kb-tags";

interface FileCardProps {
  file: KnowledgeBaseFile;
  isLoading?: boolean;
  loadingAction?: string;
  onPause: () => void;
  onResume: () => void;
  onReindex: () => void;
  onDelete: () => void;
  onEditTags: () => void;
}

export function FileCard({
  file,
  isLoading = false,
  loadingAction,
  onPause,
  onResume,
  onReindex,
  onDelete,
  onEditTags,
}: FileCardProps) {
  const status = getStatusStyle(file.status);
  const tags = file.tags ?? [];
  const isPaused = file.status === "paused";
  const isProcessing = file.status === "indexing" || file.status === "pending";

  return (
    <div
      className={cn(
        "group relative bg-card border border-border rounded-xl p-4 transition-all duration-200",
        isLoading
          ? "opacity-70 pointer-events-none"
          : "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
      )}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="capitalize">{loadingAction ?? "Loading"}...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <File className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate text-sm" title={file.fileName}>
            {file.fileName}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFileSize(file.fileSizeBytes)}</span>
            {file.chunkCount !== undefined && (
              <>
                <span>·</span>
                <span>{file.chunkCount} chunks</span>
              </>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
              onClick={(e) => e.preventDefault()}
              disabled={isLoading}
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onEditTags}>
              <Tag className="h-4 w-4 mr-2" />
              Edit Tags
            </DropdownMenuItem>
            {isPaused ? (
              <DropdownMenuItem onClick={onResume}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onPause} disabled={isProcessing}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onReindex} disabled={isProcessing}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-index
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", status.className)}>
          {status.label}
        </span>
        {file.fileType && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium uppercase">
            {file.fileType.split("/").pop()}
          </span>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", getTagColor(tag))}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
